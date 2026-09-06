import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import type { SessionUser } from "@/features/facilities/types";
import {
  claimNextQueuedJob,
  enqueueSingleCollectJob,
  getCollectionJob,
  processQueuedJobs,
  recoverStaleRunningJobs,
} from "@/features/kepco/jobs.repository";

const root = process.cwd();

describe("collection jobs adversarial contracts", () => {
  let directory: string;
  let db: AppDatabase;
  let operator: SessionUser;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-jobs-adv-"));
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

  it("존재하지 않는 fid 는 FK/검증으로 enqueue 되지 않는다", () => {
    expect(() => enqueueSingleCollectJob(operator, 999_999_999, "req-x", db)).toThrow();
    const count = (
      db.prepare(`SELECT COUNT(*) AS c FROM collection_jobs`).get() as { c: number }
    ).c;
    expect(count).toBe(0);
  });

  it("max_attempts 미만의 재시도 가능 오류는 QUEUED 로 되돌린다", async () => {
    const job = enqueueSingleCollectJob(operator, 101, "req-retry", db);
    const claimed = claimNextQueuedJob(db);
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.attemptCount).toBe(1);

    // attempt < max 이면 stale recover 가 QUEUED 로 되돌린다.
    db.prepare(
      `UPDATE collection_jobs
       SET status = 'RUNNING', attempt_count = 1, max_attempts = 2,
           updated_at = '2000-01-01T00:00:00.000Z'
       WHERE id = ?`,
    ).run(job.id);
    expect(recoverStaleRunningJobs(60_000, db)).toBe(1);
    expect(getCollectionJob(job.id, db)?.status).toBe("QUEUED");
  });

  it("max_attempts 소진 후 stale RUNNING 은 FAILED 이다", () => {
    const job = enqueueSingleCollectJob(operator, 101, "req-max", db);
    db.prepare(
      `UPDATE collection_jobs
       SET status = 'RUNNING', attempt_count = 2, max_attempts = 2,
           updated_at = '2000-01-01T00:00:00.000Z',
           started_at = '2000-01-01T00:00:00.000Z'
       WHERE id = ?`,
    ).run(job.id);
    expect(recoverStaleRunningJobs(60_000, db)).toBe(1);
    expect(getCollectionJob(job.id, db)).toMatchObject({
      status: "FAILED",
      errorCode: "STALE_RUNNING",
    });
  });

  it("로그인 실패는 재시도하지 않고 FAILED 로 종료한다", async () => {
    // 비밀번호 없음 → NO_CREDENTIALS (non-retryable)
    const job = enqueueSingleCollectJob(operator, 101, "req-nc", db);
    await processQueuedJobs(1, db);
    expect(getCollectionJob(job.id, db)).toMatchObject({
      status: "FAILED",
      errorCode: "NO_CREDENTIALS",
      attemptCount: 1,
    });
  });
});

describe("kepco-worker CLI on fresh temp DB", () => {
  it("server-only/@ alias 없이 CLI 가 기동·종료한다", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-worker-cli-"));
    const dbPath = path.join(directory, "app.db");
    try {
      const migrate = spawnSync("node", ["scripts/migrate.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: dbPath },
      });
      expect(migrate.status, migrate.stderr).toBe(0);
      const seed = spawnSync("node", ["scripts/seed.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: dbPath, ALLOW_DEMO_SEED: "true" },
      });
      expect(seed.status, seed.stderr).toBe(0);
      const worker = spawnSync("node", ["scripts/kepco-worker.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: dbPath, KEPCO_INLINE_WORKER: "0" },
      });
      expect(worker.status, worker.stderr + worker.stdout).toBe(0);
      expect(worker.stdout).toContain("[kepco-worker] processed");
      expect(worker.stderr).not.toContain("server-only");
      expect(worker.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("monitor failure streak semantics", () => {
  let directory: string;
  let dbPath: string;
  let db: AppDatabase;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-monitor-"));
    dbPath = path.join(directory, "app.db");
    db = openDatabase(dbPath);
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("성공 이후의 과거 실패는 streak 에 넣지 않는다", () => {
    const operator = db
      .prepare(`SELECT id, tenant_id FROM users WHERE username = 'operator'`)
      .get() as { id: string; tenant_id: string };
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '감시 업체')",
    ).run();
    const insert = db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, error_code, request_id, created_at, finished_at, updated_at)
       VALUES (?, ?, ?, 101, 'single', 'current', ?, 1, 2, ?, ?, ?, ?, ?)`,
    );
    // 과거 실패 3건 → 성공 → 최근 실패 1건
    insert.run("f1", operator.tenant_id, operator.id, "FAILED", "E", "r1", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    insert.run("f2", operator.tenant_id, operator.id, "FAILED", "E", "r2", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z", "2026-01-02T00:00:00.000Z");
    insert.run("f3", operator.tenant_id, operator.id, "FAILED", "E", "r3", "2026-01-03T00:00:00.000Z", "2026-01-03T00:00:00.000Z", "2026-01-03T00:00:00.000Z");
    insert.run("ok", operator.tenant_id, operator.id, "SUCCEEDED", null, "r4", "2026-01-04T00:00:00.000Z", "2026-01-04T00:00:00.000Z", "2026-01-04T00:00:00.000Z");
    insert.run("f4", operator.tenant_id, operator.id, "FAILED", "E", "r5", "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z");

    const alertPath = path.join(directory, "alerts.jsonl");
    const monitor = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_FAIL_STREAK: "3",
        KEPCO_ALERT_SINK: "file",
        KEPCO_ALERT_PATH: alertPath,
      },
    });
    // streak=1 < 3 이므로 정상(0)
    expect(monitor.status, monitor.stdout).toBe(0);
    const report = JSON.parse(monitor.stdout);
    expect(report.failureStreaks).toEqual([]);
    expect(report.latestSuccessfulCollection).toBe("2026-01-04T00:00:00.000Z");
    expect(report.lastScheduledRun).toBeTruthy();
  });

  it("연속 실패 streak 와 복구 시 alert sink 가 동작한다", () => {
    const operator = db
      .prepare(`SELECT id, tenant_id FROM users WHERE username = 'operator'`)
      .get() as { id: string; tenant_id: string };
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '감시 업체')",
    ).run();
    const now = new Date().toISOString();
    for (let index = 0; index < 3; index += 1) {
      db.prepare(
        `INSERT INTO collection_jobs
         (id, tenant_id, actor_id, fid, mode, target_period, status,
          attempt_count, max_attempts, error_code, request_id, created_at, finished_at, updated_at)
         VALUES (?, ?, ?, 101, 'single', 'current', 'FAILED', 1, 2, 'LOGIN_FAILED', ?, ?, ?, ?)`,
      ).run(`job-fail-${index}`, operator.tenant_id, operator.id, `req-${index}`, now, now, now);
    }
    const alertPath = path.join(directory, "alerts.jsonl");
    const failing = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_FAIL_STREAK: "3",
        KEPCO_ALERT_SINK: "file",
        KEPCO_ALERT_PATH: alertPath,
      },
    });
    expect(failing.status).toBe(2);
    const alertBody = readFileSync(alertPath, "utf8");
    expect(alertBody).toContain("kepco_monitor_alert");
    expect(alertBody).not.toContain("kepcoPasswd");
    expect(alertBody).not.toContain("password");

    // 정상 복구: 성공 job 추가 → streak 끊김
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, finished_at, updated_at)
       VALUES ('job-ok', ?, ?, 101, 'single', 'recovered', 'SUCCEEDED', 1, 2, 'req-ok', ?, ?, ?)`,
    ).run(operator.tenant_id, operator.id, now, new Date(Date.now() + 1000).toISOString(), now);

    const recovered = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_FAIL_STREAK: "3",
        KEPCO_ALERT_SINK: "file",
        KEPCO_ALERT_PATH: path.join(directory, "alerts-recovered.jsonl"),
      },
    });
    expect(recovered.status).toBe(0);
    const recoveredReport = JSON.parse(recovered.stdout);
    expect(recoveredReport.failureStreaks).toEqual([]);
  });
});
