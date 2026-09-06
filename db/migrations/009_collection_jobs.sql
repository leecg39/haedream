PRAGMA foreign_keys = ON;

-- 한전 수집을 HTTP 요청과 분리한 작업 큐.
-- 자격증명·원문 응답은 이 테이블에 저장하지 않는다.

CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  fid INTEGER NOT NULL,
  mode TEXT NOT NULL DEFAULT 'single' CHECK (mode = 'single'),
  target_period TEXT NOT NULL DEFAULT 'current',
  status TEXT NOT NULL CHECK (
    status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELLED')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts >= 1),
  error_code TEXT,
  error_message TEXT,
  result_summary TEXT,
  success_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collection_jobs_tenant_fid_created
  ON collection_jobs(tenant_id, fid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_jobs_status_created
  ON collection_jobs(status, created_at);

-- 동일 업체·대상 기간의 활성 작업은 하나만 허용한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_jobs_active_unique
  ON collection_jobs(tenant_id, fid, target_period)
  WHERE status IN ('QUEUED', 'RUNNING');
