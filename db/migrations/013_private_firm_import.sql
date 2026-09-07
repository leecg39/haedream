-- CSV로 가져온 실업체는 조직 범위 안에서도 ADMIN만 접근한다.
ALTER TABLE firms ADD COLUMN admin_only INTEGER NOT NULL DEFAULT 0 CHECK (admin_only IN (0, 1));
ALTER TABLE firms ADD COLUMN import_source_sha256 TEXT NOT NULL DEFAULT '';

CREATE TABLE firm_credentials (
  fid INTEGER PRIMARY KEY REFERENCES firms(fid) ON DELETE CASCADE,
  encrypted_password TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE firm_import_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  actor_id TEXT NOT NULL REFERENCES users(id),
  source_sha256 TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  created_count INTEGER NOT NULL,
  updated_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, source_sha256)
);
