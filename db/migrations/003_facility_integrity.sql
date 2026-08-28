CREATE INDEX IF NOT EXISTS idx_facilities_tenant_updated
  ON facilities(tenant_id, deleted_at, updated_at DESC, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_facilities_active_gateway_endpoint
  ON facilities(tenant_id, gateway_id, node_number, channel_number)
  WHERE gateway_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER IF NOT EXISTS facilities_immutable_identity
BEFORE UPDATE OF tenant_id, code, created_at, created_by ON facilities
FOR EACH ROW
WHEN
  NEW.tenant_id <> OLD.tenant_id
  OR NEW.code <> OLD.code
  OR NEW.created_at <> OLD.created_at
  OR NEW.created_by <> OLD.created_by
BEGIN
  SELECT RAISE(ABORT, 'facility identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS facilities_version_increment
BEFORE UPDATE ON facilities
FOR EACH ROW
WHEN NEW.version <> OLD.version + 1
BEGIN
  SELECT RAISE(ABORT, 'facility version must increment by one');
END;

CREATE TRIGGER IF NOT EXISTS facilities_delete_state_insert
BEFORE INSERT ON facilities
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL) <> (NEW.deleted_by IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'facility delete state mismatch');
END;

CREATE TRIGGER IF NOT EXISTS facilities_delete_state_update
BEFORE UPDATE OF deleted_at, deleted_by ON facilities
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL) <> (NEW.deleted_by IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'facility delete state mismatch');
END;

CREATE TRIGGER IF NOT EXISTS facilities_active_gateway_insert
BEFORE INSERT ON facilities
FOR EACH ROW
WHEN
  NEW.gateway_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM gateways
    WHERE id = NEW.gateway_id
      AND tenant_id = NEW.tenant_id
      AND status = 'ACTIVE'
  )
BEGIN
  SELECT RAISE(ABORT, 'facility gateway must be active');
END;

CREATE TRIGGER IF NOT EXISTS facilities_active_gateway_update
BEFORE UPDATE OF tenant_id, gateway_id, deleted_at ON facilities
FOR EACH ROW
WHEN
  NEW.deleted_at IS NULL
  AND NEW.gateway_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM gateways
    WHERE id = NEW.gateway_id
      AND tenant_id = NEW.tenant_id
      AND status = 'ACTIVE'
  )
BEGIN
  SELECT RAISE(ABORT, 'facility gateway must be active');
END;

CREATE TRIGGER IF NOT EXISTS gateways_with_active_facilities_guard
BEFORE UPDATE OF status ON gateways
FOR EACH ROW
WHEN
  NEW.status = 'INACTIVE'
  AND OLD.status <> NEW.status
  AND EXISTS (
    SELECT 1
    FROM facilities
    WHERE tenant_id = OLD.tenant_id
      AND gateway_id = OLD.id
      AND deleted_at IS NULL
  )
BEGIN
  SELECT RAISE(ABORT, 'gateway has active facilities');
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_append_only_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'audit logs are append only');
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_append_only_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'audit logs are append only');
END;
