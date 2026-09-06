import {
  mkdtempSync,
  rmSync,
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

const root = process.cwd();
const migrationsDir = path.join(root, "db", "migrations");

function applyMigrationsThrough(db: Database.Database, maxName: string) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?");
  const record = db.prepare(
    "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
  );
  const names = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of names) {
    if (name > maxName) break;
    if (applied.get(name)) continue;
    const sql = readFileSync(path.join(migrationsDir, name), "utf8");
    db.transaction(() => {
      db.exec(sql);
      record.run(name, new Date().toISOString());
    })();
  }
}

describe("migration 011 orphan preflight", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-mig011-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("orphan collection_jobs 가 있으면 011 이 실패하고 원본 스키마·행이 보존된다", () => {
    const dbPath = path.join(directory, "legacy.db");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    applyMigrationsThrough(db, "010_energy_measurements.sql");

    const tenant = db.prepare(`SELECT id FROM tenants LIMIT 1`).get() as
      | { id: string }
      | undefined;
    const user = db.prepare(`SELECT id FROM users LIMIT 1`).get() as
      | { id: string }
      | undefined;

    // 010 까지는 firms 시드가 없을 수 있으므로 tenants/users 만으로는 부족.
    // migrate 만으로는 빈 코어 테이블 — seed 없이 최소 행을 직접 넣는다.
    if (!tenant) {
      db.prepare(
        `INSERT INTO tenants (id, name, created_at) VALUES ('t-orphan', 'orphan-tenant', ?)`,
      ).run(new Date().toISOString());
    }
    const tenantId =
      (db.prepare(`SELECT id FROM tenants LIMIT 1`).get() as { id: string }).id;
    if (!user) {
      db.prepare(
        `INSERT INTO users (id, tenant_id, username, name, role, password_hash, active, created_at, updated_at)
         VALUES ('u-orphan', ?, 'orphan', 'orphan-user', 'OPERATOR', '$2a$10$abcdefghijklmnopqrstuv', 1, ?, ?)`,
      ).run(tenantId, new Date().toISOString(), new Date().toISOString());
    }
    const actorId = (db.prepare(`SELECT id FROM users LIMIT 1`).get() as { id: string })
      .id;

    db.pragma("foreign_keys = OFF");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, updated_at)
       VALUES ('job-orphan', ?, ?, 424242, 'single', 'current', 'QUEUED',
               0, 2, 'req-orphan', ?, ?)`,
    ).run(tenantId, actorId, now, now);
    db.prepare(
      `INSERT INTO energy_measurements
       (id, tenant_id, fid, meter_point, observed_at, ingested_at, source, quality, unit, value_real)
       VALUES ('m-orphan', ?, 424242, 'main', ?, ?, 'MEASURED', 'MEASURED', 'kW', 1)`,
    ).run(tenantId, now, now);
    db.pragma("foreign_keys = ON");

    const beforeJobs = (
      db.prepare(`SELECT COUNT(*) AS c FROM collection_jobs`).get() as { c: number }
    ).c;
    const beforeEnergy = (
      db.prepare(`SELECT COUNT(*) AS c FROM energy_measurements`).get() as {
        c: number;
      }
    ).c;
    expect(beforeJobs).toBe(1);
    expect(beforeEnergy).toBe(1);

    const sql011 = readFileSync(
      path.join(migrationsDir, "011_referential_integrity_and_corrections.sql"),
      "utf8",
    );
    expect(() =>
      db.transaction(() => {
        db.exec(sql011);
        db.prepare(
          `INSERT INTO _migrations (name, applied_at) VALUES (?, ?)`,
        ).run("011_referential_integrity_and_corrections.sql", now);
      })(),
    ).toThrow(/CHECK|constraint|orphan/i);

    expect(
      (
        db
          .prepare(
            `SELECT 1 AS ok FROM _migrations WHERE name = '011_referential_integrity_and_corrections.sql'`,
          )
          .get() as { ok: number } | undefined
      )?.ok,
    ).toBeUndefined();
    expect(
      (db.prepare(`SELECT COUNT(*) AS c FROM collection_jobs`).get() as { c: number }).c,
    ).toBe(1);
    expect(
      (
        db.prepare(`SELECT COUNT(*) AS c FROM energy_measurements`).get() as {
          c: number;
        }
      ).c,
    ).toBe(1);
    expect(
      (
        db
          .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='collection_jobs_v2'`,
          )
          .get() as { name: string } | undefined
      )?.name,
    ).toBeUndefined();
    db.close();
  });

  it("정상 DB 는 011·012 와 재실행을 통과한다", () => {
    const dbPath = path.join(directory, "clean.db");
    const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath },
    });
    expect(migrate.status, migrate.stderr).toBe(0);
    const rerun = spawnSync("node", ["scripts/migrate.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath },
    });
    expect(rerun.status, rerun.stderr).toBe(0);

    const seed = spawnSync("node", ["scripts/seed.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath, ALLOW_DEMO_SEED: "true" },
    });
    expect(seed.status, seed.stderr).toBe(0);

    const seededRerun = spawnSync("node", ["scripts/migrate.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath },
    });
    expect(seededRerun.status, seededRerun.stderr).toBe(0);

    const db = new Database(dbPath, { readonly: true });
    const applied = db
      .prepare(`SELECT name FROM _migrations ORDER BY name`)
      .all() as Array<{ name: string }>;
    expect(applied.some((row) => row.name.startsWith("011_"))).toBe(true);
    expect(applied.some((row) => row.name.startsWith("012_"))).toBe(true);
    const cols = db.prepare(`PRAGMA table_info(collection_jobs)`).all() as Array<{
      name: string;
    }>;
    expect(cols.some((col) => col.name === "next_attempt_at")).toBe(true);
    db.close();
  });

  it("restore-db-verify 는 인자 누락 시 실패하고 demo 가정 없이 통과한다", () => {
    const dbPath = path.join(directory, "verify.db");
    const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath },
    });
    expect(migrate.status).toBe(0);
    const seed = spawnSync("node", ["scripts/seed.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_PATH: dbPath, ALLOW_DEMO_SEED: "true" },
    });
    expect(seed.status).toBe(0);

    const missing = spawnSync("node", ["scripts/restore-db-verify.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("usage:");

    const backupPath = path.join(directory, "backup.db");
    const backup = spawnSync(
      "node",
      ["scripts/backup-db.mjs", dbPath, backupPath],
      { cwd: root, encoding: "utf8" },
    );
    expect(backup.status).toBe(0);

    const verify = spawnSync(
      "node",
      ["scripts/restore-db-verify.mjs", backupPath],
      { cwd: root, encoding: "utf8" },
    );
    expect(verify.status, verify.stderr).toBe(0);
    const payload = JSON.parse(verify.stdout.replace(/^\[restore-verify\] ok\s*/, ""));
    expect(payload.demoMode).toBe(false);
    expect(payload.demoPasswordOk).toBeNull();
    expect(payload.firmQueryOk).toBe(true);
    expect(payload.integrityOk).toBe(true);
  });
});

describe("migrate-rehearsal offline snapshot contract", () => {
  it("live WAL sidecar 가 있으면 source 복사를 거부한다", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-rehearsal-"));
    try {
      const dbPath = path.join(directory, "live.db");
      const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: dbPath },
      });
      expect(migrate.status).toBe(0);
      // close 후 checkpoint 로 -wal 이 사라질 수 있어 sidecar 를 명시적으로 둔다.
      writeFileSync(`${dbPath}-wal`, Buffer.alloc(32));
      expect(existsSync(`${dbPath}-wal`)).toBe(true);

      const rehearsal = spawnSync(
        "node",
        ["scripts/migrate-rehearsal.mjs", "--source-db", dbPath],
        { cwd: root, encoding: "utf8" },
      );
      expect(rehearsal.status).not.toBe(0);
      expect(rehearsal.stderr + rehearsal.stdout).toMatch(/wal|offline snapshot/i);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
