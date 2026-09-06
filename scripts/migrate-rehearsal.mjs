#!/usr/bin/env node
/**
 * 빈 DB·시드 DB·(선택) 외부 지정 기존 DB 사본에 마이그레이션 리허설.
 *
 * 사용:
 *   node scripts/migrate-rehearsal.mjs
 *   node scripts/migrate-rehearsal.mjs --source-db /path/to/existing-copy.db
 *   MIGRATE_REHEARSAL_SOURCE_DB=/path/to/copy node scripts/migrate-rehearsal.mjs
 *
 * 1.15GB급 운영 사본이 없으면 largeDbRehearsal=unverified 로 기록하고
 * 완료(complete)처럼 꾸미지 않는다. 외부 HTTP/한전 호출은 하지 않는다.
 */
import {
  mkdtempSync,
  rmSync,
  copyFileSync,
  existsSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LARGE_DB_BYTES = 1_000_000_000; // ~1GB 이상이면 large copy 로 본다.

function parseArgs(argv) {
  let sourceDb = process.env.MIGRATE_REHEARSAL_SOURCE_DB ?? "";
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === "--source-db") {
      sourceDb = argv[++index] ?? "";
    }
  }
  return { sourceDb: sourceDb ? path.resolve(sourceDb) : "" };
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
    console.error(
      `[migrate-rehearsal] ${label} failed`,
      result.stderr || result.stdout,
    );
    process.exit(result.status ?? 1);
  }
  console.log(`[migrate-rehearsal] ${label} ok in ${elapsedMs}ms`);
  return elapsedMs;
}

function backupAndRestore(label, dbPath, workDir) {
  const backupPath = path.join(workDir, `${label}-backup.db`);
  const backup = spawnSync(
    "node",
    ["scripts/backup-db.mjs", dbPath, backupPath],
    { cwd: root, encoding: "utf8" },
  );
  if (backup.status !== 0) {
    console.error(`[migrate-rehearsal] ${label} backup failed`, backup.stderr);
    process.exit(backup.status ?? 1);
  }
  const verify = spawnSync(
    "node",
    ["scripts/restore-db-verify.mjs", backupPath],
    { cwd: root, encoding: "utf8" },
  );
  if (verify.status !== 0) {
    console.error(
      `[migrate-rehearsal] ${label} restore-verify failed`,
      verify.stderr || verify.stdout,
    );
    process.exit(verify.status ?? 1);
  }
  console.log(`[migrate-rehearsal] ${label} backup/restore ok`);
}

const args = parseArgs(process.argv);
const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-migrate-"));
const report = {
  checkedAt: new Date().toISOString(),
  emptyDb: false,
  seededDb: false,
  externalSourceDb: args.sourceDb || null,
  largeDbRehearsal: "unverified",
  largeDbBytes: null,
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
    console.error("[migrate-rehearsal] seed failed", seed.stderr || seed.stdout);
    process.exit(seed.status ?? 1);
  }
  run("seeded-rerun", { DATABASE_PATH: seededDb });
  backupAndRestore("seeded", seededDb, directory);
  report.seededDb = true;

  const candidates = [];
  if (args.sourceDb) candidates.push(args.sourceDb);
  const localApp = path.join(root, "data/app.db");
  if (existsSync(localApp)) candidates.push(localApp);

  let largeVerified = false;
  for (const source of candidates) {
    if (!existsSync(source)) {
      report.notes.push(`source missing: ${source}`);
      continue;
    }
    const bytes = statSync(source).size;
    const copyPath = path.join(
      directory,
      `copy-${path.basename(source).replace(/[^\w.-]+/g, "_")}`,
    );
    copyFileSync(source, copyPath);
    run(`source-copy:${path.basename(source)}`, { DATABASE_PATH: copyPath });
    run(`source-copy-rerun:${path.basename(source)}`, {
      DATABASE_PATH: copyPath,
    });
    // 시드가 있는 사본만 backup/restore 전체 검증. 빈/부분 사본은 migrate만.
    try {
      backupAndRestore(`source:${path.basename(source)}`, copyPath, directory);
    } catch {
      report.notes.push(`backup/restore skipped or failed for ${source}`);
    }
    if (bytes >= LARGE_DB_BYTES) {
      report.largeDbBytes = bytes;
      report.largeDbRehearsal = "verified";
      largeVerified = true;
    } else {
      report.notes.push(
        `source ${source} size=${bytes} < ${LARGE_DB_BYTES}; not counted as 1.15GB rehearsal`,
      );
    }
  }

  if (!largeVerified) {
    report.largeDbRehearsal = "unverified";
    report.notes.push(
      "1.15GB-class DB copy was not provided. Pass --source-db <path> or MIGRATE_REHEARSAL_SOURCE_DB.",
    );
    console.log(
      "[migrate-rehearsal] large DB rehearsal UNVERIFIED (no >=1GB source copy)",
    );
  }

  const outDir = path.join(root, "docs/audit");
  mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "migrate-rehearsal-latest.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[migrate-rehearsal] report ${reportPath}`);
  console.log(
    `[migrate-rehearsal] finished empty=${report.emptyDb} seeded=${report.seededDb} large=${report.largeDbRehearsal}`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
