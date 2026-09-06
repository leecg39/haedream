PRAGMA foreign_keys = ON;

-- collection_jobs.fid → firms(fid) 참조 무결성.
CREATE TABLE collection_jobs_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  fid INTEGER NOT NULL REFERENCES firms(fid) ON DELETE RESTRICT,
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

INSERT INTO collection_jobs_v2
SELECT *
FROM collection_jobs
WHERE EXISTS (SELECT 1 FROM firms WHERE firms.fid = collection_jobs.fid);

DROP TABLE collection_jobs;
ALTER TABLE collection_jobs_v2 RENAME TO collection_jobs;

CREATE INDEX IF NOT EXISTS idx_collection_jobs_tenant_fid_created
  ON collection_jobs(tenant_id, fid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_jobs_status_created
  ON collection_jobs(status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_jobs_active_unique
  ON collection_jobs(tenant_id, fid, target_period)
  WHERE status IN ('QUEUED', 'RUNNING');

-- energy_measurements.fid → firms(fid) 참조 무결성.
CREATE TABLE energy_measurements_v2 (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  fid INTEGER NOT NULL REFERENCES firms(fid) ON DELETE RESTRICT,
  meter_point TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN ('DEMO', 'MEASURED', 'ESTIMATED')
  ),
  quality TEXT NOT NULL CHECK (
    quality IN ('DEMO', 'MEASURED', 'ESTIMATED', 'STALE', 'NO_DATA')
  ),
  unit TEXT NOT NULL CHECK (unit IN ('kW', 'kWh')),
  value_real REAL,
  calculation_version TEXT NOT NULL DEFAULT 'v1',
  UNIQUE (tenant_id, fid, meter_point, observed_at, unit)
);

INSERT INTO energy_measurements_v2
SELECT *
FROM energy_measurements
WHERE EXISTS (SELECT 1 FROM firms WHERE firms.fid = energy_measurements.fid);

DROP TABLE energy_measurements;
ALTER TABLE energy_measurements_v2 RENAME TO energy_measurements;

CREATE INDEX IF NOT EXISTS idx_energy_measurements_fid_observed
  ON energy_measurements(tenant_id, fid, observed_at DESC);

-- 정정 시 이전 원본/값 이력 보존.
CREATE TABLE IF NOT EXISTS energy_measurement_corrections (
  id TEXT PRIMARY KEY,
  measurement_id TEXT NOT NULL REFERENCES energy_measurements(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  fid INTEGER NOT NULL REFERENCES firms(fid) ON DELETE RESTRICT,
  meter_point TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  previous_value REAL,
  previous_source TEXT NOT NULL,
  previous_quality TEXT NOT NULL,
  previous_unit TEXT NOT NULL,
  previous_ingested_at TEXT NOT NULL,
  corrected_at TEXT NOT NULL,
  corrected_by TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_energy_corrections_measurement
  ON energy_measurement_corrections(measurement_id, corrected_at DESC);

CREATE INDEX IF NOT EXISTS idx_energy_corrections_fid_observed
  ON energy_measurement_corrections(tenant_id, fid, observed_at DESC);
