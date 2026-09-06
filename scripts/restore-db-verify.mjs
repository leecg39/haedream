#!/usr/bin/env node
/**
 * 백업 DB를 별도 경로에 열어 핵심 테이블 건수와 로그인 가능 사용자를 검사한다.
 * 사용: node scripts/restore-db-verify.mjs backup.db
 */
import Database from "better-sqlite3";
import path from "node:path";

const backupPath = path.resolve(process.argv[2] ?? "");
if (!backupPath) {
  console.error("usage: node scripts/restore-db-verify.mjs <backup.db>");
  process.exit(1);
}

const db = new Database(backupPath, { readonly: true, fileMustExist: true });
const required = ["firms", "users", "tenants", "tenant_firm_access", "sessions"];
for (const table of required) {
  const row = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
  ).get(table);
  if (!row) {
    console.error(`[restore-verify] missing table ${table}`);
    process.exit(1);
  }
}

const counts = Object.fromEntries(
  ["firms", "users", "tenants", "tenant_firm_access"].map((table) => [
    table,
    db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
  ]),
);
const operator = db
  .prepare(
    `SELECT username, role, active FROM users
     WHERE username = 'operator' AND active = 1 LIMIT 1`,
  )
  .get();

if (!operator) {
  console.error("[restore-verify] active operator user missing");
  process.exit(1);
}
if (counts.firms < 1 || counts.users < 1) {
  console.error("[restore-verify] empty core tables", counts);
  process.exit(1);
}

console.log("[restore-verify] ok", { counts, operator: operator.username });
db.close();
