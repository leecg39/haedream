#!/usr/bin/env node
/**
 * 외부/로컬 DB 에 대한 migration 011 read-only 감사.
 * orphan 삭제·rollback·force migrate 를 하지 않는다.
 *
 * 사용:
 *   node scripts/audit-migration-011.mjs --db /path/to/db [--env-alias staging] [--report out.json]
 *
 * 보고: 환경 별칭, migration 목록, orphan count, FK 상태, 테이블 row count 만.
 * 실고객 원문·경로 절대값·secret 미출력.
 */
import Database from "better-sqlite3";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  fstatSync,
  writeFileSync,
  fsyncSync,
  renameSync,
} from "node:fs";
import path from "node:path";

const MIGRATION_011 = "011_referential_integrity_and_corrections.sql";

class AuditError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function parseArgs(argv) {
  let dbPath = "";
  let envAlias = "unspecified";
  let reportPath = "";
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--db") dbPath = argv[++i] ?? "";
    else if (arg === "--env-alias") envAlias = argv[++i] ?? "";
    else if (arg === "--report") reportPath = argv[++i] ?? "";
    else if (arg.startsWith("--")) {
      throw new AuditError(`unknown flag ${arg}`);
    } else {
      throw new AuditError(`unexpected argument ${arg}`);
    }
  }
  if (!dbPath.trim()) {
    throw new AuditError(
      "usage: node scripts/audit-migration-011.mjs --db <db> [--env-alias alias] [--report out.json]",
    );
  }
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(envAlias)) {
    throw new AuditError(
      "--env-alias must be 1..64 chars of [a-zA-Z0-9._-]",
    );
  }
  return {
    dbPath: path.resolve(dbPath),
    envAlias,
    reportPath: reportPath ? path.resolve(reportPath) : "",
  };
}

function assertOfflineLeaf(dbPath) {
  const st = lstatSync(dbPath);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new AuditError("db must be a regular non-symlink file");
  }
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${dbPath}${suffix}`)) {
      throw new AuditError(
        `hot sidecar ${suffix} present; pass offline snapshot (backup/VACUUM INTO), not live WAL DB`,
      );
    }
  }
}

function tableExists(db, name) {
  return Boolean(
    db
      .prepare(
        `SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ?`,
      )
      .get(name),
  );
}

function safeCount(db, table) {
  if (!tableExists(db, table)) return null;
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
}

function writeReportAtomic(reportPath, payload) {
  const dir = path.dirname(reportPath);
  mkdirSync(dir, { recursive: true });
  if (existsSync(reportPath)) {
    const st = lstatSync(reportPath);
    if (st.isSymbolicLink() || !st.isFile()) {
      throw new AuditError("report path must be absent or a regular file");
    }
  }
  const tmp = `${reportPath}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, "wx", 0o600);
  try {
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    writeFileSync(fd, body);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, reportPath);
}

function parseArgsOrExit() {
  try {
    return parseArgs(process.argv);
  } catch (error) {
    console.error(
      `[audit-011] ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = error instanceof AuditError ? error.exitCode : 1;
    return null;
  }
}

const args = parseArgsOrExit();
if (!args) {
  // already set exitCode
} else {
  let exitCode = 0;
  try {
    assertOfflineLeaf(args.dbPath);
    const fd = openSync(args.dbPath, "r");
    let size;
    try {
      size = fstatSync(fd).size;
    } finally {
      closeSync(fd);
    }

    const db = new Database(args.dbPath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      const integrity = db.pragma("integrity_check");
      const integrityOk =
        Array.isArray(integrity) &&
        integrity.length === 1 &&
        integrity[0]?.integrity_check === "ok";

      const migrations = tableExists(db, "_migrations")
        ? db
            .prepare(`SELECT name, applied_at FROM _migrations ORDER BY name`)
            .all()
        : [];
      const has011 = migrations.some((row) => row.name === MIGRATION_011);

      const orphanCollectionJobs =
        tableExists(db, "collection_jobs") && tableExists(db, "firms")
          ? db
              .prepare(
                `SELECT COUNT(*) AS c FROM collection_jobs
                 WHERE NOT EXISTS (SELECT 1 FROM firms WHERE firms.fid = collection_jobs.fid)`,
              )
              .get().c
          : null;
      const orphanEnergyMeasurements =
        tableExists(db, "energy_measurements") && tableExists(db, "firms")
          ? db
              .prepare(
                `SELECT COUNT(*) AS c FROM energy_measurements
                 WHERE NOT EXISTS (SELECT 1 FROM firms WHERE firms.fid = energy_measurements.fid)`,
              )
              .get().c
          : null;

      const fkList = db.pragma("foreign_key_list(collection_jobs)");
      const collectionJobsFidFk = Array.isArray(fkList)
        ? fkList.some(
            (row) =>
              String(row.from) === "fid" && String(row.table) === "firms",
          )
        : false;

      const stopRecommended =
        !integrityOk ||
        (orphanCollectionJobs !== null && orphanCollectionJobs > 0) ||
        (orphanEnergyMeasurements !== null && orphanEnergyMeasurements > 0);

      const report = {
        ok: integrityOk && !stopRecommended,
        checkedAt: new Date().toISOString(),
        envAlias: args.envAlias,
        dbBytes: size,
        integrityOk,
        migration011Applied: has011,
        migration011Name: MIGRATION_011,
        migrationCount: migrations.length,
        migrationNames: migrations.map((row) => row.name),
        orphanCollectionJobs,
        orphanEnergyMeasurements,
        collectionJobsFidFk,
        counts: {
          firms: safeCount(db, "firms"),
          collection_jobs: safeCount(db, "collection_jobs"),
          energy_measurements: safeCount(db, "energy_measurements"),
          tenants: safeCount(db, "tenants"),
          users: safeCount(db, "users"),
        },
        stopRecommended,
        notes: [
          "read-only audit only; no mutate/rollback/force-migrate",
          "if orphans > 0 or integrity fail: stop and plan recovery from pre-011 backup",
          "unsafe historical 011 (silent orphan delete) cannot be retroactively repaired from current DB alone",
        ],
      };

      const text = `${JSON.stringify(report, null, 2)}\n`;
      if (args.reportPath) {
        writeReportAtomic(args.reportPath, report);
        console.log(
          JSON.stringify(
            {
              ok: report.ok,
              envAlias: report.envAlias,
              reportBasename: path.basename(args.reportPath),
              migration011Applied: report.migration011Applied,
              orphanCollectionJobs: report.orphanCollectionJobs,
              orphanEnergyMeasurements: report.orphanEnergyMeasurements,
              stopRecommended: report.stopRecommended,
            },
            null,
            2,
          ),
        );
      } else {
        process.stdout.write(text);
      }

      if (stopRecommended) exitCode = 2;
    } finally {
      db.close();
    }
  } catch (error) {
    exitCode = error instanceof AuditError ? error.exitCode : 1;
    console.error(
      `[audit-011] ${error instanceof Error ? error.message : error}`,
    );
  }
  process.exitCode = exitCode;
}
