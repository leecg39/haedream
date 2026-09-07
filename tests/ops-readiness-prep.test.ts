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
  env: Record<string, string> = {},
) {
  return spawnSync("node", [script, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
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
    );
    // directory is under tmp — outside repo worktree
    const ok = runNode("scripts/ops-external-input-runner.mjs", [
      "--manifest",
      manifestPath,
    ]);
    expect(ok.status, ok.stderr || ok.stdout).toBe(0);
    expect(ok.stdout).not.toContain(secret);
    expect(ok.stdout).not.toContain("https://alerts.example.com/hook");
    const summary = JSON.parse(
      readFileSync(path.join(evidenceDir, "runner-summary.json"), "utf8"),
    );
    expect(summary.ok).toBe(true);
    expect(statSync(path.join(evidenceDir, "runner-summary.json")).mode & 0o777).toBe(
      0o600,
    );
  });

  it("ops-external-input-runner records B/D/E operator attestations without completing goals", () => {
    const snapshotPath = path.join(directory, "tiny-offline.db");
    writeFileSync(snapshotPath, "offline-db-bytes");
    chmodSync(snapshotPath, 0o600);
    const sha256 = createHash("sha256")
      .update(readFileSync(snapshotPath))
      .digest("hex");

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
                  pre011BackupProvenance: "n/a-no-solarsimz-on-host",
                },
                {
                  alias: "local-dev-post-011",
                  hostsSolarSimz: true,
                  offlineSnapshotPath: snapshotPath,
                  pre011BackupProvenance: "alias:pre-011-backup-unknown",
                },
              ],
            },
          ],
        },
        null,
        2,
      )}\n`,
    );

    const deniedGate = runNode(
      "scripts/ops-external-input-runner.mjs",
      ["--manifest", manifestPath],
      {},
    );
    expect(deniedGate.status).toBe(1);
    expect(deniedGate.stderr).toMatch(/required minimum/i);

    const ok = runNode(
      "scripts/ops-external-input-runner.mjs",
      ["--manifest", manifestPath],
      { OPS_ATTEST_MIN_BYTES: "1" },
    );
    expect(ok.status, ok.stderr || ok.stdout).toBe(0);
    const summary = JSON.parse(
      readFileSync(path.join(evidenceDir, "runner-summary.json"), "utf8"),
    );
    expect(summary.ok).toBe(true);
    expect(summary.results).toHaveLength(3);
    expect(summary.results.every((row: { ok: boolean }) => row.ok)).toBe(true);

    const attest = JSON.parse(
      readFileSync(path.join(evidenceDir, "attest-large-db.json"), "utf8"),
    );
    expect(attest.attestationRecorded).toBe(true);
    expect(attest.p7t2CheckboxAutoChecked).toBe(false);
    expect(attest.sha256).toBe(sha256);
    expect(JSON.stringify(attest)).not.toMatch(/Users\//);

    const observation = JSON.parse(
      readFileSync(path.join(evidenceDir, "observation-registry.json"), "utf8"),
    );
    expect(observation.observationComplete).toBe(false);
    expect(observation.plannedDays).toBe(7);

    const envDecl = JSON.parse(
      readFileSync(path.join(evidenceDir, "declare-external-env.json"), "utf8"),
    );
    expect(envDecl.migration011AuditComplete).toBe(false);
    expect(envDecl.hostingSolarSimzCount).toBe(1);
    expect(envDecl.environments[0].hostsSolarSimz).toBe(false);
  });
});
