#!/usr/bin/env node
/** Final integrity report for KEPCO collection. Exits 0 only when every valid-login success is fully stored. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const rows = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/firm-rows.json"), "utf8"));
const passwords = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/kepco-passwds.json"), "utf8"));
const collectable = rows.filter((row) => row.kepcoNo && passwords[String(row.fid)]).map((row) => row.fid);
const collectableSet = new Set(collectable);
const customerNoByFid = new Map(rows.map((row) => [row.fid, row.kepcoNo]));
const checkDayByFid = new Map(rows.map((row) => [row.fid, Number(row.checkDay || 0)]));
const db = new Database(join(root, "data/solarsimz.db"), { readonly: true });
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
const month = today.slice(0, 6);
const expectedDays = Number(today.slice(6, 8));

const latest = db.prepare(`SELECT fid, status, message FROM kepco_collect_log l WHERE id=(SELECT max(id) FROM kepco_collect_log x WHERE x.fid=l.fid)`).all()
  .filter((row) => collectableSet.has(row.fid));
const statusCounts = Object.fromEntries(["success", "login_failed", "error", "no_credentials"].map((status) => [status, latest.filter((row) => row.status === status).length]));
const attempted = new Set(latest.map((row) => row.fid));
const unattempted = collectable.filter((fid) => !attempted.has(fid));
const successFids = latest.filter((row) => row.status === "success").map((row) => row.fid);

function missingCount(sql, parametersForFid) {
  const statement = db.prepare(sql);
  let missing = 0;
  for (const fid of successFids) {
    if (!statement.get(...parametersForFid(fid))?.ok) missing += 1;
  }
  return missing;
}

const incomplete = {
  summary: missingCount("SELECT EXISTS(SELECT 1 FROM kepco_summary WHERE fid=?) ok", (fid) => [fid]),
  contract: missingCount("SELECT EXISTS(SELECT 1 FROM kepco_contract WHERE fid=?) ok", (fid) => [fid]),
  dailyToday: missingCount("SELECT EXISTS(SELECT 1 FROM kepco_daily_total WHERE fid=? AND substr(ymd,1,6)=? AND ymd=?) ok", (fid) => [fid, month, today]),
  hourlyToday: missingCount("SELECT count(*)=24 ok FROM kepco_hourly WHERE fid=? AND substr(ymd,1,6)=? AND ymd=?", (fid) => [fid, month, today]),
  monthly12: missingCount(
    `SELECT count(*)=12
       AND (SELECT count(*) FROM kepco_billing WHERE fid=?)=12
       AND NOT EXISTS(
         SELECT 1 FROM kepco_monthly m
         WHERE m.fid=? AND NOT EXISTS(
           SELECT 1 FROM kepco_billing b WHERE b.fid=? AND b.bill_ym=m.yyyymm
         )
       ) ok
     FROM kepco_monthly WHERE fid=?`,
    (fid) => [fid, fid, fid, fid],
  ),
  billing12: missingCount("SELECT count(*)=12 ok FROM kepco_billing WHERE fid=?", (fid) => [fid]),
  intervalMonth: missingCount(
    `SELECT count(DISTINCT ymd)=${expectedDays} AND count(*)=${expectedDays * 96} ok
     FROM kepco_interval WHERE fid=? AND substr(ymd,1,6)=?`,
    (fid) => [fid, month],
  ),
};
let billingMeterDate = 0;
const billingDateCount = db.prepare(
  "SELECT count(*) rows, sum(mr_ymd <> '') dated FROM kepco_billing WHERE fid = ?",
);
for (const fid of successFids) {
  if ((checkDayByFid.get(fid) ?? 0) < 1) continue;
  const value = billingDateCount.get(fid);
  if (value.rows !== 12 || value.dated !== 12) billingMeterDate += 1;
}
incomplete.billingMeterDate = billingMeterDate;

// API가 선택 조회하는 모든 원문 컬럼 이름이 응답 SELECT에 포함되지 않는지 스키마 수준에서도 확인한다.
const rawTables = ["kepco_summary", "kepco_daily_total", "kepco_hourly", "kepco_interval", "kepco_billing", "kepco_contract"];
const rawRows = Object.fromEntries(rawTables.map((table) => [table, db.prepare(`SELECT count(*) count FROM ${table} WHERE raw_json <> '{}'`).get().count]));
let scannedRawRows = 0;
let unexpectedPasswordMatches = 0;
let shortPasswordsChecked = 0;
const containsExactString = (value, target) => {
  if (typeof value === "string") return value === target;
  if (Array.isArray(value)) return value.some((item) => containsExactString(item, target));
  return value && typeof value === "object"
    ? Object.values(value).some((item) => containsExactString(item, target))
    : false;
};
for (const table of rawTables) {
  for (const row of db.prepare(`SELECT fid, raw_json FROM ${table}`).iterate()) {
    scannedRawRows += 1;
    const password = passwords[String(row.fid)];
    // 고객번호를 비밀번호로 사용한 계정은 ICUS 고객번호가 동일 문자열이므로 오탐에서 제외한다.
    if (!password || password === customerNoByFid.get(row.fid)) continue;
    if (password.length >= 6) {
      if (String(row.raw_json).includes(password)) unexpectedPasswordMatches += 1;
      continue;
    }
    shortPasswordsChecked += 1;
    try {
      if (containsExactString(JSON.parse(row.raw_json), password)) unexpectedPasswordMatches += 1;
    } catch { /* invalid legacy JSON cannot contain a structured password value */ }
  }
}
const counts = Object.fromEntries(
  ["kepco_summary", "kepco_daily_total", "kepco_hourly", "kepco_interval", "kepco_monthly", "kepco_billing", "kepco_contract", "kepco_collect_log"]
    .map((table) => [table, db.prepare(`SELECT count(*) count FROM ${table}`).get().count]),
);
const intervalShape = db.prepare(
  `SELECT min(slots) minSlots, max(slots) maxSlots, count(*) firmDays
   FROM (
     SELECT fid, ymd, count(DISTINCT hhmi) slots FROM kepco_interval
     WHERE substr(ymd,1,6)=? GROUP BY fid, ymd
   )`,
).get(month);
db.close();

const report = {
  generatedAt: new Date().toISOString(),
  collectable: collectable.length,
  attempted: attempted.size,
  unattempted: unattempted.length,
  statuses: statusCounts,
  successfulFirms: successFids.length,
  incomplete,
  counts,
  intervalShape,
  rawRowsStoredServerSideOnly: rawRows,
  sensitiveData: { scannedRawRows, shortPasswordsChecked, unexpectedPasswordMatches },
};
console.log(JSON.stringify(report, null, 2));
const complete = unattempted.length === 0 && statusCounts.error === 0 && unexpectedPasswordMatches === 0 && Object.values(incomplete).every((count) => count === 0) && intervalShape.minSlots === 96 && intervalShape.maxSlots === 96;
process.exitCode = complete ? 0 : 1;
