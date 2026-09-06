#!/usr/bin/env node
/**
 * 수집 작업 감시. 자격증명·원문 응답은 출력하지 않는다.
 *
 * 사용: node scripts/monitor-collection-jobs.mjs
 * 환경:
 *   DATABASE_PATH
 *   KEPCO_STALE_MINUTES (기본 30)
 *   KEPCO_FAIL_STREAK (기본 3)
 *   KEPCO_QUEUE_STALL_MINUTES (기본 20)
 *   KEPCO_ALERT_SINK=file|none (기본 none; file 은 KEPCO_ALERT_PATH)
 *   KEPCO_ALERT_PATH (file sink 경로)
 *
 * 종료 코드: 정상 0, 임계 위반 2
 *
 * 실제 webhook HTTP 송신은 하지 않는다. 시험은 injectable/local file sink 를 쓴다.
 */
import Database from "better-sqlite3";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dbPath = path.resolve(process.env.DATABASE_PATH ?? "data/app.db");
const staleMinutes = Number(process.env.KEPCO_STALE_MINUTES ?? 30);
const failStreak = Number(process.env.KEPCO_FAIL_STREAK ?? 3);
const queueStallMinutes = Number(process.env.KEPCO_QUEUE_STALL_MINUTES ?? 20);

const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const now = Date.now();
const staleCutoff = new Date(now - staleMinutes * 60_000).toISOString();
const stallCutoff = new Date(now - queueStallMinutes * 60_000).toISOString();

const queued = db
  .prepare(`SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'QUEUED'`)
  .get().count;
const running = db
  .prepare(`SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'RUNNING'`)
  .get().count;
const staleRunning = db
  .prepare(
    `SELECT COUNT(*) AS count FROM collection_jobs
     WHERE status = 'RUNNING' AND updated_at < ?`,
  )
  .get(staleCutoff).count;

const queueStall = db
  .prepare(
    `SELECT COUNT(*) AS count FROM collection_jobs
     WHERE status = 'QUEUED' AND created_at < ?`,
  )
  .get(stallCutoff).count;

const lastScheduledRun =
  db
    .prepare(
      `SELECT MAX(COALESCE(started_at, created_at)) AS at
       FROM collection_jobs`,
    )
    .get()?.at ?? null;

const latestSuccessfulCollection =
  db
    .prepare(
      `SELECT MAX(finished_at) AS at
       FROM collection_jobs
       WHERE status IN ('SUCCEEDED', 'PARTIAL')`,
    )
    .get()?.at ?? null;

const latestMeasurement =
  db
    .prepare(
      `SELECT MAX(observed_at) AS at FROM energy_measurements`,
    )
    .get()?.at ??
  db
    .prepare(`SELECT MAX(collected_at) AS at FROM kepco_summary`)
    .get()?.at ??
  null;

/** fid별 최근 종료 작업을 시간순으로 보며, 마지막 성공 이후의 연속 실패만 streak 로 센다. */
const recentTerminal = db
  .prepare(
    `SELECT fid, status, error_code, id AS jobId, finished_at
     FROM collection_jobs
     WHERE status IN ('FAILED', 'SUCCEEDED', 'PARTIAL', 'CANCELLED')
       AND finished_at IS NOT NULL
     ORDER BY finished_at DESC
     LIMIT 500`,
  )
  .all();

const byFid = new Map();
for (const row of recentTerminal) {
  if (!byFid.has(row.fid)) byFid.set(row.fid, []);
  byFid.get(row.fid).push(row);
}

const streaks = [];
for (const [fid, rows] of byFid.entries()) {
  let streak = 0;
  let lastErrorCode = null;
  let lastJobId = null;
  for (const row of rows) {
    if (row.status === "FAILED") {
      streak += 1;
      if (streak === 1) {
        lastErrorCode = row.error_code ?? null;
        lastJobId = row.jobId ?? null;
      }
      continue;
    }
    // SUCCEEDED / PARTIAL / CANCELLED 가 나오면 그 이전 실패는 streak 에 포함하지 않는다.
    break;
  }
  if (streak >= failStreak) {
    streaks.push({ fid, streak, lastErrorCode, lastJobId });
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  lastScheduledRun,
  latestSuccessfulCollection,
  latestMeasurement,
  queued,
  running,
  queueStall,
  staleRunning,
  failureStreaks: streaks,
};

const alerting =
  staleRunning > 0 || queueStall > 0 || streaks.length > 0;

async function emitAlert(payload) {
  const sink = (process.env.KEPCO_ALERT_SINK ?? "none").toLowerCase();
  if (sink === "none" || !alerting) return { delivered: false, sink };
  if (sink === "file") {
    const alertPath = path.resolve(
      process.env.KEPCO_ALERT_PATH ?? "data/alerts/kepco-monitor.jsonl",
    );
    mkdirSync(path.dirname(alertPath), { recursive: true });
    const line = JSON.stringify({
      type: "kepco_monitor_alert",
      at: payload.checkedAt,
      // 민감정보 없음: fid·jobId·error_code·카운트만
      queueStall: payload.queueStall,
      staleRunning: payload.staleRunning,
      failureStreaks: payload.failureStreaks,
    });
    appendFileSync(alertPath, `${line}\n`, "utf8");
    return { delivered: true, sink, path: alertPath };
  }
  if (sink === "injectable" && process.env.KEPCO_ALERT_INJECT_MODULE) {
    const mod = await import(
      pathToFileURL(path.resolve(process.env.KEPCO_ALERT_INJECT_MODULE)).href
    );
    await mod.default?.(payload);
    return { delivered: true, sink: "injectable" };
  }
  // webhook URL 이 있어도 이 스크립트는 실제 HTTP 송신을 하지 않는다.
  return { delivered: false, sink: "unsupported" };
}

const alert = await emitAlert(report);
const output = { ...report, alert };
console.log(JSON.stringify(output, null, 2));
db.close();

if (alerting) {
  process.exitCode = 2;
}
