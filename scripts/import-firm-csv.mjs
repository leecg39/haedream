#!/usr/bin/env node
/** 실제 CSV를 비공개 DB로 반영한다. 클라이언트 JSON/정적 파일을 생성하지 않는다. */
import { lstatSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

if (process.env.FIRM_IMPORT_BOOTSTRAPPED !== "1") {
  const result = spawnSync(process.execPath, ["--import", fileURLToPath(new URL("./register-worker-hooks.mjs", import.meta.url)), fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit", env: { ...process.env, FIRM_IMPORT_BOOTSTRAPPED: "1" },
  });
  process.exit(result.status ?? 1);
}
const { importFirmCsv, FirmCsvError } = await import("../src/features/firms/csv-import.server.ts");
let db;
try {
  const args = {};
  const allowed = new Set(["--csv", "--db", "--tenant", "--actor", "--expected-sha256", "--apply"]);
  for (let i = 2; i < process.argv.length; i += 1) {
    const key = process.argv[i];
    if (!allowed.has(key) || key in args) throw new FirmCsvError("지원하지 않거나 중복된 인자입니다.");
    args[key] = key === "--apply" ? true : process.argv[++i];
  }
  for (const key of ["--csv", "--db", "--tenant", "--actor", "--expected-sha256"]) {
    if (typeof args[key] !== "string" || !args[key] || args[key].startsWith("--")) throw new FirmCsvError("--csv --db --tenant --actor --expected-sha256가 필요합니다. 기본은 dry-run입니다.");
  }
  for (const key of ["--csv", "--db"]) {
    const st = lstatSync(args[key]);
    if (!st.isFile() || st.isSymbolicLink() || (st.mode & 0o777) !== 0o600) throw new FirmCsvError("입력 CSV와 DB는 0600 권한의 일반 파일이어야 합니다.");
  }
  const text = readFileSync(args["--csv"], "utf8");
  const { createHash } = await import("node:crypto");
  if (createHash("sha256").update(text).digest("hex") !== args["--expected-sha256"]) throw new FirmCsvError("CSV 해시가 일치하지 않습니다.");
  db = new Database(args["--db"], { readonly: args["--apply"] !== true, fileMustExist: true });
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 10000");
  const result = importFirmCsv({ db, text, tenantId: args["--tenant"], actorId: args["--actor"], apply: args["--apply"] === true });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error instanceof FirmCsvError ? error.message : "업체 가져오기에 실패했습니다. DB 스키마·입력 파일·키 설정을 확인해 주세요." }));
  process.exitCode = 1;
} finally { db?.close(); }
