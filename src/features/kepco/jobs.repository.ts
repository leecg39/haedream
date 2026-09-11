import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/lib/db";
import { AppError, isSqliteConstraint } from "@/lib/errors";
import type { SessionUser } from "@/features/facilities/types";
import { collectFirm, type CollectResult } from "@/lib/kepco/collect";
import { getKepcoPassword } from "@/lib/kepco/credentials.server";
import { findFirmForCollection } from "@/features/firms/repository";
import { requireFirmAccess } from "@/features/firms/authorization.server";

export type CollectionJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export interface CollectionJob {
  readonly id: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly fid: number;
  readonly mode: "single";
  readonly targetPeriod: string;
  readonly status: CollectionJobStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly resultSummary: string | null;
  readonly successCount: number;
  readonly missingCount: number;
  readonly duplicateCount: number;
  readonly failureCount: number;
  readonly requestId: string;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly updatedAt: string;
  readonly nextAttemptAt: string | null;
}

export type CollectAdapter = (firm: {
  fid: number;
  kepcoNo: string;
  kepcoPasswd: string;
  checkDay?: number;
}) => Promise<CollectResult>;

const NON_RETRYABLE_CODES = new Set([
  "NO_CREDENTIALS",
  "LOGIN_FAILED",
  "FORBIDDEN",
  "FIRM_NOT_FOUND",
  "FIRM_ACCESS_DENIED",
  "FIRM_COLLECTION_DENIED",
]);

const TERMINAL_STATUSES = new Set<CollectionJobStatus>([
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
]);

/** attempt_count 기반 지수 백오프(초). 같은 tick 안 즉시 재claim 을 막는다. */
export function retryBackoffSeconds(attemptCount: number): number {
  const capped = Math.max(1, Math.min(attemptCount, 6));
  return Math.min(300, 2 ** capped);
}

const jobSelect = `
  SELECT
    id,
    tenant_id AS tenantId,
    actor_id AS actorId,
    fid,
    mode,
    target_period AS targetPeriod,
    status,
    attempt_count AS attemptCount,
    max_attempts AS maxAttempts,
    error_code AS errorCode,
    error_message AS errorMessage,
    result_summary AS resultSummary,
    success_count AS successCount,
    missing_count AS missingCount,
    duplicate_count AS duplicateCount,
    failure_count AS failureCount,
    request_id AS requestId,
    created_at AS createdAt,
    started_at AS startedAt,
    finished_at AS finishedAt,
    updated_at AS updatedAt,
    next_attempt_at AS nextAttemptAt
  FROM collection_jobs
`;

function mapJob(row: CollectionJob | undefined): CollectionJob | null {
  return row ?? null;
}

export function getCollectionJob(
  id: string,
  db: AppDatabase = getDb(),
): CollectionJob | null {
  return mapJob(
    db.prepare(`${jobSelect} WHERE id = ?`).get(id) as CollectionJob | undefined,
  );
}

export function getCollectionJobForUser(
  user: SessionUser,
  id: string,
  db: AppDatabase = getDb(),
): CollectionJob {
  const job = getCollectionJob(id, db);
  if (!job || job.tenantId !== user.tenantId) {
    throw new AppError(404, "JOB_NOT_FOUND", "수집 작업을 찾을 수 없습니다.");
  }
  requireFirmAccess(user, job.fid, {}, db);
  return job;
}

export function findActiveCollectionJob(
  tenantId: string,
  fid: number,
  targetPeriod = "current",
  db: AppDatabase = getDb(),
): CollectionJob | null {
  return mapJob(
    db
      .prepare(
        `${jobSelect}
         WHERE tenant_id = ? AND fid = ? AND target_period = ?
           AND status IN ('QUEUED', 'RUNNING')
         LIMIT 1`,
      )
      .get(tenantId, fid, targetPeriod) as CollectionJob | undefined,
  );
}

/** 단일 업체 수집 작업을 큐에 넣는다. 활성 작업이 있으면 409. */
export function enqueueSingleCollectJob(
  user: SessionUser,
  fid: number,
  requestId: string,
  db: AppDatabase = getDb(),
): CollectionJob {
  requireFirmAccess(user, fid, { collect: true }, db);
  const firmExists = db
    .prepare(
      `SELECT 1 AS ok
       FROM tenant_firm_access tfa
       JOIN firms f ON f.fid = tfa.fid
       WHERE tfa.tenant_id = ? AND tfa.fid = ? AND tfa.can_collect = 1`,
    )
    .get(user.tenantId, fid) as { ok: number } | undefined;
  if (!firmExists) {
    const anyFirm = db.prepare(`SELECT 1 AS ok FROM firms WHERE fid = ?`).get(fid) as
      | { ok: number }
      | undefined;
    if (!anyFirm) {
      throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
    }
    throw new AppError(403, "FIRM_COLLECT_DENIED", "이 업체에 대한 수집 권한이 없습니다.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, updated_at, next_attempt_at)
       VALUES (?, ?, ?, ?, 'single', 'current', 'QUEUED', 0, 2, ?, ?, ?, NULL)`,
    ).run(id, user.tenantId, user.id, fid, requestId, now, now);
  } catch (error) {
    if (isSqliteConstraint(error, "SQLITE_CONSTRAINT_UNIQUE")) {
      throw new AppError(
        409,
        "KEPCO_FIRM_COLLECTION_ACTIVE",
        "이 업체의 한전 수집이 이미 진행 중입니다.",
      );
    }
    if (isSqliteConstraint(error, "SQLITE_CONSTRAINT_FOREIGNKEY")) {
      throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
    }
    throw error;
  }
  const job = getCollectionJob(id, db);
  if (!job) {
    throw new AppError(500, "JOB_CREATE_FAILED", "수집 작업을 만들지 못했습니다.");
  }
  return job;
}

function finishJob(
  db: AppDatabase,
  jobId: string,
  status: Exclude<CollectionJobStatus, "QUEUED" | "RUNNING">,
  fields: {
    errorCode?: string | null;
    errorMessage?: string | null;
    resultSummary?: string | null;
    successCount?: number;
    missingCount?: number;
    failureCount?: number;
  },
) {
  if (!TERMINAL_STATUSES.has(status)) {
    throw new AppError(500, "INVALID_JOB_TRANSITION", "허용되지 않은 종료 상태입니다.");
  }
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE collection_jobs SET
         status = ?,
         error_code = ?,
         error_message = ?,
         result_summary = ?,
         success_count = ?,
         missing_count = ?,
         failure_count = ?,
         finished_at = ?,
         updated_at = ?,
         next_attempt_at = NULL
       WHERE id = ? AND status = 'RUNNING'`,
    )
    .run(
      status,
      fields.errorCode ?? null,
      fields.errorMessage ?? null,
      fields.resultSummary ?? null,
      fields.successCount ?? 0,
      fields.missingCount ?? 0,
      fields.failureCount ?? 0,
      now,
      now,
      jobId,
    );
  if (result.changes !== 1) {
    throw new AppError(
      409,
      "INVALID_JOB_TRANSITION",
      "RUNNING 상태가 아닌 작업은 종료할 수 없습니다.",
    );
  }
}

/** 재시도 가능한 실패는 QUEUED 로 되돌리고 next_attempt_at 을 둔다. */
function requeueForRetry(
  db: AppDatabase,
  job: CollectionJob,
  errorCode: string,
  errorMessage: string,
) {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const nextAttemptAt = new Date(
    nowMs + retryBackoffSeconds(job.attemptCount) * 1000,
  ).toISOString();
  const result = db
    .prepare(
      `UPDATE collection_jobs SET
         status = 'QUEUED',
         error_code = ?,
         error_message = ?,
         failure_count = failure_count + 1,
         finished_at = NULL,
         updated_at = ?,
         next_attempt_at = ?
       WHERE id = ? AND status = 'RUNNING'`,
    )
    .run(errorCode, errorMessage, now, nextAttemptAt, job.id);
  if (result.changes !== 1) {
    throw new AppError(
      409,
      "INVALID_JOB_TRANSITION",
      "RUNNING 상태가 아닌 작업은 재큐잉할 수 없습니다.",
    );
  }
}

function shouldRetry(job: CollectionJob, errorCode: string): boolean {
  if (NON_RETRYABLE_CODES.has(errorCode)) return false;
  return job.attemptCount < job.maxAttempts;
}

/** QUEUED 작업을 하나 가져와 RUNNING 으로 전환한다. next_attempt_at 이 미래면 건너뛴다. */
export function claimNextQueuedJob(
  db: AppDatabase = getDb(),
  nowIso: string = new Date().toISOString(),
): CollectionJob | null {
  return db.transaction(() => {
    const row = db
      .prepare(
        `${jobSelect}
         WHERE status = 'QUEUED'
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get(nowIso) as CollectionJob | undefined;
    if (!row) return null;
    const result = db
      .prepare(
        `UPDATE collection_jobs SET
           status = 'RUNNING',
           attempt_count = attempt_count + 1,
           started_at = COALESCE(started_at, ?),
           updated_at = ?,
           next_attempt_at = NULL
         WHERE id = ? AND status = 'QUEUED'`,
      )
      .run(nowIso, nowIso, row.id);
    if (result.changes !== 1) return null;
    return getCollectionJob(row.id, db);
  })();
}

/**
 * 작업 하나를 실행한다. 외부 한전 호출은 collect 어댑터에 위임하며
 * 자격증명·원문은 job 행에 쓰지 않는다.
 */
export async function runCollectionJob(
  job: CollectionJob,
  db: AppDatabase = getDb(),
  collect: CollectAdapter = collectFirm,
): Promise<CollectionJob> {
  const failOrRetry = (errorCode: string, errorMessage: string) => {
    if (shouldRetry(job, errorCode)) {
      requeueForRetry(db, job, errorCode, errorMessage);
      return;
    }
    finishJob(db, job.id, "FAILED", {
      errorCode,
      errorMessage,
      failureCount: job.failureCount + 1,
    });
  };

  try {
    // 대기 중 계정 비활성화·역할 변경도 실행 직전 권한에 반영한다.
    const actor = db.prepare(
      `SELECT id, tenant_id AS tenantId, username, name, role
       FROM users WHERE id = ? AND tenant_id = ? AND active = 1`,
    ).get(job.actorId, job.tenantId) as SessionUser | undefined;
    if (!actor) throw new AppError(403, "FORBIDDEN", "수집 요청자의 권한을 확인할 수 없습니다.");
    const firm = findFirmForCollection(actor, job.fid, db);
    const result = await collect({
      fid: firm.fid,
      kepcoNo: firm.kepcoNo,
      kepcoPasswd: getKepcoPassword(firm.fid),
      checkDay: firm.checkDay,
    });

    if (result.status === "success") {
      finishJob(db, job.id, "SUCCEEDED", {
        resultSummary: result.message,
        successCount: 1,
        failureCount: job.failureCount,
      });
    } else if (result.status === "no_credentials") {
      failOrRetry("NO_CREDENTIALS", result.message);
    } else if (result.status === "login_failed") {
      failOrRetry("LOGIN_FAILED", result.message);
    } else {
      failOrRetry("COLLECT_ERROR", result.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error instanceof AppError ? error.code : "COLLECT_ERROR";
    failOrRetry(code, message);
  }
  return getCollectionJob(job.id, db)!;
}

/**
 * 큐에 남은 작업을 순차 처리한다.
 * 한 실행에서 방금 requeue 된 동일 job 을 다시 잡지 않도록
 * next_attempt_at backoff 와 처리 id 집합을 함께 쓴다.
 */
export async function processQueuedJobs(
  limit = 10,
  db: AppDatabase = getDb(),
  collect: CollectAdapter = collectFirm,
): Promise<number> {
  let processed = 0;
  const seen = new Set<string>();
  for (let index = 0; index < limit; index += 1) {
    const job = claimNextQueuedJob(db);
    if (!job) break;
    if (seen.has(job.id)) break;
    seen.add(job.id);
    await runCollectionJob(job, db, collect);
    processed += 1;
  }
  return processed;
}

/**
 * worker 재시작 시 오래된 RUNNING 을 복구한다.
 * max_attempts 를 소진한 작업은 FAILED, 나머지는 QUEUED(+backoff).
 */
export function recoverStaleRunningJobs(
  olderThanMs = 15 * 60 * 1000,
  db: AppDatabase = getDb(),
): number {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  return db.transaction(() => {
    const stale = db
      .prepare(
        `${jobSelect}
         WHERE status = 'RUNNING' AND updated_at < ?`,
      )
      .all(cutoff) as CollectionJob[];
    let changes = 0;
    for (const job of stale) {
      if (job.attemptCount >= job.maxAttempts) {
        finishJob(db, job.id, "FAILED", {
          errorCode: "STALE_RUNNING",
          errorMessage: "worker restarted after max attempts; marked failed",
          failureCount: Math.max(job.failureCount + 1, 1),
        });
      } else {
        const nextAttemptAt = new Date(
          nowMs + retryBackoffSeconds(job.attemptCount) * 1000,
        ).toISOString();
        db.prepare(
          `UPDATE collection_jobs SET
             status = 'QUEUED',
             updated_at = ?,
             next_attempt_at = ?,
             error_message = COALESCE(error_message, 'worker restarted; re-queued')
           WHERE id = ? AND status = 'RUNNING'`,
        ).run(now, nextAttemptAt, job.id);
      }
      changes += 1;
    }
    return changes;
  })();
}

export function toJobPublicDto(job: CollectionJob) {
  return {
    jobId: job.id,
    fid: job.fid,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    resultSummary: job.resultSummary,
    successCount: job.successCount,
    missingCount: job.missingCount,
    failureCount: job.failureCount,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    nextAttemptAt: job.nextAttemptAt,
    // 화면: 작업 시각과 최신 측정 시각을 분리해 쓴다.
    jobFinishedAt: job.finishedAt,
  };
}
