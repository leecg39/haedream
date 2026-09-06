import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/lib/db";
import { AppError, isSqliteConstraint } from "@/lib/errors";
import type { SessionUser } from "@/features/facilities/types";
import { collectFirm } from "@/lib/kepco/collect";
import { getKepcoPassword } from "@/lib/kepco/credentials.server";
import { findFirmForCollection } from "@/features/firms/repository";

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
}

const NON_RETRYABLE_CODES = new Set([
  "NO_CREDENTIALS",
  "LOGIN_FAILED",
  "FORBIDDEN",
  "FIRM_NOT_FOUND",
]);

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
    updated_at AS updatedAt
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
  const firmExists = db
    .prepare(`SELECT 1 AS ok FROM firms WHERE fid = ?`)
    .get(fid) as { ok: number } | undefined;
  if (!firmExists) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  try {
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'single', 'current', 'QUEUED', 0, 2, ?, ?, ?)`,
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
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE collection_jobs SET
       status = ?,
       error_code = ?,
       error_message = ?,
       result_summary = ?,
       success_count = ?,
       missing_count = ?,
       failure_count = ?,
       finished_at = ?,
       updated_at = ?
     WHERE id = ?`,
  ).run(
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
}

/** 재시도 가능한 실패는 QUEUED 로 되돌린다. attempt_count 는 claim 시 증가한다. */
function requeueForRetry(
  db: AppDatabase,
  job: CollectionJob,
  errorCode: string,
  errorMessage: string,
) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE collection_jobs SET
       status = 'QUEUED',
       error_code = ?,
       error_message = ?,
       failure_count = failure_count + 1,
       finished_at = NULL,
       updated_at = ?
     WHERE id = ? AND status = 'RUNNING'`,
  ).run(errorCode, errorMessage, now, job.id);
}

function shouldRetry(job: CollectionJob, errorCode: string): boolean {
  if (NON_RETRYABLE_CODES.has(errorCode)) return false;
  return job.attemptCount < job.maxAttempts;
}

/** QUEUED 작업을 하나 가져와 RUNNING 으로 전환한다. */
export function claimNextQueuedJob(
  db: AppDatabase = getDb(),
): CollectionJob | null {
  return db.transaction(() => {
    const row = db
      .prepare(
        `${jobSelect}
         WHERE status = 'QUEUED'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get() as CollectionJob | undefined;
    if (!row) return null;
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `UPDATE collection_jobs SET
           status = 'RUNNING',
           attempt_count = attempt_count + 1,
           started_at = COALESCE(started_at, ?),
           updated_at = ?
         WHERE id = ? AND status = 'QUEUED'`,
      )
      .run(now, now, row.id);
    if (result.changes !== 1) return null;
    return getCollectionJob(row.id, db);
  })();
}

/**
 * 작업 하나를 실행한다. 외부 한전 호출은 collectFirm 에 위임하며
 * 자격증명·원문은 job 행에 쓰지 않는다.
 */
export async function runCollectionJob(
  job: CollectionJob,
  db: AppDatabase = getDb(),
): Promise<CollectionJob> {
  const actor = {
    id: job.actorId,
    tenantId: job.tenantId,
    username: "worker",
    name: "worker",
    role: "OPERATOR" as const,
  };

  const failOrRetry = (errorCode: string, errorMessage: string) => {
    if (shouldRetry(job, errorCode)) {
      requeueForRetry(db, job, errorCode, errorMessage);
      return;
    }
    finishJob(db, job.id, "FAILED", {
      errorCode,
      errorMessage,
      failureCount: 1,
    });
  };

  try {
    const firm = findFirmForCollection(actor, job.fid, db);
    const result = await collectFirm({
      fid: firm.fid,
      kepcoNo: firm.kepcoNo,
      kepcoPasswd: getKepcoPassword(firm.fid),
      checkDay: firm.checkDay,
    });

    if (result.status === "success") {
      finishJob(db, job.id, "SUCCEEDED", {
        resultSummary: result.message,
        successCount: 1,
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

/** 큐에 남은 작업을 순차 처리한다. */
export async function processQueuedJobs(
  limit = 10,
  db: AppDatabase = getDb(),
): Promise<number> {
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const job = claimNextQueuedJob(db);
    if (!job) break;
    await runCollectionJob(job, db);
    processed += 1;
  }
  return processed;
}

/**
 * worker 재시작 시 오래된 RUNNING 을 복구한다.
 * max_attempts 를 소진한 작업은 FAILED, 나머지는 QUEUED.
 */
export function recoverStaleRunningJobs(
  olderThanMs = 15 * 60 * 1000,
  db: AppDatabase = getDb(),
): number {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const now = new Date().toISOString();
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
          failureCount: Math.max(1, job.failureCount),
        });
      } else {
        db.prepare(
          `UPDATE collection_jobs SET
             status = 'QUEUED',
             updated_at = ?,
             error_message = COALESCE(error_message, 'worker restarted; re-queued')
           WHERE id = ? AND status = 'RUNNING'`,
        ).run(now, job.id);
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
    // 화면: 작업 시각과 최신 측정 시각을 분리해 쓴다.
    jobFinishedAt: job.finishedAt,
  };
}
