#!/usr/bin/env node
/**
 * 파워플래너 선택 월 15분 시계열 백필.
 * /rs/rs0101N_chart.do 응답의 list1(선택일)+list2(전일)를 함께 저장해 호출 수를 절반으로 줄인다.
 *
 * 실행: node scripts/kepco-backfill-interval.mjs [--month YYYYMM] [--limit N] [--request-delay MS]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const currentMonth = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 7).replace("-", "");
const args = {
  month: currentMonth,
  limit: Infinity,
  requestDelay: 700,
  firmDelay: 900,
  minFid: 0,
  maxFid: Infinity,
  worker: "main",
  order: "desc",
};
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--month") args.month = String(process.argv[++i]).replace(/\D/g, "");
  else if (process.argv[i] === "--limit") args.limit = Number(process.argv[++i]);
  else if (process.argv[i] === "--request-delay") args.requestDelay = Number(process.argv[++i]);
  else if (process.argv[i] === "--firm-delay") args.firmDelay = Number(process.argv[++i]);
  else if (process.argv[i] === "--min-fid") args.minFid = Number(process.argv[++i]);
  else if (process.argv[i] === "--max-fid") args.maxFid = Number(process.argv[++i]);
  else if (process.argv[i] === "--worker") args.worker = String(process.argv[++i]).replace(/[^a-zA-Z0-9_-]/g, "_");
  else if (process.argv[i] === "--order") args.order = process.argv[++i] === "asc" ? "asc" : "desc";
}
if (!/^\d{6}$/.test(args.month)) throw new Error("--month must be YYYYMM");

const rows = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/firm-rows.json"), "utf8"));
const passwords = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/kepco-passwds.json"), "utf8"));
const firmByFid = new Map(rows.map((row) => [row.fid, row]));
const { kepcoLogin } = await import(join(root, "src/lib/kepco/login.ts"));
const { postKepcoJson } = await import(join(root, "src/lib/kepco/client.ts"));

const db = new Database(join(root, "data/solarsimz.db"), { timeout: 15_000 });
db.pragma("busy_timeout = 15000");
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
const year = Number(args.month.slice(0, 4));
const monthNumber = Number(args.month.slice(4, 6));
const calendarEnd = new Date(year, monthNumber, 0).getDate();
const endDay = args.month === today.slice(0, 6) ? Number(today.slice(6, 8)) : calendarEnd;

const latestStatuses = new Map(
  db.prepare(`SELECT fid, status FROM kepco_collect_log l WHERE id=(SELECT max(id) FROM kepco_collect_log x WHERE x.fid=l.fid)`).all()
    .map((row) => [row.fid, row.status]),
);
const completeDayCount = db.prepare(
  `SELECT count(*) c FROM (
     SELECT ymd FROM kepco_interval
     WHERE fid=? AND substr(ymd,1,6)=?
     GROUP BY ymd HAVING count(DISTINCT hhmi)=96
   )`,
);
let queue = db.prepare("SELECT fid FROM kepco_summary ORDER BY fid DESC").all()
  .map((row) => row.fid)
  .filter((fid) => {
    if (fid < args.minFid || fid > args.maxFid) return false;
    const firm = firmByFid.get(fid);
    if (!firm?.kepcoNo || !passwords[String(fid)]) return false;
    if (latestStatuses.get(fid) === "login_failed") return false;
    return completeDayCount.get(fid, args.month).c < endDay;
  });
queue.sort((left, right) => (args.order === "asc" ? left - right : right - left));
if (Number.isFinite(args.limit)) queue = queue.slice(0, args.limit);

const insert = db.prepare(
  `INSERT INTO kepco_interval
   (fid, ymd, hhmi, collected_at, f_ap_qt, max_pwr, f_larap_qt, f_lerap_qt,
    f_larap_pf, f_lerap_pf, co2, no_data_yn, raw_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(fid, ymd, hhmi) DO UPDATE SET collected_at=excluded.collected_at,
    f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, f_larap_qt=excluded.f_larap_qt,
    f_lerap_qt=excluded.f_lerap_qt, f_larap_pf=excluded.f_larap_pf,
    f_lerap_pf=excluded.f_lerap_pf, co2=excluded.co2, no_data_yn=excluded.no_data_yn,
    raw_json=excluded.raw_json`,
);
const intervalSlots = Array.from({ length: 96 }, (_, index) => {
  const minutes = (index + 1) * 15;
  if (minutes === 24 * 60) return "2400";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}`;
});
const slotsForDay = db.prepare("SELECT hhmi FROM kepco_interval WHERE fid=? AND ymd=?");
const writeRowsAndFillMissing = db.transaction((fid, records, expectedDates) => {
  const collectedAt = new Date().toISOString();
  for (const row of records) {
    const ymd = String(row.YYMMDD ?? "");
    const hhmi = String(row.MR_HHMI ?? String(row.MR_HHMI2 ?? "").replace(":", ""));
    if (!ymd.startsWith(args.month) || !hhmi) continue;
    insert.run(fid, ymd, hhmi, collectedAt, String(row.F_AP_QT ?? ""), String(row.MAX_PWR ?? ""),
      String(row.F_LARAP_QT ?? ""), String(row.F_LERAP_QT ?? ""), String(row.F_LARAP_PF ?? ""),
      String(row.F_LERAP_PF ?? ""), String(row.CO2 ?? ""), String(row.NO_DATA_YN ?? ""), JSON.stringify(row));
  }
  for (const ymd of expectedDates) {
    const existing = new Set(slotsForDay.all(fid, ymd).map((row) => row.hhmi));
    for (const hhmi of intervalSlots) {
      if (existing.has(hhmi)) continue;
      insert.run(fid, ymd, hhmi, collectedAt, "", "", "", "", "", "", "", "Y",
        JSON.stringify({ YYMMDD: ymd, MR_HHMI: hhmi, NO_DATA_YN: "Y", source: "empty_or_partial_response" }));
    }
  }
});
const previousDay = (ymd) => {
  const date = new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)) - 1));
  return date.toISOString().slice(0, 10).replaceAll("-", "");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const progressPath = join(root, `data/kepco-interval-${args.month}-progress-${args.worker}.json`);
const progress = { startedAt: new Date().toISOString(), month: args.month, total: queue.length, processed: 0, success: 0, failed: 0, results: {} };
const save = () => writeFileSync(progressPath, JSON.stringify(progress, null, 2));
console.log(`[kepco-interval:${args.worker}] month=${args.month} endDay=${endDay} queue=${queue.length} fid=${args.minFid}..${args.maxFid === Infinity ? "∞" : args.maxFid}`);

for (let index = 0; index < queue.length; index += 1) {
  const fid = queue[index];
  const firm = firmByFid.get(fid);
  try {
    const session = await kepcoLogin(firm.kepcoNo, passwords[String(fid)]);
    const completeDays = new Set(db.prepare(
      `SELECT ymd FROM kepco_interval WHERE fid=? AND substr(ymd,1,6)=?
       GROUP BY ymd HAVING count(DISTINCT hhmi)=96`,
    ).all(fid, args.month).map((row) => row.ymd));
    const missing = new Set(Array.from({ length: endDay }, (_, day) => `${args.month}${String(day + 1).padStart(2, "0")}`).filter((ymd) => !completeDays.has(ymd)));
    let calls = 0;
    while (missing.size > 0) {
      // 가장 늦은 미수집일을 선택하면 list2(전일)까지 함께 채워 호출 수를 절반으로 감소한다.
      const selected = [...missing].sort().at(-1);
      const prior = previousDay(selected);
      const expectedDates = [selected, ...(prior.startsWith(args.month) && missing.has(prior) ? [prior] : [])];
      const request = { SELECT_DT: selected, SEL_METER_ID: "", TIME_TYPE: "15", SEL_REV_USER: "F" };
      const chart = await postKepcoJson(session, "/rs/rs0101N_chart.do", request);
      const records = [
        ...(Array.isArray(chart.list1) ? chart.list1 : []),
        ...(Array.isArray(chart.list2) ? chart.list2 : []),
      ];
      writeRowsAndFillMissing(fid, records, expectedDates);
      for (const row of records) missing.delete(String(row.YYMMDD ?? ""));
      for (const ymd of expectedDates) missing.delete(ymd);
      calls += 1;
      if (missing.size > 0) await sleep(args.requestDelay);
    }
    const storedDays = completeDayCount.get(fid, args.month).c;
    progress.success += 1;
    progress.results[fid] = { status: "success", storedDays, calls, at: new Date().toISOString() };
    console.log(`[${index + 1}/${queue.length}] fid=${fid} ${firm.firmName} → success days=${storedDays}/${endDay} calls=${calls}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.failed += 1;
    progress.results[fid] = { status: "error", message, at: new Date().toISOString() };
    console.log(`[${index + 1}/${queue.length}] fid=${fid} ${firm.firmName} → error (${message})`);
  }
  progress.processed += 1;
  save();
  if (index < queue.length - 1) await sleep(args.firmDelay);
}
save();
console.log(`[kepco-interval] 완료 success=${progress.success} failed=${progress.failed}`);
db.close();
