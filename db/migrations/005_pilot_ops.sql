PRAGMA foreign_keys = ON;

-- Package A ops: disconnect/alarm inbox, field inspection runs, daily reception confirmations.
-- No portal/tariff/savings fields.

CREATE TABLE IF NOT EXISTS pilot_alarms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  gateway_id TEXT NOT NULL,
  point_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('DISCONNECT', 'ALARM')),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 120),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 2 AND 500),
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('mock', 'rtu')),
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id, gateway_id)
    REFERENCES gateways(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (acknowledged_by)
    REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pilot_alarms_inbox
  ON pilot_alarms(tenant_id, gateway_id, acknowledged_at, observed_at DESC);

CREATE TABLE IF NOT EXISTS pilot_inspection_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  gateway_id TEXT NOT NULL,
  inspected_at TEXT NOT NULL,
  inspector_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'PARTIAL')),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 1000),
  created_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id, gateway_id)
    REFERENCES gateways(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pilot_inspection_runs_lookup
  ON pilot_inspection_runs(tenant_id, gateway_id, inspected_at DESC);

CREATE TABLE IF NOT EXISTS pilot_inspection_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES pilot_inspection_runs(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL CHECK (
    item_key IN (
      'rtu_485_led',
      'lte_link',
      'meter_ct',
      'gateway_tag_match',
      'disconnect_alarm_operator'
    )
  ),
  result TEXT NOT NULL CHECK (result IN ('PASS', 'FAIL', 'NA')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  UNIQUE (run_id, item_key)
);

CREATE TABLE IF NOT EXISTS pilot_daily_confirmations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  gateway_id TEXT NOT NULL,
  confirm_date TEXT NOT NULL CHECK (confirm_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  reception_ok INTEGER NOT NULL CHECK (reception_ok IN (0, 1)),
  alarm_reviewed INTEGER NOT NULL CHECK (alarm_reviewed IN (0, 1)),
  confirmed_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  confirmed_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  UNIQUE (tenant_id, gateway_id, confirm_date),
  FOREIGN KEY (tenant_id, gateway_id)
    REFERENCES gateways(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pilot_daily_confirmations_lookup
  ON pilot_daily_confirmations(tenant_id, gateway_id, confirm_date DESC);
