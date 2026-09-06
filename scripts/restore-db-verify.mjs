#!/usr/bin/env node
/**
 * 백업 DB를 별도 경로에 열어 인증 자료·업체·한전 요약 무결성을 검사한다.
 * 사용: node scripts/restore-db-verify.mjs backup.db
 *
 * 비밀번호 원문은 출력하지 않는다. hash 존재·형식·(옵션) 검증만 수행한다.
 */
import Database from "better-sqlite3";
import { compareSync } from "bcryptjs";
import path from "node:path";

const backupPath = path.resolve(process.argv[2] ?? "");
if (!backupPath) {
  console.error("usage: node scripts/restore-db-verify.mjs <backup.db>");
  process.exit(1);
}

const db = new Database(backupPath, { readonly: true, fileMustExist: true });
const required = [
  "firms",
  "users",
  "tenants",
  "tenant_firm_access",
  "sessions",
  "kepco_summary",
];
for (const table of required) {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(table);
  if (!row) {
    console.error(`[restore-verify] missing table ${table}`);
    process.exit(1);
  }
}

const counts = Object.fromEntries(
  ["firms", "users", "tenants", "tenant_firm_access", "kepco_summary", "sessions"].map(
    (table) => [
      table,
      db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
    ],
  ),
);

const authUsers = db
  .prepare(
    `SELECT username, role, active, password_hash,
            length(password_hash) AS hash_len
     FROM users
     WHERE active = 1
     ORDER BY username`,
  )
  .all();

if (authUsers.length < 1) {
  console.error("[restore-verify] no active users");
  process.exit(1);
}

for (const user of authUsers) {
  if (!user.password_hash || user.hash_len < 20) {
    console.error(`[restore-verify] auth material incomplete for role=${user.role}`);
    process.exit(1);
  }
  if (!String(user.password_hash).startsWith("$2")) {
    console.error(`[restore-verify] unexpected password hash format for role=${user.role}`);
    process.exit(1);
  }
}

// 시드 데모 계정이 있으면 해시 검증만 하고 비밀번호는 로그에 남기지 않는다.
const demoOperator = authUsers.find((row) => row.username === "operator");
if (demoOperator) {
  const ok = compareSync("demo", demoOperator.password_hash);
  if (!ok) {
    console.error("[restore-verify] operator password hash failed integrity check");
    process.exit(1);
  }
}

const firmSample = db
  .prepare(
    `SELECT f.fid, f.firm_name AS firmName
     FROM firms f
     LIMIT 3`,
  )
  .all();
if (firmSample.length < 1 && counts.firms > 0) {
  console.error("[restore-verify] firm query failed despite non-zero count");
  process.exit(1);
}

const kepcoSample = db
  .prepare(
    `SELECT fid, collected_at AS collectedAt
     FROM kepco_summary
     ORDER BY collected_at DESC
     LIMIT 3`,
  )
  .all();

if (counts.firms < 1 || counts.users < 1) {
  console.error("[restore-verify] empty core tables", counts);
  process.exit(1);
}

console.log(
  "[restore-verify] ok",
  JSON.stringify({
    counts,
    activeUsers: authUsers.length,
    authHashOk: true,
    firmQueryOk: firmSample.length >= 0,
    kepcoSummaryQueryOk: true,
    kepcoSummaryRows: kepcoSample.length,
  }),
);
db.close();
