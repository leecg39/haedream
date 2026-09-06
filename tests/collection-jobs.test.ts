import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { SessionUser } from "@/features/facilities/types";
import {
  enqueueSingleCollectJob,
  findActiveCollectionJob,
  processQueuedJobs,
  recoverStaleRunningJobs,
} from "@/features/kepco/jobs.repository";
import { AppError } from "@/lib/errors";

describe("collection jobs repository", () => {
  let directory: string;
  let db: AppDatabase;
  let operator: SessionUser;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-jobs-"));
    db = openDatabase(path.join(directory, "test.db"));
    seedDatabase(db);
    operator = db
      .prepare(
        `SELECT id, tenant_id AS tenantId, username, name, role
         FROM users WHERE username = 'operator' LIMIT 1`,
      )
      .get() as SessionUser;
    const now = new Date().toISOString();
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name, kepco_no) VALUES (101, 1, '작업 업체', '1000000001')",
    ).run();
    db.prepare(
      `INSERT OR REPLACE INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, 101, 1, 1, ?)`,
    ).run(operator.tenantId, now);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("활성 작업 중복 enqueue 는 409 이다", () => {
    enqueueSingleCollectJob(operator, 101, "req-1", db);
    expect(() => enqueueSingleCollectJob(operator, 101, "req-2", db)).toThrow(AppError);
    expect(findActiveCollectionJob(operator.tenantId, 101, "current", db)?.status).toBe(
      "QUEUED",
    );
  });

  it("worker 는 no_credentials 를 FAILED 로 기록하고 활성 작업을 비운다", async () => {
    const job = enqueueSingleCollectJob(operator, 101, "req-1", db);
    await processQueuedJobs(1, db);
    const finished = db
      .prepare("SELECT status, error_code FROM collection_jobs WHERE id = ?")
      .get(job.id) as { status: string; error_code: string };
    expect(finished).toMatchObject({ status: "FAILED", error_code: "NO_CREDENTIALS" });
    expect(findActiveCollectionJob(operator.tenantId, 101, "current", db)).toBeNull();
  });

  it("오래된 RUNNING 은 재시작 복구로 QUEUED 가 된다", () => {
    const job = enqueueSingleCollectJob(operator, 101, "req-1", db);
    db.prepare(
      `UPDATE collection_jobs
       SET status = 'RUNNING', updated_at = '2000-01-01T00:00:00.000Z', started_at = '2000-01-01T00:00:00.000Z'
       WHERE id = ?`,
    ).run(job.id);
    expect(recoverStaleRunningJobs(60_000, db)).toBe(1);
    expect(findActiveCollectionJob(operator.tenantId, 101, "current", db)?.status).toBe(
      "QUEUED",
    );
  });
});
