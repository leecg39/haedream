import { createHash, createHmac } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import {
  countMeasurements,
  listCorrections,
  listMeasurements,
  upsertMeasurement,
} from "@/features/energy/measurements.repository";
import {
  parseCsvRecords,
  parseMeasurementCsv,
  runMeasurementCsvImport,
  writeReportAtomic,
} from "@/features/energy/measurement-csv-import";
import {
  assertWebhookDestination,
  createPinnedLookup,
  isBlockedIpAddress,
  normalizeDnsLookupEntries,
  postWebhookHttpsPinned,
  resolvePinnedHttpsAddress,
} from "../scripts/lib/kepco-webhook-policy.mjs";
import { openGuardedApplyDatabase } from "../scripts/lib/measurement-db-guard.mjs";

const root = process.cwd();
const sampleCsv = path.join(
  root,
  "fixtures/measurements/sample-approved-synthetic.csv",
);

function writeCsv(directory: string, body: string | Buffer, name = "input.csv") {
  const csvPath = path.join(directory, name);
  writeFileSync(csvPath, body);
  return csvPath;
}

function removeSidecars(dbPath: string) {
  for (const side of [`${dbPath}-wal`, `${dbPath}-shm`]) {
    if (existsSync(side)) unlinkSync(side);
  }
}

function sha256File(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function runCli(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync("node", ["scripts/import-measurement-csv.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...env },
  });
}

function dbFingerprint(dbPath: string) {
  const st = statSync(dbPath);
  return {
    sha256: sha256File(dbPath),
    mtimeMs: st.mtimeMs,
    size: st.size,
    wal: existsSync(`${dbPath}-wal`),
    shm: existsSync(`${dbPath}-shm`),
  };
}

describe("measurement csv import safety", () => {
  let directory: string;
  let dbPath: string;
  let db: AppDatabase;
  let tenantId: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-meas-csv-"));
    dbPath = path.join(directory, "app.db");
    db = openDatabase(dbPath);
    seedDatabase(db);
    tenantId = (
      db.prepare(`SELECT tenant_id AS tenantId FROM users WHERE username = 'operator'`).get() as {
        tenantId: string;
      }
    ).tenantId;
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '합성 측정 업체')",
    ).run();
    db.prepare(
      `INSERT OR REPLACE INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, 101, 1, 1, ?)`,
    ).run(tenantId, new Date().toISOString());
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function baseArgs(extra: string[] = []) {
    return [
      "--db",
      dbPath,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      writeCsv(
        directory,
        "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1.5\n",
      ),
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
      ...extra,
    ];
  }

  it("malformed quote·invalid UTF-8·header-only·예상 밖 열을 거부한다", () => {
    expect(() => parseCsvRecords('a"b,c\n')).toThrow(/중간 quote/);
    expect(() => parseCsvRecords('"a"b,c\n')).toThrow(/closing quote/);
    expect(parseCsvRecords('"a""b","line1\nline2"\n')).toEqual([['a"b', "line1\nline2"]]);

    expect(() =>
      parseMeasurementCsv(Buffer.from([0x6d, 0xff, 0xfe])),
    ).toThrow(/UTF-8/);

    expect(() =>
      parseMeasurementCsv("meterPoint,observedAt,unit,value\n"),
    ).toThrow(/데이터 행/);

    expect(() =>
      parseMeasurementCsv("meterPoint,observedAt,unit,value,extra\na,2026-09-06T00:00:00Z,kW,1\n"),
    ).toThrow(/헤더/);
  });

  it("missing DB dry-run/reconcile/apply 는 exit1 이고 파일·부모·WAL/SHM 을 만들지 않는다", () => {
    const missingDir = path.join(directory, "no-such-dir");
    const missingDb = path.join(missingDir, "missing.db");
    const csvPath = writeCsv(
      directory,
      "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
    );
    for (const modeFlag of [[], ["--reconcile"], ["--apply"]]) {
      const result = runCli([
        "--db",
        missingDb,
        "--tenant",
        tenantId,
        "--fid",
        "101",
        "--csv",
        csvPath,
        "--actor",
        "importer@test",
        "--calculation-version",
        "v1",
        ...modeFlag,
      ]);
      expect(result.status).toBe(1);
      const report = JSON.parse(result.stdout);
      expect(report.errorCode).toBe("DB_NOT_FOUND");
      expect(result.stderr).not.toMatch(/node_modules|Error:|at /);
      expect(existsSync(missingDb)).toBe(false);
      expect(existsSync(missingDir)).toBe(false);
      expect(existsSync(`${missingDb}-wal`)).toBe(false);
      expect(existsSync(`${missingDb}-shm`)).toBe(false);
    }
  });

  it("기존 DB dry-run/reconcile 전후 byte hash/mtime/sidecar/_migrations 불변", () => {
    db.close();
    // 운영과 같이 offline snapshot( sidecar 없음 ) 을 대상으로 한다.
    removeSidecars(dbPath);
    const csvPath = writeCsv(
      directory,
      "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
    );

    for (const modeFlag of [[], ["--reconcile"]]) {
      removeSidecars(dbPath);
      const before = dbFingerprint(dbPath);
      const result = runCli([
        "--db",
        dbPath,
        "--tenant",
        tenantId,
        "--fid",
        "101",
        "--csv",
        csvPath,
        "--actor",
        "importer@test",
        "--calculation-version",
        "v1",
        ...modeFlag,
      ]);
      if (modeFlag.includes("--reconcile")) {
        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).errorCode).toBe("RECONCILE_MISMATCH");
      } else {
        expect(result.status, result.stdout).toBe(0);
      }
      const after = dbFingerprint(dbPath);
      expect(after.sha256).toBe(before.sha256);
      expect(after.mtimeMs).toBe(before.mtimeMs);
      expect(after.size).toBe(before.size);
      expect(after.wal).toBe(false);
      expect(after.shm).toBe(false);
    }
    db = openDatabase(dbPath);
  });

  it("hot -wal/-shm 이 있으면 dry-run/reconcile 을 거부한다", () => {
    db.close();
    writeFileSync(`${dbPath}-wal`, "x");
    const result = runCli([
      "--db",
      dbPath,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      writeCsv(
        directory,
        "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
      ),
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).errorCode).toBe("DB_HOT_SIDECARS");
    unlinkSync(`${dbPath}-wal`);
    db = openDatabase(dbPath);
  });

  it("corrupt DB 는 exit1·parseable JSON·stderr 에 stack/path 없음", () => {
    const corruptPath = path.join(directory, "corrupt.db");
    writeFileSync(corruptPath, "not-a-sqlite-database");
    const result = runCli([
      "--db",
      corruptPath,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      writeCsv(
        directory,
        "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
      ),
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
    ]);
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.ok).toBe(false);
    expect(report.errorCode).toMatch(/^DB_/);
    expect(result.stderr).not.toMatch(/node_modules/);
    expect(result.stderr).not.toMatch(/\/Users\//);
    expect(result.stderr).not.toMatch(/\bat\s+\S+/);
  });

  it("duplicate/unknown/missing CLI args 는 DB 불변", () => {
    db.close();
    const baseline = dbFingerprint(dbPath);
    const cases = [
      [...baseArgs(), "--unknown"],
      [...baseArgs(), "--db", dbPath],
      ["--db", dbPath, "--tenant", tenantId],
      [...baseArgs(["--apply", "--reconcile"])],
      [
        "--db",
        dbPath,
        "--tenant",
        tenantId,
        "--fid",
        "101",
        "--csv",
        "--actor",
        "x",
        "--calculation-version",
        "v1",
      ],
    ];
    for (const args of cases) {
      const result = runCli(args);
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).ok).toBe(false);
      expect(dbFingerprint(dbPath).sha256).toBe(baseline.sha256);
    }
    db = openDatabase(dbPath);
  });

  it("교차 tenant 거부·dry-run 무변경·unchanged reapply 시 ingested_at/correction 불변", () => {
    const csvPath = writeCsv(
      directory,
      "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1.5\n",
    );
    expect(() =>
      runMeasurementCsvImport({
        db,
        csvPath,
        tenantId: "other-tenant",
        fid: 101,
        actor: "importer@test",
        calculationVersion: "v1",
        mode: "dry-run",
      }),
    ).toThrow(/연결되지 않은|조직/);

    const before = countMeasurements(tenantId, 101, db);
    const dry = runMeasurementCsvImport({
      db,
      csvPath,
      tenantId,
      fid: 101,
      actor: "importer@test",
      calculationVersion: "v1",
      mode: "dry-run",
    });
    expect(dry.applied).toBe(false);
    expect(countMeasurements(tenantId, 101, db)).toBe(before);

    runMeasurementCsvImport({
      db,
      csvPath,
      tenantId,
      fid: 101,
      actor: "importer@test",
      calculationVersion: "v1",
      mode: "apply",
    });
    const first = listMeasurements(tenantId, 101, "main", "kW", db)[0]!;
    const correctionsBefore = listCorrections(tenantId, 101, "main", db).length;
    const second = runMeasurementCsvImport({
      db,
      csvPath,
      tenantId,
      fid: 101,
      actor: "importer@test",
      calculationVersion: "v1",
      mode: "apply",
    });
    expect(second.counts.unchanged).toBe(1);
    expect(second.counts.inserted).toBe(0);
    const again = listMeasurements(tenantId, 101, "main", "kW", db)[0]!;
    expect(again.ingestedAt).toBe(first.ingestedAt);
    expect(listCorrections(tenantId, 101, "main", db)).toHaveLength(correctionsBefore);
  });

  it("apply/reapply 멱등·정정·hash mismatch·보고서 atomic·symlink 거부", () => {
    const hash = sha256File(sampleCsv);
    const reportPath = path.join(directory, "report.json");
    const first = runCli([
      "--db",
      dbPath,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      sampleCsv,
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
      "--apply",
      "--expected-sha256",
      hash,
      "--report",
      reportPath,
    ]);
    expect(first.status, first.stderr + first.stdout).toBe(0);
    expect(JSON.parse(first.stdout).counts.inserted).toBe(4);
    expect(readFileSync(reportPath, "utf8")).not.toMatch(/12\.5|100\.25/);

    const correctedCsv = writeCsv(
      directory,
      "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00+09:00,kW,99\n",
    );
    expect(
      runMeasurementCsvImport({
        db,
        csvPath: correctedCsv,
        tenantId,
        fid: 101,
        actor: "importer@test",
        calculationVersion: "v1",
        mode: "apply",
      }).counts.corrected,
    ).toBe(1);

    const badHash = runCli([
      "--db",
      dbPath,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      sampleCsv,
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
      "--apply",
      "--expected-sha256",
      "0".repeat(64),
    ]);
    expect(JSON.parse(badHash.stdout).errorCode).toBe("CSV_SHA256_MISMATCH");

    const linkPath = path.join(directory, "report-link.json");
    symlinkSync(reportPath, linkPath);
    expect(() =>
      writeReportAtomic(linkPath, JSON.parse(readFileSync(reportPath, "utf8"))),
    ).toThrow(/symlink/i);
  });

  it("apply 트랜잭션 실패 시 전체 rollback", () => {
    const csvPath = writeCsv(
      directory,
      [
        "meterPoint,observedAt,unit,value",
        "main,2026-09-06T00:00:00.000Z,kW,1",
        "main,2026-09-06T00:15:00.000Z,kW,2",
      ].join("\n") + "\n",
    );
    db.exec(`
      CREATE TRIGGER fail_second_measurement
      BEFORE INSERT ON energy_measurements
      BEGIN
        SELECT RAISE(ABORT, 'forced rollback')
        WHERE (SELECT COUNT(*) FROM energy_measurements WHERE fid = 101) >= 1;
      END;
    `);
    expect(() =>
      runMeasurementCsvImport({
        db,
        csvPath,
        tenantId,
        fid: 101,
        actor: "importer@test",
        calculationVersion: "v1",
        mode: "apply",
      }),
    ).toThrow(/forced rollback|ABORT/i);
    expect(countMeasurements(tenantId, 101, db)).toBe(0);
  });

  it("+09:00/Z 동일 순간은 중복 키로 거부되고 repository unchanged skip 도 동작한다", () => {
    expect(() =>
      parseMeasurementCsv(
        [
          "meterPoint,observedAt,unit,value",
          "main,2026-09-06T00:15:00+09:00,kW,1",
          "main,2026-09-05T15:15:00.000Z,kW,2",
        ].join("\n") + "\n",
      ),
    ).toThrow(/중복/);

    const first = upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T01:00:00.000Z",
        source: "MEASURED",
        unit: "kW",
        value: 0,
      },
      db,
    );
    const second = upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T01:00:00.000Z",
        source: "MEASURED",
        unit: "kW",
        value: -0,
      },
      db,
    );
    expect(second.outcome).toBe("unchanged");
    expect(second.ingestedAt).toBe(first.ingestedAt);
  });

  it("fid=0·leading zero·invalid actor/calc/sha 는 DB open 전 실패하고 원본 불변", () => {
    db.close();
    removeSidecars(dbPath);
    const before = dbFingerprint(dbPath);
    const csvPath = writeCsv(
      directory,
      "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
    );
    const cases = [
      ["--fid", "0"],
      ["--fid", "01"],
      ["--actor", "bad actor!"],
      ["--calculation-version", "bad version!"],
      ["--expected-sha256", "deadbeef"],
    ] as const;
    for (const [flag, value] of cases) {
      const args = [
        "--db",
        dbPath,
        "--tenant",
        tenantId,
        "--fid",
        "101",
        "--csv",
        csvPath,
        "--actor",
        "importer@test",
        "--calculation-version",
        "v1",
      ];
      const index = args.indexOf(flag);
      if (index >= 0) args[index + 1] = value;
      else args.push(flag, value);
      const result = runCli(args);
      expect(result.status).toBe(1);
      expect(JSON.parse(result.stdout).ok).toBe(false);
      expect(dbFingerprint(dbPath).sha256).toBe(before.sha256);
      expect(existsSync(`${dbPath}-wal`)).toBe(false);
    }
    db = openDatabase(dbPath);
  });

  it("DB symlink 은 dry-run 에서 거부한다", () => {
    db.close();
    removeSidecars(dbPath);
    const linkDb = path.join(directory, "link.db");
    symlinkSync(dbPath, linkDb);
    const result = runCli([
      "--db",
      linkDb,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      writeCsv(
        directory,
        "meterPoint,observedAt,unit,value\nmain,2026-09-06T00:00:00.000Z,kW,1\n",
      ),
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).errorCode).toBe("DB_SYMLINK");
    db = openDatabase(dbPath);
  });

  it("apply 는 DB leaf symlink 을 거부하고 원본·대상 불변", () => {
    db.close();
    removeSidecars(dbPath);
    const victimPath = path.join(directory, "victim-apply.db");
    copyFileSync(dbPath, victimPath);
    const beforeDb = dbFingerprint(dbPath);
    const beforeVictim = dbFingerprint(victimPath);
    const linkDb = path.join(directory, "apply-link.db");
    symlinkSync(victimPath, linkDb);
    const result = runCli([
      "--db",
      linkDb,
      "--tenant",
      tenantId,
      "--fid",
      "101",
      "--csv",
      writeCsv(
        directory,
        "meterPoint,observedAt,unit,value\nmain,2026-09-06T01:00:00.000Z,kW,7\n",
      ),
      "--actor",
      "importer@test",
      "--calculation-version",
      "v1",
      "--apply",
    ]);
    expect(result.status).toBe(1);
    expect(["DB_SYMLINK", "DB_SYMLINK_REJECTED"]).toContain(
      JSON.parse(result.stdout).errorCode,
    );
    expect(dbFingerprint(dbPath)).toEqual(beforeDb);
    expect(dbFingerprint(victimPath)).toEqual(beforeVictim);
    db = openDatabase(dbPath);
  });

  it("apply open 직후 leaf symlink/inode 교체는 거부되고 대상 DB 에 write 없음", () => {
    db.close();
    removeSidecars(dbPath);
    const backupPath = path.join(directory, "backup-apply.db");
    const victimPath = path.join(directory, "victim-race.db");
    copyFileSync(dbPath, backupPath);
    const victim = openDatabase(victimPath);
    seedDatabase(victim);
    victim.close();
    removeSidecars(victimPath);
    const beforeBackup = dbFingerprint(backupPath);
    const beforeVictim = dbFingerprint(victimPath);

    try {
      openGuardedApplyDatabase(dbPath, {
        Database,
        onAfterSqliteOpen: ({ absolute }) => {
          unlinkSync(absolute);
          symlinkSync(victimPath, absolute);
        },
      });
      expect.unreachable("expected DB_SYMLINK_REJECTED");
    } catch (error) {
      expect(error).toMatchObject({ code: "DB_SYMLINK_REJECTED" });
    }
    expect(dbFingerprint(victimPath)).toEqual(beforeVictim);

    unlinkSync(dbPath);
    copyFileSync(backupPath, dbPath);
    expect(dbFingerprint(backupPath)).toEqual(beforeBackup);

    try {
      openGuardedApplyDatabase(dbPath, {
        Database,
        onAfterSqliteOpen: ({ absolute }) => {
          unlinkSync(absolute);
          copyFileSync(victimPath, absolute);
        },
      });
      expect.unreachable("expected DB_FILE_CHANGED");
    } catch (error) {
      expect(error).toMatchObject({ code: "DB_FILE_CHANGED" });
    }
    expect(dbFingerprint(victimPath)).toEqual(beforeVictim);

    unlinkSync(dbPath);
    copyFileSync(backupPath, dbPath);
    db = openDatabase(dbPath);
  });
});

describe("kepco webhook destination policy", () => {
  it("IPv4 embedding·NAT64·translated·특수 IPv6 를 차단한다", async () => {
    expect(isBlockedIpAddress("10.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:7f00:1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:0a00:0101")).toBe(true);
    expect(isBlockedIpAddress("0:0:0:0:0:ffff:127.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:10.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("64:ff9b::7f00:1")).toBe(true);
    expect(isBlockedIpAddress("64:ff9b::10.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("::ffff:0:7f00:1")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
    expect(isBlockedIpAddress("fc00::1")).toBe(true);
    expect(isBlockedIpAddress("fec0::1")).toBe(true);
    expect(isBlockedIpAddress("2001:db8::1")).toBe(true);
    // 6to4 / Teredo / local-use NAT64
    expect(isBlockedIpAddress("2002:7f00:1::1")).toBe(true);
    expect(isBlockedIpAddress("2002:0a00:0101::1")).toBe(true);
    expect(isBlockedIpAddress("2002:c0a8:1::")).toBe(true);
    expect(isBlockedIpAddress("2001:0000:4136:e378:8000:63bf:3fff:fdd2")).toBe(
      true,
    );
    expect(isBlockedIpAddress("64:ff9b:1::1")).toBe(true);
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
    expect(isBlockedIpAddress("2001:4860:4860::8888")).toBe(false);
    expect(isBlockedIpAddress("2606:4700:4700::1111")).toBe(false);

    await expect(
      assertWebhookDestination({
        rawUrl: "https://10.0.0.5/hook",
        allowHttpLoopback: false,
        hostAllowlist: ["10.0.0.5"],
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_BLOCKED_IP" });

    await expect(
      assertWebhookDestination({
        rawUrl: "https://alerts.example.com/hook",
        allowHttpLoopback: false,
        hostAllowlist: ["alerts.example.com"],
        lookupAll: async () => [{ address: "10.1.2.3", family: 4 }],
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_BLOCKED_IP" });

    await expect(
      assertWebhookDestination({
        rawUrl: "https://alerts.example.com/hook",
        allowHttpLoopback: false,
        hostAllowlist: ["alerts.example.com"],
        lookupAll: async () => [{ address: "203.0.113.10", family: 4 }],
      }),
    ).resolves.toMatchObject({
      hostname: "alerts.example.com",
      pinnedAddress: "203.0.113.10",
    });
  });

  it("DNS entry 형식 이상·family 불일치는 WEBHOOK_DNS_FAILED", async () => {
    for (const bad of [
      [],
      [null],
      [{ address: "203.0.113.1", family: 6 }],
      [
        { address: "203.0.113.1", family: 4 },
        { address: "", family: 4 },
      ],
    ]) {
      try {
        normalizeDnsLookupEntries(bad as never);
        expect.unreachable("expected WEBHOOK_DNS_FAILED");
      } catch (error) {
        expect(error).toMatchObject({ code: "WEBHOOK_DNS_FAILED" });
      }
    }

    await expect(
      resolvePinnedHttpsAddress({
        hostname: "alerts.example.com",
        lookupAll: async () => [{ address: "203.0.113.1", family: 6 }],
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_DNS_FAILED" });

    await expect(
      resolvePinnedHttpsAddress({
        hostname: "alerts.example.com",
        lookupAll: async () => [
          { address: "203.0.113.10", family: 4 },
          { address: "10.0.0.1", family: 4 },
        ],
      }),
    ).rejects.toMatchObject({ code: "WEBHOOK_BLOCKED_IP" });
  });

  it("createPinnedLookup 은 Node all:true/false 계약을 지킨다", () => {
    const lookup = createPinnedLookup({
      hostname: "alerts.example.com",
      pinnedAddress: "203.0.113.20",
      connectFamily: 4,
    });
    let allResult: unknown;
    lookup("alerts.example.com", { all: true }, (_err: Error | null, value?: unknown) => {
      allResult = value;
    });
    expect(allResult).toEqual([{ address: "203.0.113.20", family: 4 }]);

    let singleAddress = "";
    let singleFamily = 0;
    lookup(
      "alerts.example.com",
      { all: false },
      (_err: Error | null, address?: string, family?: number) => {
        singleAddress = address ?? "";
        singleFamily = family ?? 0;
      },
    );
    expect(singleAddress).toBe("203.0.113.20");
    expect(singleFamily).toBe(4);

    const v6 = createPinnedLookup({
      hostname: "alerts.example.com",
      pinnedAddress: "2001:4860:4860::8888",
      connectFamily: 6,
    });
    let v6All: unknown;
    v6("alerts.example.com", { all: true }, (_err: Error | null, value?: unknown) => {
      v6All = value;
    });
    expect(v6All).toEqual([{ address: "2001:4860:4860::8888", family: 6 }]);
  });

  it("production postWebhookHttpsPinned 가 pin IP·Host·SNI 를 실제 TLS로 검증한다", async () => {
    const opensslVersion = spawnSync("openssl", ["version"], { encoding: "utf8" });
    if (opensslVersion.status !== 0 || !String(opensslVersion.stdout).trim()) {
      throw new Error(
        `TLS pin fixture requires openssl in PATH (CI prerequisite: Node 22+ and OpenSSL with req -addext). openssl version failed: ${opensslVersion.stderr || opensslVersion.error}`,
      );
    }
    const opensslHelp = spawnSync("openssl", ["req", "-help"], { encoding: "utf8" });
    const helpText = `${opensslHelp.stdout}\n${opensslHelp.stderr}`;
    if (!helpText.includes("-addext")) {
      throw new Error(
        `TLS pin fixture requires openssl req -addext. Found: ${String(opensslVersion.stdout).trim()}`,
      );
    }

    const certDir = mkdtempSync(path.join(tmpdir(), "solarsimz-tls-"));
    const keyPath = path.join(certDir, "key.pem");
    const certPath = path.join(certDir, "cert.pem");
    const openssl = spawnSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=alerts.example.com",
        "-addext",
        "subjectAltName=DNS:alerts.example.com",
      ],
      { encoding: "utf8" },
    );
    expect(openssl.status, openssl.stderr).toBe(0);
    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);

    const serverSeen = { host: "", sni: "" };
    const server = createHttpsServer({ key, cert }, (req, res) => {
      serverSeen.host = String(req.headers.host ?? "");
      serverSeen.sni = String(
        (req.socket as import("node:tls").TLSSocket).servername ?? "",
      );
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("failed to bind tls fixture");
    }
    const port = address.port;
    const peer: { remoteAddress?: string; servername?: string } = {};

    try {
      const result = await postWebhookHttpsPinned({
        url: `https://alerts.example.com:${port}/hook`,
        hostname: "alerts.example.com",
        pinnedAddress: "127.0.0.1",
        family: 4,
        body: "{\"type\":\"kepco_monitor_alert\"}",
        signatureHeader: "sha256=abc",
        timeoutMs: 3000,
        ca: cert,
        rejectUnauthorized: true,
        onPeer: (info) => {
          peer.remoteAddress = info.remoteAddress;
          peer.servername = info.servername;
        },
      });
      expect(result).toMatchObject({ delivered: true, sink: "webhook" });
      expect(peer.remoteAddress).toMatch(/127\.0\.0\.1/);
      expect(serverSeen.host).toBe(`alerts.example.com:${port}`);
      expect(serverSeen.sni).toBe("alerts.example.com");
      expect(peer.servername).toBe("alerts.example.com");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      rmSync(certDir, { recursive: true, force: true });
    }
  });
});

describe("monitor webhook alert sink", () => {
  let directory: string;
  let dbPath: string;
  let db: AppDatabase;
  const secret = "test-webhook-secret-value";

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-webhook-"));
    dbPath = path.join(directory, "app.db");
    db = openDatabase(dbPath);
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function seedFailureStreak() {
    const operator = db
      .prepare(`SELECT id, tenant_id FROM users WHERE username = 'operator'`)
      .get() as { id: string; tenant_id: string };
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '감시 업체')",
    ).run();
    const now = new Date().toISOString();
    for (let index = 0; index < 3; index += 1) {
      db.prepare(
        `INSERT INTO collection_jobs
         (id, tenant_id, actor_id, fid, mode, target_period, status,
          attempt_count, max_attempts, error_code, request_id, created_at, finished_at, updated_at)
         VALUES (?, ?, ?, 101, 'single', 'current', 'FAILED', 1, 2, 'LOGIN_FAILED', ?, ?, ?, ?)`,
      ).run(`job-fail-${index}`, operator.tenant_id, operator.id, `req-${index}`, now, now, now);
    }
  }

  async function withLoopbackServer(
    handler: (
      req: import("node:http").IncomingMessage,
      res: import("node:http").ServerResponse,
    ) => void,
    run: (url: string) => void | Promise<void>,
  ) {
    const server = createHttpServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("failed to bind loopback");
    }
    try {
      await run(`http://127.0.0.1:${address.port}/alert`);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }

  function runMonitorAsync(extraEnv: Record<string, string>) {
    return new Promise<{
      status: number | null;
      stdout: string;
      stderr: string;
    }>((resolve, reject) => {
      const child = spawn("node", ["scripts/monitor-collection-jobs.mjs"], {
        cwd: root,
        env: {
          ...process.env,
          DATABASE_PATH: dbPath,
          KEPCO_FAIL_STREAK: "3",
          ...extraEnv,
        },
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    });
  }

  function runMonitor(extraEnv: Record<string, string>) {
    return spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_FAIL_STREAK: "3",
        ...extraEnv,
      },
    });
  }

  it("성공 body 에 HMAC-SHA256 서명을 붙이고 secret/URL 을 출력하지 않는다", async () => {
    seedFailureStreak();
    let seenBody = "";
    let seenSig = "";
    await withLoopbackServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("end", () => {
        seenBody = Buffer.concat(chunks).toString("utf8");
        seenSig = String(req.headers["x-solarsimz-signature"] ?? "");
        res.writeHead(204);
        res.end();
      });
    }, async (url) => {
      const ok = await runMonitorAsync({
        KEPCO_ALERT_SINK: "webhook",
        KEPCO_ALERT_WEBHOOK_URL: url,
        KEPCO_ALERT_WEBHOOK_SECRET: secret,
        KEPCO_ALERT_TIMEOUT_MS: "2000",
        KEPCO_ALERT_ALLOW_HTTP_LOOPBACK: "1",
      });
      expect(ok.status).toBe(2);
      expect(JSON.parse(ok.stdout).alert.delivered).toBe(true);
      expect(ok.stdout).not.toContain(secret);
      expect(ok.stdout).not.toContain(url);
      const mac = createHmac("sha256", secret).update(seenBody).digest("hex");
      expect(seenSig).toBe(`sha256=${mac}`);
    });
  });

  it("HTTP 500·redirect·timeout 계약을 유지한다", async () => {
    seedFailureStreak();
    await withLoopbackServer((_req, res) => {
      res.writeHead(500);
      res.end("no");
    }, async (url) => {
      const fail = await runMonitorAsync({
        KEPCO_ALERT_SINK: "webhook",
        KEPCO_ALERT_WEBHOOK_URL: url,
        KEPCO_ALERT_WEBHOOK_SECRET: secret,
        KEPCO_ALERT_ALLOW_HTTP_LOOPBACK: "1",
      });
      expect(fail.status).toBe(2);
      expect(JSON.parse(fail.stdout).alert.errorCode).toBe("HTTP_NON_2XX");
    });

    await withLoopbackServer((_req, res) => {
      res.writeHead(302, { Location: "http://127.0.0.1/elsewhere" });
      res.end();
    }, async (url) => {
      const redirect = await runMonitorAsync({
        KEPCO_ALERT_SINK: "webhook",
        KEPCO_ALERT_WEBHOOK_URL: url,
        KEPCO_ALERT_WEBHOOK_SECRET: secret,
        KEPCO_ALERT_ALLOW_HTTP_LOOPBACK: "1",
      });
      expect(redirect.status).toBe(2);
      expect(JSON.parse(redirect.stdout).alert.errorCode).toBe("REDIRECT");
    });

    await withLoopbackServer(() => {
      // never respond
    }, async (url) => {
      const timed = await runMonitorAsync({
        KEPCO_ALERT_SINK: "webhook",
        KEPCO_ALERT_WEBHOOK_URL: url,
        KEPCO_ALERT_WEBHOOK_SECRET: secret,
        KEPCO_ALERT_TIMEOUT_MS: "50",
        KEPCO_ALERT_ALLOW_HTTP_LOOPBACK: "1",
      });
      expect(timed.status).toBe(2);
      expect(JSON.parse(timed.stdout).alert.errorCode).toBe("TIMEOUT");
    });
  });

  it("설정 누락·unknown sink·private https·allowlist·missing DB 는 exit 1 이고 stack 미노출", () => {
    expect(
      runMonitor({
        KEPCO_ALERT_SINK: "webhook",
        KEPCO_ALERT_ALLOW_HTTP_LOOPBACK: "1",
      }).status,
    ).toBe(1);

    expect(runMonitor({ KEPCO_ALERT_SINK: "pagerduty" }).status).toBe(1);

    const privateHttps = runMonitor({
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: "https://10.0.0.8/hook",
      KEPCO_ALERT_WEBHOOK_SECRET: secret,
      KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST: "10.0.0.8",
    });
    expect(privateHttps.status).toBe(1);
    expect(privateHttps.stderr).not.toContain(secret);
    expect(privateHttps.stderr).not.toMatch(/node_modules/);

    const noAllowlist = runMonitor({
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      KEPCO_ALERT_WEBHOOK_SECRET: secret,
    });
    expect(noAllowlist.status).toBe(1);

    const missing = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: path.join(directory, "no-such.db"),
      },
    });
    expect(missing.status).toBe(1);
    expect(JSON.parse(missing.stdout).errorCode).toBe("DB_OPEN_FAILED");
    expect(missing.stderr).not.toMatch(/node_modules|\/Users\/|at\s+\S+\s+\(/);
  });

  it("no-alert HTTPS 는 DNS lookup 0회·file sink path 는 basename", () => {
    const countFile = path.join(directory, "dns-lookup-count.txt");
    const lookupModule = path.join(directory, "dns-lookup-counter.mjs");
    writeFileSync(
      lookupModule,
      `import { appendFileSync } from "node:fs";
export async function lookupAll(hostname) {
  appendFileSync(${JSON.stringify(countFile)}, "1\\n");
  return [{ address: "203.0.113.50", family: 4 }];
}
`,
    );

    const quiet = runMonitor({
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      KEPCO_ALERT_WEBHOOK_SECRET: secret,
      KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST: "alerts.example.com",
      KEPCO_ALERT_DNS_LOOKUP_MODULE: lookupModule,
      KEPCO_ALERT_ALLOW_INJECT: "1",
    });
    expect(quiet.status).toBe(0);
    expect(JSON.parse(quiet.stdout).alert.reason).toBe("no_alert");
    expect(existsSync(countFile)).toBe(false);

    seedFailureStreak();
    const alerting = runMonitor({
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      KEPCO_ALERT_WEBHOOK_SECRET: secret,
      KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST: "alerts.example.com",
      KEPCO_ALERT_DNS_LOOKUP_MODULE: lookupModule,
      KEPCO_ALERT_ALLOW_INJECT: "1",
      KEPCO_ALERT_TIMEOUT_MS: "200",
    });
    expect(alerting.status).toBe(2);
    expect(existsSync(countFile)).toBe(true);
    expect(readFileSync(countFile, "utf8").trim().split("\n").length).toBe(1);

    const alertPath = path.join(directory, "alerts.jsonl");
    const failing = runMonitor({
      KEPCO_ALERT_SINK: "file",
      KEPCO_ALERT_PATH: alertPath,
    });
    expect(failing.status).toBe(2);
    const report = JSON.parse(failing.stdout);
    expect(report.alert.path).toBe("alerts.jsonl");
    expect(String(report.alert.path)).not.toContain(directory);
  });
});
