import { describe, expect, it, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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
      const payload = JSON.parse(result.stdout);
      expect(payload.ok).toBe(true);
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
});
