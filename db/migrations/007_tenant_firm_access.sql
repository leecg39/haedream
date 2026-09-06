PRAGMA foreign_keys = ON;

-- 업체 마스터는 여러 조직이 공유할 수 있으므로 tenant_id와 fid를 같다고
-- 간주하지 않는다. 실제 허가 관계는 이 매핑에 명시된 행만 인정한다.
CREATE TABLE IF NOT EXISTS tenant_firm_access (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fid INTEGER NOT NULL REFERENCES firms(fid) ON DELETE CASCADE,
  can_view_pii INTEGER NOT NULL DEFAULT 0 CHECK (can_view_pii IN (0, 1)),
  can_collect INTEGER NOT NULL DEFAULT 0 CHECK (can_collect IN (0, 1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, fid)
);

CREATE INDEX IF NOT EXISTS idx_tenant_firm_access_fid
  ON tenant_firm_access(fid, tenant_id);
