#!/usr/bin/env node
/**
 * 수집 작업 감시. 자격증명·원문 응답은 출력하지 않는다.
 * 사용: node scripts/monitor-collection-jobs.mjs
 * 종료 코드: 정상 0, 임계 위반 2
 */
import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.resolve(process.env.DATABASE_PATH ?? "data/app.db");
const staleMinutes = Number(process.env.KEPCO_STALE_MINUTES ?? 30);
const failStreak = Number(process.env.KEPCO_FAIL_STREAK ?? 3);

const db = new Database(dbPath, { readonly: true, fileMustExist: true });

const now = Date.now();
const staleCutoff = new Date(now - staleMinutes * 60_000).toISOString();

const queued = db
  .prepare(
    `SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'QUEUED'`,
  )
  .get().count;
const running = db
  .prepare(
    `SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'RUNNING'`,
  )
  .get().count;
const staleRunning = db
  .prepare(
    `SELECT COUNT(*) AS count FROM collection_jobs
     WHERE status = 'RUNNING' AND updated_at < ?`,
  )
  .get(staleCutoff).count;

const recentFailures = db
  .prepare(
    `SELECT fid, error_code, id AS jobId, finished_at
     FROM collection_jobs
     WHERE status = 'FAILED'
     ORDER BY finished_at DESC
     LIMIT 20`,
  )
  .all();

const byFid = new Map();
for (const row of recentFailures) {
  if (!byFid.has(row.fid)) byFid.set(row.fid, []);
  byFid.get(row.fid).push(row);
}

const streaks = [...byFid.entries()]
  .map(([fid, rows]) => ({
    fid,
    streak: rows.length,
    lastErrorCode: rows[0]?.error_code ?? null,
    lastJobId: rows[0]?.jobId ?? null,
  }))
  .filter((row) => row.streak >= failStreak);

const latestMeasured = db
  .prepare(
    `SELECT MAX(collected_at) AS collected_at FROM kepco_summary`,
  )
  .get()?.collected_at ?? null;

const report = {
  checkedAt: new Date().toISOString(),
  queued,
  running,
  staleRunning,
  latestMeasuredAt: latestMeasured,
  failureStreaks: streaks,
};

console.log(JSON.stringify(report, null, 2));
db.close();

if (staleRunning > 0 || streaks.length > 0) {
  process.exitCode = 2;
}
