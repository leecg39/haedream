#!/usr/bin/env node
/**
 * 한전 파워플래너 전 업체 배치 수집기 (self-contained).
 *
 * 업체관리(firm-rows.json)의 한전고객번호 + 로컬 비밀번호(kepco-passwds.json)를 사용해
 * pp.kepco.co.kr 에 업체별로 로그인하고, 요약/시간대별/월별 데이터를 SQLite(data/solarsimz.db)에 적재한다.
 *
 * `@/lib/*` 경로 별칭은 순수 node 에서 해석되지 않으므로, 로그인 모듈(login.ts, 상대 import 만 사용)만
 * 절대경로로 불러오고 수집/적재 로직은 src/lib/kepco/collect.ts 와 동일하게 이 스크립트에 인라인했다.
 *
 * 특징:
 *  - 재개 가능: 이미 kepco_summary 에 적재된 fid 는 기본 건너뜀(--force 로 재수집).
 *  - 진행 상황을 data/kepco-collect-progress.json 에 기록.
 *  - 업체당 지연(기본 1200ms)으로 서버 부하/계정 잠금 위험 완화.
 *  - 로그인 실패/에러는 kepco_collect_log 에 기록하고 다음 업체로 진행.
 *  - 비밀번호는 메모리에서만 사용하고 출력하지 않는다.
 *
 * 실행: node scripts/kepco-collect-all.mjs [--limit N] [--delay MS] [--force] [--offset N] [--retry-failed]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://pp.kepco.co.kr";

function parseArgs(argv) {
  const args = {
    limit: Infinity,
    delay: 1200,
    force: false,
    offset: 0,
    retryFailed: false,
    retryLoginFailed: false,
    minFid: 0,
    maxFid: Infinity,
    worker: "main",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--delay") args.delay = Number(argv[++i]);
    else if (a === "--offset") args.offset = Number(argv[++i]);
    else if (a === "--min-fid") args.minFid = Number(argv[++i]);
    else if (a === "--max-fid") args.maxFid = Number(argv[++i]);
    else if (a === "--worker") args.worker = String(argv[++i]).replace(/[^a-zA-Z0-9_-]/g, "_");
    else if (a === "--force") args.force = true;
    else if (a === "--retry-failed") args.retryFailed = true;
    else if (a === "--retry-login-failed") args.retryLoginFailed = true;
  }
  return args;
}
const args = parseArgs(process.argv.slice(2));
const progressPath = join(root, `data/kepco-collect-progress-${args.worker}.json`);

const rows = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/firm-rows.json"), "utf8"));
let passwds = {};
try {
  passwds = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/kepco-passwds.json"), "utf8"));
} catch {
  console.error("kepco-passwds.json 없음 — 비밀번호 맵이 필요합니다.");
  process.exit(1);
}

const targets = rows
  .map((r) => ({ fid: r.fid, firmName: r.firmName, kepcoNo: r.kepcoNo, kepcoPasswd: passwds[String(r.fid)] || r.kepcoPasswd || "" }))
  .filter((r) => r.kepcoNo && r.kepcoPasswd);

const { kepcoLogin, KepcoLoginError } = await import(join(root, "src/lib/kepco/login.ts"));
const Database = (await import("better-sqlite3")).default;
const db = new Database(join(root, "data/solarsimz.db"), { timeout: 15000 });
db.pragma("busy_timeout = 15000");

const collectedFids = new Set(db.prepare("SELECT DISTINCT fid FROM kepco_summary").all().map((r) => r.fid));
const lastStatusByFid = new Map(
  db.prepare(`SELECT fid, status FROM kepco_collect_log WHERE id IN (SELECT MAX(id) FROM kepco_collect_log GROUP BY fid)`)
    .all().map((r) => [r.fid, r.status]),
);
const loginFailureCountByFid = new Map(
  db.prepare("SELECT fid, count(*) count FROM kepco_collect_log WHERE status = 'login_failed' GROUP BY fid")
    .all().map((r) => [r.fid, r.count]),
);

// --- prepared statements (collect.ts 와 동일 스키마) ---
const logStmt = db.prepare(
  "INSERT INTO kepco_collect_log (fid, started_at, finished_at, status, message) VALUES (?, ?, ?, ?, ?)",
);
const summaryStmt = db.prepare(
  `INSERT INTO kepco_summary (fid, collected_at, start_dt, end_dt, cntr_knd_nm, f_ap_qt, total_charge, predict_total_charge, joj_kw, max_pwr, max_pwr_time, raw_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(fid) DO UPDATE SET
     collected_at=excluded.collected_at, start_dt=excluded.start_dt, end_dt=excluded.end_dt,
     cntr_knd_nm=excluded.cntr_knd_nm, f_ap_qt=excluded.f_ap_qt, total_charge=excluded.total_charge,
     predict_total_charge=excluded.predict_total_charge, joj_kw=excluded.joj_kw,
     max_pwr=excluded.max_pwr, max_pwr_time=excluded.max_pwr_time, raw_json=excluded.raw_json`,
);
const hourlyStmt = db.prepare(
  `INSERT INTO kepco_hourly (fid, ymd, hhmi, f_ap_qt, max_pwr, co2, pf)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(fid, ymd, hhmi) DO UPDATE SET f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, co2=excluded.co2, pf=excluded.pf`,
);
const monthlyStmt = db.prepare(
  `INSERT INTO kepco_monthly (fid, yyyymm, f_ap_qt, kwh_bill)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(fid, yyyymm) DO UPDATE SET f_ap_qt=excluded.f_ap_qt, kwh_bill=excluded.kwh_bill`,
);
const writeHourly = db.transaction((fid, ymd, rowsArr) => {
  for (const row of rowsArr) {
    hourlyStmt.run(fid, String(row.YYMMDD ?? ymd), String(row.MR_HHMI2 ?? row.MR_HHMI ?? ""),
      String(row.F_AP_QT ?? ""), String(row.MAX_PWR ?? ""), String(row.CO2 ?? ""), String(row.F_LARAP_PF ?? ""));
  }
});
const writeMonthly = db.transaction((fid, rowsArr, nowYear, nowMonth) => {
  rowsArr.forEach((row, index) => {
    const monthNum = Number(row.MR_HHMI ?? 0);
    if (!monthNum) return;
    const offset = rowsArr.length - 1 - index;
    const date = new Date(nowYear, nowMonth - 1 - offset, 1);
    const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyStmt.run(fid, yyyymm, String(row.F_AP_QT ?? ""), String(row.KWH_BILL ?? ""));
  });
});

const seoulToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");

async function postJson(session, apiPath, body) {
  const res = await fetch(`${ORIGIN}${apiPath}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: session.jar.header(), "x-requested-with": "XMLHttpRequest" },
    body: JSON.stringify(body),
  });
  session.jar.absorb(res.headers);
  if (!res.ok) throw new Error(`${apiPath} HTTP ${res.status}`);
  return res.json();
}

async function collectFirm(firm) {
  const startedAt = new Date().toISOString();
  const finish = (status, message) => {
    const finishedAt = new Date().toISOString();
    logStmt.run(firm.fid, startedAt, finishedAt, status, message);
    return { fid: firm.fid, status, message };
  };
  if (!firm.kepcoNo || !firm.kepcoPasswd) return finish("no_credentials", "한전고객번호/비밀번호 미등록");

  let session;
  try {
    session = await kepcoLogin(firm.kepcoNo, firm.kepcoPasswd);
  } catch (error) {
    if (error instanceof KepcoLoginError) return finish("login_failed", error.message);
    return finish("error", error instanceof Error ? error.message : String(error));
  }

  try {
    const summary = await postJson(session, "/rm/getRM0101.do", {});
    summaryStmt.run(firm.fid, startedAt, String(summary.START_DT ?? ""), String(summary.END_DT ?? ""),
      String(summary.CNTR_KND_NM ?? ""), String(summary.F_AP_QT ?? ""), String(summary.TOTAL_CHARGE ?? ""),
      String(summary.PREDICT_TOTAL_CHARGE ?? ""), String(summary.JOJ_KW ?? ""), String(summary.MAX_PWR ?? ""),
      String(summary.MAX_PWR_TIME ?? summary.MAX_DT ?? ""), JSON.stringify(summary));

    const ymd = seoulToday();
    const hourly = await postJson(session, "/rs/rs0101N_hour.do", { SELECT_DT: ymd, SEL_METER_ID: "", TIME_TYPE: "15", SEL_REV_USER: "F" });
    if (Array.isArray(hourly)) writeHourly(firm.fid, ymd, hourly);

    const monthly = await postJson(session, "/rm/rm0101_chart.do", { menuType: "month" });
    const nowYear = Number(ymd.slice(0, 4)), nowMonth = Number(ymd.slice(4, 6));
    if (Array.isArray(monthly)) writeMonthly(firm.fid, monthly, nowYear, nowMonth);

    return finish("success", `요약+시간대별 ${Array.isArray(hourly) ? hourly.length : 0}건+월별 ${Array.isArray(monthly) ? monthly.length : 0}건`);
  } catch (error) {
    return finish("error", error instanceof Error ? error.message : String(error));
  }
}

function loadProgress() {
  if (existsSync(progressPath)) { try { return JSON.parse(readFileSync(progressPath, "utf8")); } catch { /* ignore */ } }
  return { startedAt: null, processed: 0, success: 0, failed: 0, results: {} };
}
const progress = loadProgress();
if (!progress.startedAt) progress.startedAt = new Date().toISOString();
const saveProgress = () => writeFileSync(progressPath, JSON.stringify(progress, null, 2));

let queue = targets
  .filter((target) => target.fid >= args.minFid && target.fid <= args.maxFid)
  .slice(args.offset);
if (!args.force) {
  queue = queue.filter((t) => {
    const lastStatus = lastStatusByFid.get(t.fid);
    // 성공 적재는 건너뛴다. 부분 적재 후 error인 경우에만 명시적 재시도를 허용한다.
    if (collectedFids.has(t.fid)) {
      return Boolean(args.retryFailed && lastStatus === "error");
    }
    // 비밀번호 오류 가능성이 있어 기본 실행에서는 재시도하지 않는다.
    // 명시 모드에서도 최초 실패 1회인 업체만 한 차례 더 확인한다.
    if (lastStatus === "login_failed") {
      return Boolean(args.retryLoginFailed && (loginFailureCountByFid.get(t.fid) ?? 0) === 1);
    }
    if (lastStatus === "error") return args.retryFailed;
    return true;
  });
}
if (Number.isFinite(args.limit)) queue = queue.slice(0, args.limit);

console.log(`[kepco-collect-all:${args.worker}] 전체 대상 ${targets.length}곳, 이번 실행 큐 ${queue.length}곳 (이미 수집 ${collectedFids.size}곳)`);
console.log(`[kepco-collect-all:${args.worker}] fid=${args.minFid}..${args.maxFid === Infinity ? "∞" : args.maxFid} delay=${args.delay}ms force=${args.force} retryFailed=${args.retryFailed} retryLoginFailed=${args.retryLoginFailed} offset=${args.offset} limit=${args.limit === Infinity ? "∞" : args.limit}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0, loginFail = 0;
const runStart = Date.now();

for (let i = 0; i < queue.length; i += 1) {
  const firm = queue[i];
  let result;
  try {
    result = await collectFirm(firm);
  } catch (e) {
    result = { fid: firm.fid, status: "error", message: e?.message ?? String(e) };
  }
  if (result.status === "success") ok += 1;
  else if (result.status === "login_failed") { fail += 1; loginFail += 1; }
  else fail += 1;

  progress.processed += 1;
  progress.results[firm.fid] = { status: result.status, message: result.message, at: new Date().toISOString() };
  progress.success = (progress.success || 0) + (result.status === "success" ? 1 : 0);
  progress.failed = (progress.failed || 0) + (result.status !== "success" ? 1 : 0);

  const elapsed = ((Date.now() - runStart) / 1000).toFixed(0);
  console.log(`[${i + 1}/${queue.length}] fid=${firm.fid} ${firm.firmName} → ${result.status} (${result.message}) | ok=${ok} fail=${fail} | ${elapsed}s`);

  if (i % 5 === 0) saveProgress();
  if (i < queue.length - 1) await sleep(args.delay);
}

saveProgress();
console.log(`\n[kepco-collect-all] 완료: 성공 ${ok}, 실패 ${fail}(로그인실패 ${loginFail}) / 큐 ${queue.length}`);
console.log(`[kepco-collect-all] DB 총계: summary=${db.prepare("SELECT count(*) c FROM kepco_summary").get().c}, hourly=${db.prepare("SELECT count(*) c FROM kepco_hourly").get().c}, monthly=${db.prepare("SELECT count(*) c FROM kepco_monthly").get().c}`);
db.close();
