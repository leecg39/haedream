#!/usr/bin/env node
/**
 * 승인 측정 CSV dry-run / apply / reconcile CLI.
 *
 * dry-run/reconcile: offline snapshot 권장. hot sidecar 거부. symlink 거부.
 *   O_RDONLY(+O_NOFOLLOW) FD → fstat 전후 불변 → mode 0600 temp 복사 → hash 확인.
 *   원본 옆 sidecar 를 만들지 않는다. 외부 writer race 는 완전 제거 불가로 문서화.
 * apply: RW + fileMustExist, symlink 거부, 자동 migrate 없음.
 *
 * 인자 형식 검증은 DB open/temp copy 전에 수행한다.
 * 실패 시 stdout 비민감 JSON. stderr 에 stack/절대경로/secret 없음.
 */
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import Database from "better-sqlite3";
import { openGuardedApplyDatabase } from "./lib/measurement-db-guard.mjs";

const VALUE_FLAGS = new Set([
  "--db",
  "--tenant",
  "--fid",
  "--csv",
  "--actor",
  "--calculation-version",
  "--expected-sha256",
  "--report",
]);
const BOOL_FLAGS = new Set(["--apply", "--reconcile"]);

const TENANT_RE = /^[A-Za-z0-9._-]{1,128}$/;
const ACTOR_RE = /^[A-Za-z0-9._:@/-]{1,128}$/;
const CALC_VERSION_RE = /^[A-Za-z0-9._-]{1,64}$/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
/** 1 이상, leading zero 금지 */
const FID_RE = /^[1-9]\d*$/;

function sanitizeMessage(message) {
  return String(message ?? "measurement csv import failed")
    .replace(/\/[^\s:]+/g, "[path]")
    .replace(/\\[^\s:]+/g, "[path]")
    .slice(0, 200);
}

function emitAndExit(report, code) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(code);
}

function parseCliArgs(argv) {
  const seen = new Set();
  const values = Object.create(null);
  const bools = Object.create(null);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      const error = new Error("unknown argument");
      error.code = "CLI_UNKNOWN_ARG";
      throw error;
    }
    if (seen.has(token)) {
      const error = new Error("duplicate flag");
      error.code = "CLI_DUPLICATE_FLAG";
      throw error;
    }
    seen.add(token);

    if (BOOL_FLAGS.has(token)) {
      bools[token] = true;
      continue;
    }
    if (VALUE_FLAGS.has(token)) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        const error = new Error("missing flag value");
        error.code = "CLI_MISSING_VALUE";
        throw error;
      }
      values[token] = next;
      index += 1;
      continue;
    }
    const error = new Error("unknown flag");
    error.code = "CLI_UNKNOWN_FLAG";
    throw error;
  }

  for (const name of [
    "--db",
    "--tenant",
    "--fid",
    "--csv",
    "--actor",
    "--calculation-version",
  ]) {
    if (!values[name] || !String(values[name]).trim()) {
      const error = new Error("missing required flag");
      error.code = "CLI_MISSING_REQUIRED";
      throw error;
    }
  }

  if (bools["--apply"] && bools["--reconcile"]) {
    const error = new Error("mode conflict");
    error.code = "CLI_MODE_CONFLICT";
    throw error;
  }

  const tenantId = String(values["--tenant"]).trim();
  const actor = String(values["--actor"]).trim();
  const calculationVersion = String(values["--calculation-version"]).trim();
  const expectedSha256 = values["--expected-sha256"]
    ? String(values["--expected-sha256"]).trim()
    : undefined;
  const fidRaw = String(values["--fid"]).trim();

  if (!TENANT_RE.test(tenantId)) {
    const error = new Error("invalid tenant");
    error.code = "CLI_INVALID_TENANT";
    throw error;
  }
  if (!ACTOR_RE.test(actor)) {
    const error = new Error("invalid actor");
    error.code = "CLI_INVALID_ACTOR";
    throw error;
  }
  if (!CALC_VERSION_RE.test(calculationVersion)) {
    const error = new Error("invalid calculation version");
    error.code = "CLI_INVALID_CALCULATION_VERSION";
    throw error;
  }
  if (expectedSha256 !== undefined && !SHA256_HEX_RE.test(expectedSha256)) {
    const error = new Error("invalid expected sha256");
    error.code = "CLI_INVALID_EXPECTED_SHA256";
    throw error;
  }
  if (!FID_RE.test(fidRaw)) {
    const error = new Error("invalid fid");
    error.code = "CLI_INVALID_FID";
    throw error;
  }
  const fid = Number(fidRaw);
  if (!Number.isSafeInteger(fid) || fid < 1) {
    const error = new Error("invalid fid");
    error.code = "CLI_INVALID_FID";
    throw error;
  }

  const mode = bools["--apply"]
    ? "apply"
    : bools["--reconcile"]
      ? "reconcile"
      : "dry-run";

  return {
    dbPath: String(values["--db"]).trim(),
    tenantId,
    fid,
    csvPath: String(values["--csv"]).trim(),
    actor,
    calculationVersion,
    expectedSha256,
    reportPath: values["--report"] ? String(values["--report"]).trim() : undefined,
    mode,
  };
}

function assertNoSidecars(absolute) {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${absolute}${suffix}`)) {
      const error = new Error(
        "database has hot sidecars; use an offline checkpointed snapshot",
      );
      error.code = "DB_HOT_SIDECARS";
      throw error;
    }
  }
}

function assertRegularDbFile(absolute) {
  let st;
  try {
    st = lstatSync(absolute);
  } catch {
    const error = new Error("database file does not exist");
    error.code = "DB_NOT_FOUND";
    throw error;
  }
  // Leaf symlink only. Intermediate dir symlinks (e.g. macOS /var -> /private/var)
  // are allowed; O_NOFOLLOW still fails if the leaf races into a symlink.
  if (st.isSymbolicLink()) {
    const error = new Error("database path must not be a symlink");
    error.code = "DB_SYMLINK";
    throw error;
  }
  if (!st.isFile()) {
    const error = new Error("database path must be a regular file");
    error.code = "DB_NOT_REGULAR";
    throw error;
  }
}

function copyFdToTemp(fd, beforeStat, tempDbPath) {
  const outFd = openSync(
    tempDbPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
    0o600,
  );
  const hash = createHash("sha256");
  const buf = Buffer.alloc(64 * 1024);
  let position = 0;
  let total = 0;
  try {
    for (;;) {
      const n = readSync(fd, buf, 0, buf.length, position);
      if (n === 0) break;
      writeSync(outFd, buf, 0, n);
      hash.update(buf.subarray(0, n));
      position += n;
      total += n;
    }
    fsyncSync(outFd);
  } finally {
    try {
      closeSync(outFd);
    } catch {
      // ignore
    }
  }
  if (total !== beforeStat.size) {
    const error = new Error("database copy size mismatch");
    error.code = "DB_COPY_SIZE_MISMATCH";
    throw error;
  }
  return hash.digest("hex");
}

function hashFd(fd, size) {
  const hash = createHash("sha256");
  const buf = Buffer.alloc(64 * 1024);
  let position = 0;
  let total = 0;
  for (;;) {
    const n = readSync(fd, buf, 0, buf.length, position);
    if (n === 0) break;
    hash.update(buf.subarray(0, n));
    position += n;
    total += n;
  }
  if (total !== size) {
    const error = new Error("database changed during hash");
    error.code = "DB_CHANGED_DURING_COPY";
    throw error;
  }
  return hash.digest("hex");
}

/**
 * dry-run/reconcile snapshot open (TOCTOU 완화).
 * 외부 writer race 는 완전 제거 불가 — 오프라인 snapshot 을 요구한다.
 */
function openReadonlySnapshot(absolute) {
  assertRegularDbFile(absolute);
  assertNoSidecars(absolute);

  const openFlags =
    constants.O_RDONLY |
    (typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0);

  let fd = null;
  let tempDir = null;
  try {
    fd = openSync(absolute, openFlags);
    const before = fstatSync(fd);
    assertNoSidecars(absolute);

    tempDir = mkdtempSync(path.join(tmpdir(), "solarsimz-meas-ro-"));
    const tempDb = path.join(
      tempDir,
      `snapshot-${randomBytes(4).toString("hex")}.db`,
    );
    const copyHash = copyFdToTemp(fd, before, tempDb);

    const after = fstatSync(fd);
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs
    ) {
      const error = new Error("database changed during copy");
      error.code = "DB_CHANGED_DURING_COPY";
      throw error;
    }
    assertNoSidecars(absolute);

    const originHash = hashFd(fd, before.size);
    if (originHash !== copyHash) {
      const error = new Error("database copy hash mismatch");
      error.code = "DB_COPY_HASH_MISMATCH";
      throw error;
    }

    const db = new Database(tempDb, { readonly: true, fileMustExist: true });
    db.pragma("query_only = ON");
    return { db, tempDir };
  } catch (error) {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    throw error;
  } finally {
    if (fd != null) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

function openImportDatabase(dbPath, mode) {
  const absolute = path.resolve(dbPath);
  if (!existsSync(absolute)) {
    const error = new Error("database file does not exist");
    error.code = "DB_NOT_FOUND";
    throw error;
  }

  let handle;
  try {
    if (mode !== "apply") {
      handle = openReadonlySnapshot(absolute);
    } else {
      // apply: O_RDWR|O_NOFOLLOW guard FD → SQLite open → lstat/fstat 재확인
      // → guard close. SQLite 는 열린 inode 를 유지해 이후 pathname 교체가
      // write target 을 바꾸지 않는다 (scripts/lib/measurement-db-guard.mjs).
      handle = openGuardedApplyDatabase(absolute, { Database });
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("DB_")
    ) {
      throw error;
    }
    const wrapped = new Error("failed to open database");
    wrapped.code = "DB_OPEN_FAILED";
    throw wrapped;
  }

  try {
    const table = handle.db
      .prepare(
        `SELECT 1 AS ok FROM sqlite_master
         WHERE type = 'table' AND name = 'energy_measurements'`,
      )
      .get();
    if (!table) {
      closeImportDatabase(handle);
      const error = new Error("database schema missing; run migrations first");
      error.code = "DB_SCHEMA_MISSING";
      throw error;
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("DB_")
    ) {
      throw error;
    }
    closeImportDatabase(handle);
    const wrapped = new Error("failed to open database");
    wrapped.code = "DB_OPEN_FAILED";
    throw wrapped;
  }
  return handle;
}

function closeImportDatabase(handle) {
  if (!handle) return;
  try {
    handle.db.close();
  } catch {
    // ignore
  }
  if (handle.tempDir) {
    try {
      rmSync(handle.tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

const here = fileURLToPath(import.meta.url);
const hooks = fileURLToPath(new URL("./register-worker-hooks.mjs", import.meta.url));

if (process.env.MEASUREMENT_CSV_BOOTSTRAPPED !== "1") {
  const result = spawnSync(
    process.execPath,
    ["--import", pathToFileURL(hooks).href, here, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MEASUREMENT_CSV_BOOTSTRAPPED: "1",
      },
    },
  );
  process.exit(result.status ?? 1);
}

const {
  runMeasurementCsvImport,
  writeReportAtomic,
  measurementImportErrorReport,
} = await import(
  pathToFileURL(
    fileURLToPath(new URL("../src/features/energy/measurement-csv-import.ts", import.meta.url)),
  ).href
);
const { AppError } = await import(
  pathToFileURL(fileURLToPath(new URL("../src/lib/errors.ts", import.meta.url))).href
);

let args;
try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  emitAndExit(
    measurementImportErrorReport({
      mode: "dry-run",
      sourceSha256: "",
      tenantId: "",
      fid: 0,
      actor: "",
      calculationVersion: "",
      errorCode: error?.code ?? "CLI_INVALID",
      errorMessage: sanitizeMessage(error?.message ?? "invalid arguments"),
    }),
    1,
  );
}

let dbHandle = null;
let sourceSha256 = "";
try {
  // CSV hash 를 한 번만 계산해 오류 경로 재읽기/교체 race 를 피한다.
  try {
    sourceSha256 = createHash("sha256")
      .update(readFileSync(path.resolve(args.csvPath)))
      .digest("hex");
  } catch {
    sourceSha256 = "";
  }

  // 인자 검증은 이미 parseCliArgs 에서 DB open 전에 완료됨.
  dbHandle = openImportDatabase(args.dbPath, args.mode);
  let report = runMeasurementCsvImport({
    db: dbHandle.db,
    csvPath: args.csvPath,
    tenantId: args.tenantId,
    fid: args.fid,
    actor: args.actor,
    calculationVersion: args.calculationVersion,
    mode: args.mode,
    expectedSha256: args.expectedSha256,
    reportPath: args.reportPath,
  });
  if (args.mode === "reconcile" && report.mismatchCount > 0) {
    report = {
      ...report,
      ok: false,
      errorCode: "RECONCILE_MISMATCH",
      errorMessage: "DB 재대조 mismatch 가 있습니다.",
    };
    if (args.reportPath) {
      try {
        writeReportAtomic(args.reportPath, report);
      } catch {
        // ignore
      }
    }
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
} catch (error) {
  const code =
    error instanceof AppError
      ? error.code
      : typeof error?.code === "string"
        ? error.code
        : "IMPORT_FAILED";
  const message =
    error instanceof AppError
      ? error.message
      : sanitizeMessage(error?.message ?? "measurement csv import failed");
  const report = measurementImportErrorReport({
    mode: args.mode,
    sourceSha256,
    tenantId: args.tenantId,
    fid: args.fid,
    actor: args.actor,
    calculationVersion: args.calculationVersion,
    errorCode: code,
    errorMessage: message,
    counts: {
      inserted: 0,
      unchanged: 0,
      corrected: 0,
      rejected: code.startsWith("CSV_") || code === "CSV_SHA256_MISMATCH" ? 1 : 0,
    },
  });
  if (args.reportPath) {
    try {
      writeReportAtomic(args.reportPath, report);
    } catch {
      // ignore
    }
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  closeImportDatabase(dbHandle);
}
