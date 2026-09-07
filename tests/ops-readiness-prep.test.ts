import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
  chmodSync,
  statSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  readdirSync,
  createReadStream,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNode(
  script: string,
  args: string[],
  env: Record<string, string | undefined> = {},
) {
  const merged: NodeJS.ProcessEnv = { ...process.env, ...env };
  // Never inherit a forbidden attest override into success paths unless the test sets it.
  if (!Object.prototype.hasOwnProperty.call(env, "OPS_ATTEST_MIN_BYTES")) {
    delete merged.OPS_ATTEST_MIN_BYTES;
  }
  return spawnSync("node", [script, ...args], {
    cwd: root,
    env: merged,
    encoding: "utf8",
  });
}

describe("ops readiness prep scripts", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-ops-prep-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("create-offline-db-snapshot copies live WAL DB to offline leaf", () => {
    const live = path.join(directory, "live.db");
    const offline = path.join(directory, "offline.db");
    const db = new Database(live);
    db.exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO t(v) VALUES ('x');`);
    db.pragma("journal_mode = WAL");
    db.prepare(`INSERT INTO t(v) VALUES ('y')`).run();
    // Keep writer open so -wal/-shm remain during backup.
    expect(existsSync(`${live}-wal`) || existsSync(`${live}-shm`)).toBe(true);

    try {
      const result = runNode("scripts/create-offline-db-snapshot.mjs", [
        live,
        offline,
      ]);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(existsSync(offline)).toBe(true);
      expect(existsSync(`${offline}-wal`)).toBe(false);
      expect(existsSync(`${offline}-shm`)).toBe(false);
      expect(existsSync(`${offline}.meta.json`)).toBe(true);
      expect(statSync(offline).mode & 0o777).toBe(0o600);
      expect(statSync(`${offline}.meta.json`).mode & 0o777).toBe(0o600);
      const payload = JSON.parse(result.stdout);
      expect(payload.ok).toBe(true);
      expect(payload.mode).toBe("0600");
      expect(payload.bytes).toBeGreaterThan(0);
      expect(payload.sha256).toMatch(/^[a-f0-9]{64}$/);
      const verify = new Database(offline, { readonly: true, fileMustExist: true });
      try {
        const row = verify.prepare(`SELECT COUNT(*) AS c FROM t`).get() as {
          c: number;
        };
        expect(row.c).toBe(2);
      } finally {
        verify.close();
      }
    } finally {
      db.close();
    }
  });

  it("create-offline-db-snapshot forces 0600 even when umask or prior meta mode is wide", () => {
    const live = path.join(directory, "wide-src.db");
    const offline = path.join(directory, "wide-out.db");
    const meta = `${offline}.meta.json`;
    const db = new Database(live);
    db.exec(`CREATE TABLE t (id INTEGER PRIMARY KEY); INSERT INTO t DEFAULT VALUES;`);
    db.close();

    // Pre-create companion meta with world-readable mode; script must replace at 0600.
    writeFileSync(meta, "{}\n", { mode: 0o666 });
    chmodSync(meta, 0o666);
    expect(statSync(meta).mode & 0o777).toBe(0o666);

    const previousUmask = process.umask(0o000);
    try {
      // Prove spawnSync children inherit the widened umask (not only the parent).
      // Do not chmod after write — resulting mode must reflect umask alone.
      const childProbe = path.join(directory, "child-umask-probe");
      const probeRun = spawnSync(
        "node",
        [
          "-e",
          `const fs=require('fs');fs.writeFileSync(process.argv[1],'x',{mode:0o666});process.stdout.write(String(fs.statSync(process.argv[1]).mode&0o777));`,
          childProbe,
        ],
        { cwd: root, encoding: "utf8" },
      );
      expect(probeRun.status).toBe(0);
      expect(Number(probeRun.stdout)).toBe(0o666);

      const result = runNode("scripts/create-offline-db-snapshot.mjs", [
        live,
        offline,
      ]);
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(statSync(offline).mode & 0o777).toBe(0o600);
      expect(statSync(meta).mode & 0o777).toBe(0o600);
      const metaBody = JSON.parse(readFileSync(meta, "utf8"));
      expect(metaBody.mode).toBe("0600");
      // Under inherited umask 000, backup must have been wider before force
      // (otherwise the case does not exercise chmod repair).
      const afterBackup = Number.parseInt(metaBody.modeAfterBackup, 8);
      expect(afterBackup & ~0o600).toBeGreaterThan(0);
      expect(metaBody.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(metaBody)).not.toMatch(/Users\//);
    } finally {
      process.umask(previousUmask);
    }
  });

  it("create-synthetic-large-db respects --min-bytes and leaves no sidecars", () => {
    const out = path.join(directory, "synth.db");
    const minBytes = 2 * 1024 * 1024; // 2MiB for unit speed
    const result = runNode("scripts/create-synthetic-large-db.mjs", [
      out,
      "--min-bytes",
      String(minBytes),
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.bytes).toBeGreaterThanOrEqual(minBytes);
    expect(existsSync(`${out}-wal`)).toBe(false);
    expect(existsSync(`${out}-shm`)).toBe(false);
    expect(existsSync(`${out}.meta.json`)).toBe(true);
  });

  it("audit-migration-011 reports orphans and exits 2 without mutating", () => {
    const dbPath = path.join(directory, "audit.db");
    const reportPath = path.join(directory, "report.json");
    const migrate = runNode("scripts/migrate.mjs", [], {
      DATABASE_PATH: dbPath,
    });
    expect(migrate.status).toBe(0);

    // Force an orphan by deleting firm while keeping a job-like row is hard after 011 FK.
    // Instead audit a pre-011 style DB: recreate minimal schema without 011 applied.
    rmSync(dbPath, { force: true });
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      rmSync(`${dbPath}${suffix}`, { force: true });
    }
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE firms (fid INTEGER PRIMARY KEY);
      CREATE TABLE collection_jobs (
        id TEXT PRIMARY KEY,
        fid INTEGER NOT NULL
      );
      CREATE TABLE energy_measurements (
        id TEXT PRIMARY KEY,
        fid INTEGER NOT NULL
      );
      INSERT INTO collection_jobs(id, fid) VALUES ('j1', 999);
      INSERT INTO energy_measurements(id, fid) VALUES ('m1', 999);
    `);
    db.close();

    const before = readFileSync(dbPath);
    const result = runNode("scripts/audit-migration-011.mjs", [
      "--db",
      dbPath,
      "--env-alias",
      "test-local",
      "--report",
      reportPath,
    ]);
    expect(result.status).toBe(2);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(report.envAlias).toBe("test-local");
    expect(report.migration011Applied).toBe(false);
    expect(report.orphanCollectionJobs).toBe(1);
    expect(report.orphanEnergyMeasurements).toBe(1);
    expect(report.stopRecommended).toBe(true);
    expect(readFileSync(dbPath)).toEqual(before);
  });

  it("audit-migration-011 rejects hot WAL sources", () => {
    const dbPath = path.join(directory, "hot.db");
    const db = new Database(dbPath);
    db.exec(`CREATE TABLE t (id INTEGER);`);
    db.pragma("journal_mode = WAL");
    db.prepare(`INSERT INTO t(id) VALUES (1)`).run();
    try {
      expect(existsSync(`${dbPath}-wal`) || existsSync(`${dbPath}-shm`)).toBe(
        true,
      );

      const result = runNode("scripts/audit-migration-011.mjs", [
        "--db",
        dbPath,
        "--env-alias",
        "hot",
      ]);
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/sidecar|WAL|offline/i);
    } finally {
      db.close();
    }
  });

  it("verify-webhook-config validates without network and never echoes secret", () => {
    const bad = runNode("scripts/verify-webhook-config.mjs", [], {
      KEPCO_ALERT_SINK: "none",
    });
    expect(bad.status).toBe(1);

    const secret = "super-secret-value-do-not-leak";
    const ok = runNode("scripts/verify-webhook-config.mjs", [], {
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: "https://alerts.example.com/hook",
      KEPCO_ALERT_WEBHOOK_SECRET: secret,
      KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST: "alerts.example.com",
    });
    expect(ok.status).toBe(0);
    const payload = JSON.parse(ok.stdout);
    expect(payload.ok).toBe(true);
    expect(payload.urlIsHttps).toBe(true);
    expect(ok.stdout).not.toContain(secret);
    expect(ok.stdout).not.toContain("https://alerts.example.com/hook");
  });

  it("ops-synthetic-readiness-rehearsal completes A/D/E synthetic path", () => {
    const reportPath = path.join(directory, "synth-ops.json");
    const result = runNode("scripts/ops-synthetic-readiness-rehearsal.mjs", [
      "--report",
      reportPath,
    ]);
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.ok).toBe(true);
    expect(summary.applyInserted).toBeGreaterThan(0);
    expect(summary.reapplyUnchanged).toBeGreaterThan(0);
    expect(summary.reconcileMismatch).toBe(0);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(report.notRealCustomerData).toBe(true);
    expect(report.steps.reapply.ingestedAtUnchanged).toBe(true);
    expect(report.steps.audit011.migration011Applied).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/solarsimz\.db/);
  });

  it("deid snapshot requires operator gate and redacts firm/user PII at 0600", () => {
    const source = path.join(directory, "src-offline.db");
    const out = path.join(directory, "deid.db");
    runNode("scripts/migrate.mjs", [], { DATABASE_PATH: source });
    runNode("scripts/seed.mjs", [], {
      DATABASE_PATH: source,
      ALLOW_DEMO_SEED: "true",
    });
    const db = new Database(source);
    db.prepare(
      `UPDATE firms SET phone = '01012345678', address_text = '서울시 테스트', firm_name = '실명업체' WHERE fid = 2000000001`,
    ).run();
    db.pragma("journal_mode = DELETE");
    db.close();
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      const p = `${source}${suffix}`;
      if (existsSync(p)) rmSync(p, { force: true });
    }

    const denied = runNode(
      "scripts/create-deidentified-offline-snapshot.mjs",
      ["--source", source, "--out", out],
      {},
    );
    expect(denied.status).toBe(1);

    const ok = runNode(
      "scripts/create-deidentified-offline-snapshot.mjs",
      ["--source", source, "--out", out, "--i-approve-deidentify"],
      { ALLOW_DEIDENTIFY: "1" },
    );
    expect(ok.status, ok.stderr || ok.stdout).toBe(0);
    expect(statSync(out).mode & 0o777).toBe(0o600);
    expect(statSync(`${out}.meta.json`).mode & 0o777).toBe(0o600);
    const verify = new Database(out, { readonly: true, fileMustExist: true });
    try {
      const firm = verify
        .prepare(
          `SELECT firm_name AS name, phone, address_text AS addr FROM firms WHERE fid = 2000000001`,
        )
        .get() as { name: string; phone: string; addr: string };
      expect(firm.name).toBe("DEID-FIRM-2000000001");
      expect(firm.phone).toBe("");
      expect(firm.addr).toBe("");
      const user = verify
        .prepare(`SELECT username, name FROM users WHERE role = 'OPERATOR'`)
        .get() as { username: string; name: string };
      expect(user.username.startsWith("deid-")).toBe(true);
      expect(user.name).toContain("DEID");
    } finally {
      verify.close();
    }
    const meta = JSON.parse(readFileSync(`${out}.meta.json`, "utf8"));
    expect(meta.attestationRequiredForP7T2).toBe(true);
    expect(JSON.stringify(meta)).not.toMatch(/Users\//);
  });

  it("ops-external-input-runner refuses in-repo manifests and redacts webhook secrets", () => {
    const inRepo = path.join(root, "docs/ops/external-input-manifest.example.json");
    const refuse = runNode("scripts/ops-external-input-runner.mjs", [
      "--manifest",
      inRepo,
    ]);
    expect(refuse.status).toBe(1);
    expect(refuse.stderr).toMatch(/outside the git worktree/i);

    const manifestPath = path.join(directory, "manifest.json");
    const evidenceDir = path.join(directory, "evidence");
    const secret = "manifest-secret-do-not-leak";
    writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          envAlias: "test-local",
          evidenceDir,
          actions: [
            {
              type: "verify-webhook-config",
              url: "https://alerts.example.com/hook",
              secret,
              hostAllowlist: "alerts.example.com",
            },
          ],
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
    chmodSync(manifestPath, 0o600);
    const ok = runNode("scripts/ops-external-input-runner.mjs", [
      "--manifest",
      manifestPath,
    ]);
    expect(ok.status, ok.stderr || ok.stdout).toBe(0);
    expect(ok.stdout).not.toContain(secret);
    expect(ok.stdout).not.toContain("https://alerts.example.com/hook");
    expect(ok.stdout).not.toContain("test-local");
    expect(ok.stdout).toMatch(/"envAliasPresent": true/);
    expect(statSync(evidenceDir).mode & 0o777).toBe(0o700);
    const summaries = readdirSync(evidenceDir).filter((name) =>
      name.startsWith("runner-summary."),
    );
    expect(summaries.length).toBe(1);
    expect(statSync(path.join(evidenceDir, summaries[0])).mode & 0o777).toBe(
      0o600,
    );
  });

  it("ops-external-input guards reject symlink, in-repo evidence, overwrite, invalid date, non-sqlite, permissive mode", async () => {
    const {
      assertOutsideRepoPath,
      assertOpsSqliteSnapshot,
      ensureEvidenceDir,
      requireIsoDate,
      writeEvidenceAtomic,
      writeEvidenceTextAtomic,
      ATTEST_MIN_BYTES,
    } = await import("../scripts/lib/ops-external-input-guard.mjs");

    expect(ATTEST_MIN_BYTES).toBe(1_000_000_000);
    expect(() => requireIsoDate("2026-02-31", "startDate")).toThrow(
      /calendar|real calendar/i,
    );
    expect(requireIsoDate("2026-09-07", "startDate")).toBe("2026-09-07");

    const evidenceInside = path.join(root, "docs", "tmp-evidence-should-fail");
    expect(() => ensureEvidenceDir(evidenceInside)).toThrow(
      /outside the git worktree/i,
    );

    const outsideEvidence = ensureEvidenceDir(path.join(directory, "ev-ok"));
    expect(statSync(outsideEvidence).mode & 0o777).toBe(0o700);

    const target = path.join(directory, "leaf.db");
    writeFileSync(target, "not-sqlite");
    chmodSync(target, 0o600);
    const link = path.join(directory, "leaf-link.db");
    symlinkSync(target, link);
    expect(() =>
      assertOutsideRepoPath(link, "snapshot", { mustExist: true }),
    ).toThrow(/symlink/i);

    expect(() =>
      assertOpsSqliteSnapshot(target, "snapshot", { require0600: true }),
    ).toThrow(/SQLite|integrity/i);

    const tinyDb = path.join(directory, "tiny.sqlite");
    const db = new Database(tinyDb);
    db.exec("CREATE TABLE t(x); INSERT INTO t VALUES (1);");
    db.close();
    chmodSync(tinyDb, 0o644);
    expect(() =>
      assertOpsSqliteSnapshot(tinyDb, "snapshot", { require0600: true }),
    ).toThrow(/0600/);
    chmodSync(tinyDb, 0o600);

    const coldWal = path.join(directory, "cold-wal.sqlite");
    const walDb = new Database(coldWal);
    walDb.pragma("journal_mode = WAL");
    walDb.exec("CREATE TABLE t(x)");
    walDb.close();
    chmodSync(coldWal, 0o600);
    expect(existsSync(`${coldWal}-wal`)).toBe(false);
    expect(() => assertOpsSqliteSnapshot(coldWal, "snapshot")).toThrow(/WAL format refused/);
    expect(existsSync(`${coldWal}-wal`)).toBe(false);
    expect(existsSync(`${coldWal}-shm`)).toBe(false);

    const evidenceFile = path.join(outsideEvidence, "fixed.json");
    writeEvidenceAtomic(evidenceFile, { ok: true });
    expect(() => writeEvidenceAtomic(evidenceFile, { ok: false })).toThrow(
      /overwrite/i,
    );
    expect(JSON.parse(readFileSync(evidenceFile, "utf8"))).toEqual({ ok: true });
    const missingTarget = path.join(directory, "missing-target");
    const dangling = path.join(outsideEvidence, "dangling.md");
    symlinkSync(missingTarget, dangling);
    expect(() => writeEvidenceTextAtomic(dangling, "replace")).toThrow(/overwrite/i);
    expect(existsSync(missingTarget)).toBe(false);
    expect(readdirSync(outsideEvidence).some((name) => name.endsWith(".tmp"))).toBe(false);

    const dirTarget = path.join(directory, "unchanged-mode");
    mkdirSync(dirTarget, { mode: 0o755 });
    chmodSync(dirTarget, 0o755);
    const dirLink = path.join(directory, "dir-link");
    symlinkSync(dirTarget, dirLink);
    expect(() => ensureEvidenceDir(dirLink)).toThrow(/symlink/i);
    expect(statSync(dirTarget).mode & 0o777).toBe(0o755);

    // Parent symlink into repo must not allow evidenceDir escape.
    const decoy = path.join(directory, "decoy-parent");
    mkdirSync(decoy, { recursive: true });
    const linkIntoRepo = path.join(decoy, "into-repo");
    symlinkSync(root, linkIntoRepo);
    expect(() =>
      ensureEvidenceDir(path.join(linkIntoRepo, "escape-evidence")),
    ).toThrow(/outside the git worktree/i);
  });

  it("rejects malformed/unknown input without leaking contents and stops after a returned failure", () => {
    const canary = "sensitive-canary-do-not-print";
    const manifest = path.join(directory, "input.json");
    const evidenceDir = path.join(directory, "evidence");
    for (const input of [canary, JSON.stringify({ actions: [{ type: canary }] })]) {
      writeFileSync(manifest, input, { mode: 0o600 });
      const result = runNode("scripts/ops-external-input-runner.mjs", ["--manifest", manifest]);
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toContain(canary);
      expect(existsSync(evidenceDir)).toBe(false);
    }
    writeFileSync(manifest, JSON.stringify({
      evidenceDir,
      actions: [
        { type: "verify-webhook-config", url: "", secret: canary },
        { type: "register-observation", envAlias: "test", startDate: "2026-09-07",
          plannedDays: 7, alertOwner: "oncall", faultInjectApproved: false },
      ],
    }));
    const failed = runNode("scripts/ops-external-input-runner.mjs", ["--manifest", manifest]);
    expect(failed.status).toBe(1);
    expect(failed.stdout + failed.stderr).not.toContain(canary);
    expect(JSON.parse(failed.stdout)).toMatchObject({
      ok: false, partial: true, actionCount: 1, plannedActionCount: 2,
    });
    const files = readdirSync(evidenceDir);
    expect(files.some((name) => name.startsWith("observation-"))).toBe(false);
    const summary = JSON.parse(readFileSync(path.join(evidenceDir, files[0]), "utf8"));
    expect(summary.failedEarly.index).toBe(0);
  });

  it("keeps migration rehearsal reports outside the repository and preserves its source", () => {
    const snapshot = path.join(directory, "source.sqlite");
    const migrated = runNode("scripts/migrate.mjs", [], { DATABASE_PATH: snapshot });
    expect(migrated.status, migrated.stderr).toBe(0);
    const seeded = runNode("scripts/seed.mjs", [], {
      DATABASE_PATH: snapshot, ALLOW_DEMO_SEED: "true",
    });
    expect(seeded.status, seeded.stderr).toBe(0);
    const sourceDb = new Database(snapshot);
    sourceDb.pragma("journal_mode = DELETE");
    sourceDb.close();
    chmodSync(snapshot, 0o600);
    const before = readFileSync(snapshot);
    const repoReport = path.join(root, "docs/audit/migrate-rehearsal-latest.json");
    const priorReport = existsSync(repoReport) ? readFileSync(repoReport) : null;
    const evidenceDir = path.join(directory, "rehearsal-evidence");
    const manifest = path.join(directory, "rehearsal.json");
    writeFileSync(manifest, JSON.stringify({ evidenceDir, actions: [
      { type: "migrate-rehearsal", sourceDb: snapshot },
    ] }), { mode: 0o600 });
    const result = runNode("scripts/ops-external-input-runner.mjs", ["--manifest", manifest]);
    const reportName = readdirSync(evidenceDir).find((name) => name.startsWith("migrate-rehearsal."))!;
    const reportPath = path.join(evidenceDir, reportName);
    expect(result.status, readFileSync(reportPath, "utf8")).toBe(0);
    expect(statSync(reportPath).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(reportPath, "utf8"))).toMatchObject({
      externalSourceMigrated: true, externalSourceBackupRestore: true, largeDbRehearsal: "unverified",
    });
    expect(readFileSync(snapshot).equals(before)).toBe(true);
    expect(existsSync(`${snapshot}-wal`)).toBe(false);
    expect(existsSync(`${snapshot}-shm`)).toBe(false);
    expect(existsSync(repoReport) ? readFileSync(repoReport) : null).toEqual(priorReport);
  }, 60_000);

  it("ops-external-input-runner refuses OPS_ATTEST_MIN_BYTES bypass and undersized/non-sqlite attest", () => {
    const junk = path.join(directory, "junk-1gb-claim.bin");
    writeFileSync(junk, "x");
    chmodSync(junk, 0o600);
    const sha = createHash("sha256").update("x").digest("hex");
    const evidenceDir = path.join(directory, "evidence-bypass");
    const manifestPath = path.join(directory, "bypass-manifest.json");
    writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          envAlias: "bypass-test",
          evidenceDir,
          actions: [
            {
              type: "attest-large-db",
              iApproveAttestation: true,
              operator: "test-operator",
              statement: "should fail",
              snapshotPath: junk,
              expectedSha256: sha,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    chmodSync(manifestPath, 0o600);

    const withOverride = runNode(
      "scripts/ops-external-input-runner.mjs",
      ["--manifest", manifestPath],
      { OPS_ATTEST_MIN_BYTES: "1" },
    );
    expect(withOverride.status).toBe(1);
    expect(`${withOverride.stderr}\n${withOverride.stdout}`).toMatch(
      /OPS_ATTEST_MIN_BYTES override is forbidden/i,
    );

    const undersized = runNode("scripts/ops-external-input-runner.mjs", [
      "--manifest",
      manifestPath,
    ]);
    expect(undersized.status).toBe(1);
    expect(`${undersized.stderr}${undersized.stdout}`).toMatch(
      /SQLite|required minimum|not a readable/i,
    );

    const smallPath = path.join(directory, "valid-but-small.sqlite");
    const smallDb = new Database(smallPath);
    smallDb.exec("CREATE TABLE t(x)");
    smallDb.close();
    chmodSync(smallPath, 0o600);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.actions[0].snapshotPath = smallPath;
    manifest.actions[0].expectedSha256 = createHash("sha256").update(readFileSync(smallPath)).digest("hex");
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const validButSmall = runNode("scripts/ops-external-input-runner.mjs", ["--manifest", manifestPath]);
    expect(validButSmall.status).toBe(1);
    expect(validButSmall.stdout).toMatch(/required minimum 1000000000/);
  });

  it(
    "ops-external-input-runner records B/D/E attestations with synthetic ≥1GB sqlite and never auto-completes",
    async () => {
      const snapshotPath = path.join(directory, "synthetic-1gb.sqlite");
      const db = new Database(snapshotPath);
      db.pragma("page_size = 4096");
      db.exec("CREATE TABLE pad(id INTEGER PRIMARY KEY, b BLOB);");
      // SQLITE_MAX_LENGTH default is 1e9; split blobs so the file exceeds ATTEST_MIN_BYTES.
      const insert = db.prepare("INSERT INTO pad(b) VALUES (zeroblob(?))");
      insert.run(500_000_000);
      insert.run(500_000_000);
      db.close();
      chmodSync(snapshotPath, 0o600);
      expect(statSync(snapshotPath).size).toBeGreaterThanOrEqual(1_000_000_000);
      const hash = createHash("sha256");
      for await (const chunk of createReadStream(snapshotPath)) hash.update(chunk);
      const sha256 = hash.digest("hex");

      const smallHosting = path.join(directory, "hosting-small.sqlite");
      const hostDb = new Database(smallHosting);
      hostDb.exec("CREATE TABLE t(x); INSERT INTO t VALUES (1);");
      hostDb.close();
      chmodSync(smallHosting, 0o600);

      const evidenceDir = path.join(directory, "evidence-attest");
      const manifestPath = path.join(directory, "attest-manifest.json");
      writeFileSync(
        manifestPath,
        `${JSON.stringify(
          {
            envAlias: "ops-attest-test",
            evidenceDir,
            actions: [
              {
                type: "attest-large-db",
                iApproveAttestation: true,
                operator: "test-operator",
                statement:
                  "Approve this deidentified offline snapshot for P7-T2 rehearsal evidence",
                snapshotPath,
                expectedSha256: sha256,
              },
              {
                type: "register-observation",
                envAlias: "scheduler-staging",
                startDate: "2026-09-07",
                plannedDays: 7,
                alertOwner: "oncall-alias",
                faultInjectApproved: false,
              },
              {
                type: "declare-external-env",
                iConfirmInventory: true,
                operator: "test-operator",
                environments: [
                  {
                    alias: "hostinger-vps-1",
                    hostsSolarSimz: false,
                    pre011BackupProvenance: "n-a-no-solarsimz-on-host",
                  },
                  {
                    alias: "local-dev-post-011",
                    hostsSolarSimz: true,
                    offlineSnapshotPath: smallHosting,
                    pre011BackupProvenance: "alias-pre-011-backup-unknown",
                  },
                ],
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      chmodSync(manifestPath, 0o600);

      const ok = runNode("scripts/ops-external-input-runner.mjs", [
        "--manifest",
        manifestPath,
      ]);
      expect(ok.status, ok.stderr || ok.stdout).toBe(0);
      expect(ok.stdout).not.toContain("ops-attest-test");
      expect(ok.stdout).not.toMatch(/Users\//);

      const files = readdirSync(evidenceDir);
      const attestName = files.find((f) => f.startsWith("attest-large-db."));
      const obsName = files.find((f) => f.startsWith("observation-registry."));
      const envName = files.find((f) => f.startsWith("declare-external-env."));
      expect(attestName).toBeTruthy();
      expect(obsName).toBeTruthy();
      expect(envName).toBeTruthy();

      const attest = JSON.parse(
        readFileSync(path.join(evidenceDir, attestName!), "utf8"),
      );
      expect(attest.attestationRecorded).toBe(true);
      expect(attest.p7t2CheckboxAutoChecked).toBe(false);
      expect(attest.sqliteIntegrityOk).toBe(true);
      expect(attest.bytes).toBeGreaterThanOrEqual(1_000_000_000);
      expect(attest.sha256).toBe(sha256);
      expect(attest.mode).toBe("600");

      const observation = JSON.parse(
        readFileSync(path.join(evidenceDir, obsName!), "utf8"),
      );
      expect(observation.observationComplete).toBe(false);

      const envDecl = JSON.parse(
        readFileSync(path.join(evidenceDir, envName!), "utf8"),
      );
      expect(envDecl.migration011AuditComplete).toBe(false);
      expect(envDecl.hostingSolarSimzCount).toBe(1);
      expect(envDecl.environments[1].sqliteIntegrityOk).toBe(true);
    },
    180_000,
  );
});
