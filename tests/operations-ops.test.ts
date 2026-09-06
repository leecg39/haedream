import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

const root = process.cwd();

describe("operations scripts", () => {
  let directory: string;
  let dbPath: string;
  let db: AppDatabase;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-ops-"));
    dbPath = path.join(directory, "app.db");
    db = openDatabase(dbPath);
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("백업 후 복원 검증이 인증·업체·한전 요약을 통과한다", () => {
    const backupPath = path.join(directory, "backup.db");
    const backup = spawnSync(
      "node",
      ["scripts/backup-db.mjs", dbPath, backupPath],
      { cwd: root, encoding: "utf8" },
    );
    expect(backup.status, backup.stderr).toBe(0);
    const verify = spawnSync(
      "node",
      ["scripts/restore-db-verify.mjs", backupPath],
      { cwd: root, encoding: "utf8" },
    );
    expect(verify.status, verify.stderr).toBe(0);
    expect(verify.stdout).toContain("[restore-verify] ok");
    expect(verify.stdout).toContain("authHashFormatOk");
    expect(verify.stdout).not.toContain('"demo"');
  });

  it("수집 감시는 실패 연속과 stale RUNNING 을 보고한다", () => {
    const now = new Date().toISOString();
    const operator = db
      .prepare(`SELECT id, tenant_id FROM users WHERE username = 'operator'`)
      .get() as { id: string; tenant_id: string };
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '감시 업체')",
    ).run();
    for (let index = 0; index < 3; index += 1) {
      db.prepare(
        `INSERT INTO collection_jobs
         (id, tenant_id, actor_id, fid, mode, target_period, status,
          attempt_count, max_attempts, error_code, request_id, created_at, finished_at, updated_at)
         VALUES (?, ?, ?, 101, 'single', 'current', 'FAILED', 1, 2, 'LOGIN_FAILED', ?, ?, ?, ?)`,
      ).run(
        `job-fail-${index}`,
        operator.tenant_id,
        operator.id,
        `req-${index}`,
        now,
        now,
        now,
      );
    }
    db.prepare(
      `INSERT INTO collection_jobs
       (id, tenant_id, actor_id, fid, mode, target_period, status,
        attempt_count, max_attempts, request_id, created_at, started_at, updated_at)
       VALUES ('job-stale', ?, ?, 101, 'single', 'stale-period', 'RUNNING', 1, 2, 'req-stale', ?, ?, ?)`,
    ).run(
      operator.tenant_id,
      operator.id,
      now,
      now,
      "2000-01-01T00:00:00.000Z",
    );

    const monitor = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_STALE_MINUTES: "1",
        KEPCO_FAIL_STREAK: "3",
      },
    });
    expect(monitor.status).toBe(2);
    const report = JSON.parse(monitor.stdout);
    expect(report.staleRunning).toBe(1);
    expect(report.latestSuccessfulCollection).toBeNull();
    expect(report.lastJobActivityAt).toBeTruthy();
    expect(report).not.toHaveProperty("lastScheduledRun");
    expect(report.failureStreaks.some((row: { fid: number }) => row.fid === 101)).toBe(
      true,
    );
    expect(JSON.stringify(report)).not.toContain("kepcoPasswd");
  });

  it("모니터 숫자 환경변수 NaN/음수를 거부한다", () => {
    const bad = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_STALE_MINUTES: "NaN",
      },
    });
    expect(bad.status).toBe(1);
    expect(bad.stderr).toMatch(/invalid KEPCO_STALE_MINUTES/);

    const negative = spawnSync("node", ["scripts/monitor-collection-jobs.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: dbPath,
        KEPCO_FAIL_STREAK: "-1",
      },
    });
    expect(negative.status).toBe(1);
  });
});
