PRAGMA foreign_keys = ON;

-- 계측값 정규 저장. 동일 업체·측정점·측정시각은 한 번만 유지한다.

CREATE TABLE IF NOT EXISTS energy_measurements (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  fid INTEGER NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_energy_measurements_fid_observed
  ON energy_measurements(tenant_id, fid, observed_at DESC);
