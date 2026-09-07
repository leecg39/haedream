#!/usr/bin/env node
/**
 * 빈 DB·시드 DB·(선택) 외부 지정 offline snapshot 에 마이그레이션 리허설.
 *
 * 사용:
 *   node scripts/migrate-rehearsal.mjs
 *   node scripts/migrate-rehearsal.mjs --source-db /path/to/offline-snapshot.db
 *   node scripts/migrate-rehearsal.mjs --source-db /outside/snapshot.db --report /outside/evidence/rehearsal.json
 *   MIGRATE_REHEARSAL_SOURCE_DB=/path/to/copy node scripts/migrate-rehearsal.mjs
 *
 * --source-db 는 live WAL DB 가 아니라 offline/consistent snapshot 이어야 한다.
 * 복사에는 SQLite backup API 를 쓰고 integrity_check 로 검증한다.
 * 외부 입력 runner는 --report로 저장소 밖 불변 증거를 사용한다.
 *
 * 1.15GB급 운영 사본이 없으면 largeDbRehearsal=unverified 로 기록하고
 * 완료(complete)처럼 꾸미지 않는다. 외부 HTTP/한전 호출은 하지 않는다.
 */
import Database from "better-sqlite3";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  assertOutsideRepoPath,
  ensureEvidenceDir,
  writeEvidenceAtomic,
} from "./lib/ops-external-input-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LARGE_DB_BYTES = 1_000_000_000; // ~1GB 이상이면 large copy 로 본다.

class RehearsalError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function parseArgs(argv) {
  let sourceDb = process.env.MIGRATE_REHEARSAL_SOURCE_DB ?? "";
  let reportPath = "";
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--source-db") {
      sourceDb = argv[++index] ?? "";
    } else if (argv[index] === "--report") {
      reportPath = argv[++index] ?? "";
      if (!reportPath) throw new RehearsalError("--report requires a path");
    }
  }
  if (reportPath) {
    const target = assertOutsideRepoPath(reportPath, "report", { mustExist: false });
    ensureEvidenceDir(path.dirname(target.resolved));
    if (existsSync(target.resolved)) throw new RehearsalError("report already exists");
    reportPath = target.resolved;
  }
  return { sourceDb: sourceDb ? path.resolve(sourceDb) : "", reportPath };
}

function saveReport(report) {
  if (args.reportPath) {
    writeEvidenceAtomic(args.reportPath, report);
    return;
  }
  const outDir = path.join(root, "docs/audit");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "migrate-rehearsal-latest.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function run(label, env) {
  const started = Date.now();
  const result = spawnSync("node", ["scripts/migrate.mjs"], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const elapsedMs = Date.now() - started;
  if (result.status !== 0) {
    throw new RehearsalError(
      `${label} failed: ${result.stderr || result.stdout}`,
      result.status ?? 1,
    );
  }
  console.log(`[migrate-rehearsal] ${label} ok in ${elapsedMs}ms`);
  return elapsedMs;
}

function assertOfflineSnapshot(sourcePath) {
  const wal = `${sourcePath}-wal`;
  const shm = `${sourcePath}-shm`;
  if (existsSync(wal) || existsSync(shm)) {
    throw new RehearsalError(
      `source ${path.basename(sourcePath)} has -wal/-shm sidecars; pass an offline snapshot (SQLite backup/VACUUM INTO copy), not a live DB path`,
    );
  }
}

async function consistentCopy(sourcePath, destPath) {
  assertOfflineSnapshot(sourcePath);
  const source = new Database(sourcePath, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await source.backup(destPath);
  } finally {
    source.close();
  }
  const verify = new Database(destPath, { readonly: true, fileMustExist: true });
  try {
    const integrity = verify.pragma("integrity_check");
    const ok =
      Array.isArray(integrity) &&
      integrity.length === 1 &&
      integrity[0]?.integrity_check === "ok";
    if (!ok) {
      throw new RehearsalError(
        `integrity_check failed after backup copy of ${path.basename(sourcePath)}: ${JSON.stringify(integrity)}`,
      );
    }
  } finally {
    verify.close();
  }
}

/**
 * @param {string} label
 * @param {string} dbPath
 * @param {string} workDir
 * @param {{ demo?: boolean }} [options]
 * seeded 내부 리허설만 demo 검증(--demo). 외부 --source-db snapshot 은 비데모 검증.
 */
function backupAndRestore(label, dbPath, workDir, options = {}) {
  const demo = options.demo === true;
  const backupPath = path.join(workDir, `${label}-backup.db`);
  const backup = spawnSync(
    "node",
    ["scripts/backup-db.mjs", dbPath, backupPath],
    { cwd: root, encoding: "utf8" },
  );
  if (backup.status !== 0) {
    throw new RehearsalError(
      `${label} backup failed: ${backup.stderr || backup.stdout}`,
      backup.status ?? 1,
    );
  }
  const verifyArgs = ["scripts/restore-db-verify.mjs", backupPath];
  if (demo) verifyArgs.push("--demo");
  const verify = spawnSync("node", verifyArgs, {
    cwd: root,
    encoding: "utf8",
  });
  if (verify.status !== 0) {
    throw new RehearsalError(
      `${label} restore-verify failed: ${verify.stderr || verify.stdout}`,
      verify.status ?? 1,
    );
  }
  console.log(
    `[migrate-rehearsal] ${label} backup/restore ok (demoVerify=${demo})`,
  );
}

const args = parseArgs(process.argv);
const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-migrate-"));
const report = {
  checkedAt: new Date().toISOString(),
  emptyDb: false,
  seededDb: false,
  seededBackupRestore: false,
  externalSourceDb: args.sourceDb ? path.basename(args.sourceDb) : null,
  externalSourceMigrated: false,
  externalSourceBackupRestore: false,
  largeDbRehearsal: "unverified",
  largeDbBytes: null,
  failed: false,
  notes: [],
};

try {
  const emptyDb = path.join(directory, "empty.db");
  run("empty-db", { DATABASE_PATH: emptyDb });
  run("empty-db-rerun", { DATABASE_PATH: emptyDb });
  report.emptyDb = true;

  const seededDb = path.join(directory, "seeded.db");
  run("seeded-migrate", { DATABASE_PATH: seededDb });
  const seed = spawnSync("node", ["scripts/seed.mjs"], {
    cwd: root,
    env: { ...process.env, DATABASE_PATH: seededDb, ALLOW_DEMO_SEED: "true" },
    encoding: "utf8",
  });
  if (seed.status !== 0) {
    throw new RehearsalError(
      `seed failed: ${seed.stderr || seed.stdout}`,
      seed.status ?? 1,
    );
  }
  run("seeded-rerun", { DATABASE_PATH: seededDb });
  backupAndRestore("seeded", seededDb, directory, { demo: true });
  report.seededDb = true;
  report.seededBackupRestore = true;

  const candidates = [];
  if (args.sourceDb) candidates.push(args.sourceDb);
  // local data/app.db 는 live WAL 위험이 있어 자동 후보에 넣지 않는다.
  // 명시적 --source-db / env 만 offline snapshot 으로 허용한다.

  let largeVerified = false;
  for (const source of candidates) {
    if (!existsSync(source)) {
      report.notes.push(`source missing: ${path.basename(source)}`);
      report.failed = true;
      throw new RehearsalError(`source missing: ${path.basename(source)}`);
    }
    const bytes = statSync(source).size;
    const copyPath = path.join(
      directory,
      `copy-${path.basename(source).replace(/[^\w.-]+/g, "_")}`,
    );
    await consistentCopy(source, copyPath);
    run(`source-copy:${path.basename(source)}`, { DATABASE_PATH: copyPath });
    run(`source-copy-rerun:${path.basename(source)}`, {
      DATABASE_PATH: copyPath,
    });
    report.externalSourceMigrated = true;
    // 외부 offline snapshot 은 operator/"demo" 를 가정하지 않는다.
    backupAndRestore(`source:${path.basename(source)}`, copyPath, directory, {
      demo: false,
    });
    report.externalSourceBackupRestore = true;
    if (bytes >= LARGE_DB_BYTES) {
      report.largeDbBytes = bytes;
      report.largeDbRehearsal = "verified";
      largeVerified = true;
    } else {
      report.notes.push(
        `source ${path.basename(source)} size=${bytes} < ${LARGE_DB_BYTES}; not counted as 1.15GB rehearsal`,
      );
    }
  }

  if (!largeVerified) {
    report.largeDbRehearsal = "unverified";
    report.notes.push(
      "1.15GB-class DB copy was not provided. Pass --source-db <offline-snapshot> or MIGRATE_REHEARSAL_SOURCE_DB.",
    );
    console.log(
      "[migrate-rehearsal] large DB rehearsal UNVERIFIED (no >=1GB offline snapshot)",
    );
  }

  saveReport(report);
  console.log(
    `[migrate-rehearsal] finished empty=${report.emptyDb} seeded=${report.seededDb} large=${report.largeDbRehearsal}`,
  );
} catch (error) {
  report.failed = true;
  report.notes.push(error instanceof Error ? error.message : String(error));
  saveReport(report);
  console.error(
    `[migrate-rehearsal] FAILED: ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = error instanceof RehearsalError ? error.exitCode : 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
