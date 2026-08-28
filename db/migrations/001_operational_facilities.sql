PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  username TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'OPERATOR', 'VIEWER')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, username)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role
  ON users(tenant_id, role, active);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_lookup
  ON sessions(token_hash, expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS gateways (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(code)) BETWEEN 2 AND 32),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_gateways_tenant_status
  ON gateways(tenant_id, status, name);

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code TEXT NOT NULL COLLATE NOCASE CHECK (length(trim(code)) BETWEEN 2 AND 32),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  process_name TEXT NOT NULL CHECK (length(trim(process_name)) BETWEEN 2 AND 50),
  group_name TEXT NOT NULL DEFAULT '' CHECK (length(group_name) <= 50),
  priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 254),
  base_temperature REAL NOT NULL CHECK (base_temperature BETWEEN 0 AND 999),
  peak_control_percent REAL NOT NULL CHECK (peak_control_percent BETWEEN 0 AND 100),
  gateway_id TEXT,
  node_number INTEGER CHECK (node_number BETWEEN 1 AND 10),
  channel_number INTEGER CHECK (channel_number BETWEEN 1 AND 32),
  control_mode TEXT NOT NULL DEFAULT 'AUTO' CHECK (control_mode IN ('AUTO', 'MANUAL')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (
    (gateway_id IS NULL AND node_number IS NULL AND channel_number IS NULL)
    OR
    (gateway_id IS NOT NULL AND node_number IS NOT NULL AND channel_number IS NOT NULL)
  ),
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, gateway_id)
    REFERENCES gateways(tenant_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_facilities_tenant_active
  ON facilities(tenant_id, deleted_at, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_process
  ON facilities(tenant_id, process_name, deleted_at);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_gateway
  ON facilities(tenant_id, gateway_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant_name
  ON facilities(tenant_id, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'PURGE', 'LOGIN', 'LOGOUT')
  ),
  before_json TEXT,
  after_json TEXT,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_logs(tenant_id, actor_id, created_at DESC);
