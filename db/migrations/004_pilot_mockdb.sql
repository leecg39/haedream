PRAGMA foreign_keys = ON;

ALTER TABLE gateways ADD COLUMN rtu TEXT;
ALTER TABLE gateways ADD COLUMN lte INTEGER NOT NULL DEFAULT 0 CHECK (lte IN (0, 1));
ALTER TABLE gateways ADD COLUMN source TEXT CHECK (source IN ('mock', 'rtu') OR source IS NULL);

CREATE TABLE IF NOT EXISTS control_points (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  gateway_id TEXT NOT NULL,
  tag TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(tag)) BETWEEN 2 AND 32),
  meter TEXT NOT NULL CHECK (length(trim(meter)) BETWEEN 2 AND 80),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  source TEXT NOT NULL CHECK (source IN ('mock', 'rtu')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, tag),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, gateway_id)
    REFERENCES gateways(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_control_points_tenant_gateway
  ON control_points(tenant_id, gateway_id, enabled, source);

CREATE TABLE IF NOT EXISTS point_readings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  point_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  interval TEXT NOT NULL DEFAULT '1h' CHECK (interval = '1h'),
  kwh REAL,
  kw REAL,
  voltage REAL,
  amperage REAL,
  source TEXT NOT NULL CHECK (source IN ('mock', 'rtu')),
  UNIQUE (point_id, observed_at, source),
  FOREIGN KEY (tenant_id, point_id)
    REFERENCES control_points(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_point_readings_lookup
  ON point_readings(tenant_id, point_id, source, observed_at DESC);
