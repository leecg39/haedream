PRAGMA foreign_keys = ON;

-- 재시도 backoff: 같은 processQueuedJobs 호출에서 즉시 재claim 되지 않도록.
ALTER TABLE collection_jobs ADD COLUMN next_attempt_at TEXT;

CREATE INDEX IF NOT EXISTS idx_collection_jobs_queue_ready
  ON collection_jobs(status, created_at)
  WHERE status = 'QUEUED';

-- calculation_version 만 바뀐 정정도 이력에 남기기 위한 이전 버전 보존.
ALTER TABLE energy_measurement_corrections
  ADD COLUMN previous_calculation_version TEXT NOT NULL DEFAULT 'v1';
