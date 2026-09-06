import {
  mkdtempSync,
  rmSync,
  readdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { hashSync } from "bcryptjs";

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

function ensureTenantAndActor(db: Database.Database) {
  const tenant = db.prepare(`SELECT id FROM tenants LIMIT 1`).get() as
    | { id: string }
    | undefined;
  if (!tenant) {
    db.prepare(
      `INSERT INTO tenants (id, name, created_at) VALUES ('t-orphan', 'orphan-tenant', ?)`,
    ).run(new Date().toISOString());
  }
  const tenantId = (
    db.prepare(`SELECT id FROM tenants LIMIT 1`).get() as { id: string }
  ).id;
  const user = db.prepare(`SELECT id FROM users LIMIT 1`).get() as
    | { id: string }
    | undefined;
  if (!user) {
    db.prepare(
      `INSERT INTO users (id, tenant_id, username, name, role, password_hash, active, created_at, updated_at)
       VALUES ('u-orphan', ?, 'orphan', 'orphan-user', 'OPERATOR', '$2a$10$abcdefghijklmnopqrstuv', 1, ?, ?)`,
    ).run(tenantId, new Date().toISOString(), new Date().toISOString());
  }
  const actorId = (
    db.prepare(`SELECT id FROM users LIMIT 1`).get() as { id: string }
  ).id;
  return { tenantId, actorId };
}

function expect011NotApplied(db: Database.Database) {
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
    (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='collection_jobs_v2'`,
        )
        .get() as { name: string } | undefined
    )?.name,
  ).toBeUndefined();
  expect(
    (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='energy_measurements_v2'`,
        )
        .get() as { name: string } | undefined
    )?.name,
  ).toBeUndefined();
}

describe("migration 011 orphan preflight", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-mig011-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("orphan collection_jobs 만 있으면 named CHECK 로 실패하고 원본이 보존된다", () => {
    const dbPath = path.join(directory, "jobs-orphan.db");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    applyMigrationsThrough(db, "010_energy_measurements.sql");
    const { tenantId, actorId } = ensureTenantAndActor(db);

    db.pragma("foreign_keys = OFF");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, updated_at)
       VALUES ('job-orphan', ?, ?, 424242, 'single', 'current', 'QUEUED',
               0, 2, 'req-orphan', ?, ?)`,
    ).run(tenantId, actorId, now, now);
    db.pragma("foreign_keys = ON");

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
    ).toThrow(/ck_011_orphan_collection_jobs/i);

    expect011NotApplied(db);
    expect(
      (db.prepare(`SELECT COUNT(*) AS c FROM collection_jobs`).get() as { c: number })
        .c,
    ).toBe(1);
    expect(
      (
        db.prepare(`SELECT id FROM collection_jobs WHERE id = 'job-orphan'`).get() as
          | { id: string }
          | undefined
      )?.id,
    ).toBe("job-orphan");
    db.close();
  });

  it("orphan energy_measurements 만 있으면 named CHECK 로 실패하고 원본이 보존된다", () => {
    const dbPath = path.join(directory, "energy-orphan.db");
    const db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    applyMigrationsThrough(db, "010_energy_measurements.sql");
    const { tenantId } = ensureTenantAndActor(db);

    db.pragma("foreign_keys = OFF");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO energy_measurements
       (id, tenant_id, fid, meter_point, observed_at, ingested_at, source, quality, unit, value_real)
       VALUES ('m-orphan', ?, 424242, 'main', ?, ?, 'MEASURED', 'MEASURED', 'kW', 1)`,
    ).run(tenantId, now, now);
    db.pragma("foreign_keys = ON");

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
    ).toThrow(/ck_011_orphan_energy_measurements/i);

    expect011NotApplied(db);
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
          .prepare(`SELECT id FROM energy_measurements WHERE id = 'm-orphan'`)
          .get() as { id: string } | undefined
      )?.id,
    ).toBe("m-orphan");
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

  it("restore-db-verify 실패 경로도 non-zero exit 이며 db.close 후 재오픈 가능하다", () => {
    const dbPath = path.join(directory, "broken.db");
    const db = new Database(dbPath);
    db.exec("CREATE TABLE only_junk (id INTEGER)");
    db.close();

    const verify = spawnSync(
      "node",
      ["scripts/restore-db-verify.mjs", dbPath],
      { cwd: root, encoding: "utf8" },
    );
    expect(verify.status).toBe(1);
    expect(verify.stderr).toMatch(/missing table/);

    // process.exit 로 finally 를 건너뛰면 핸들이 남을 수 있음 — 재오픈으로 정리 여부를 확인.
    const reopen = new Database(dbPath);
    reopen.close();
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

  it("비데모 offline snapshot --source-db 리허설은 성공하고 --demo 직접 검증은 실패한다", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-ext-source-"));
    const reportPath = path.join(root, "docs/audit/migrate-rehearsal-latest.json");
    let previousReport: string | null = null;
    if (existsSync(reportPath)) {
      previousReport = readFileSync(reportPath, "utf8");
    }
    try {
      const seedDb = path.join(directory, "seeded.db");
      const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: seedDb },
      });
      expect(migrate.status, migrate.stderr).toBe(0);
      const seed = spawnSync("node", ["scripts/seed.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: seedDb, ALLOW_DEMO_SEED: "true" },
      });
      expect(seed.status, seed.stderr).toBe(0);

      // WAL sidecar 없는 일관된 offline snapshot
      const snapshot = path.join(directory, "offline-non-demo.db");
      const source = new Database(seedDb, { readonly: true, fileMustExist: true });
      await source.backup(snapshot);
      source.close();
      for (const side of [`${snapshot}-wal`, `${snapshot}-shm`]) {
        if (existsSync(side)) unlinkSync(side);
      }
      expect(existsSync(`${snapshot}-wal`)).toBe(false);
      expect(existsSync(`${snapshot}-shm`)).toBe(false);

      const edit = new Database(snapshot);
      edit.pragma("journal_mode = DELETE");
      const nonDemoHash = hashSync("rehearsal-not-demo", 10);
      edit
        .prepare(
          `UPDATE users
           SET username = 'ops-rehearsal', password_hash = ?
           WHERE username = 'operator'`,
        )
        .run(nonDemoHash);
      edit.close();
      for (const side of [`${snapshot}-wal`, `${snapshot}-shm`]) {
        if (existsSync(side)) unlinkSync(side);
      }

      const demoVerify = spawnSync(
        "node",
        ["scripts/restore-db-verify.mjs", snapshot, "--demo"],
        { cwd: root, encoding: "utf8" },
      );
      expect(demoVerify.status).not.toBe(0);
      expect(demoVerify.stderr).toMatch(/operator|demo/i);

      const nonDemoVerify = spawnSync(
        "node",
        ["scripts/restore-db-verify.mjs", snapshot],
        { cwd: root, encoding: "utf8" },
      );
      expect(nonDemoVerify.status, nonDemoVerify.stderr).toBe(0);

      const rehearsal = spawnSync(
        "node",
        ["scripts/migrate-rehearsal.mjs", "--source-db", snapshot],
        { cwd: root, encoding: "utf8" },
      );
      expect(rehearsal.status, rehearsal.stderr + rehearsal.stdout).toBe(0);

      const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
        externalSourceMigrated: boolean;
        externalSourceBackupRestore: boolean;
        largeDbRehearsal: string;
        failed: boolean;
      };
      expect(report.externalSourceMigrated).toBe(true);
      expect(report.externalSourceBackupRestore).toBe(true);
      expect(report.largeDbRehearsal).toBe("unverified");
      expect(report.failed).toBe(false);
    } finally {
      if (previousReport !== null) {
        writeFileSync(reportPath, previousReport);
      } else if (existsSync(reportPath)) {
        unlinkSync(reportPath);
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
