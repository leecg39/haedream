CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_id
  ON users(tenant_id, id);

CREATE TRIGGER IF NOT EXISTS sessions_tenant_user_insert
BEFORE INSERT ON sessions
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.user_id AND tenant_id = NEW.tenant_id
)
BEGIN
  SELECT RAISE(ABORT, 'session user tenant mismatch');
END;

CREATE TRIGGER IF NOT EXISTS sessions_tenant_user_update
BEFORE UPDATE OF tenant_id, user_id ON sessions
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.user_id AND tenant_id = NEW.tenant_id
)
BEGIN
  SELECT RAISE(ABORT, 'session user tenant mismatch');
END;

CREATE TRIGGER IF NOT EXISTS facilities_tenant_actor_insert
BEFORE INSERT ON facilities
FOR EACH ROW
WHEN
  NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.created_by AND tenant_id = NEW.tenant_id
  )
  OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND tenant_id = NEW.tenant_id
  )
  OR (
    NEW.deleted_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = NEW.deleted_by AND tenant_id = NEW.tenant_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'facility actor tenant mismatch');
END;

CREATE TRIGGER IF NOT EXISTS facilities_tenant_actor_update
BEFORE UPDATE OF tenant_id, created_by, updated_by, deleted_by ON facilities
FOR EACH ROW
WHEN
  NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.created_by AND tenant_id = NEW.tenant_id
  )
  OR NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND tenant_id = NEW.tenant_id
  )
  OR (
    NEW.deleted_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM users
      WHERE id = NEW.deleted_by AND tenant_id = NEW.tenant_id
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'facility actor tenant mismatch');
END;

CREATE TRIGGER IF NOT EXISTS audit_tenant_actor_insert
BEFORE INSERT ON audit_logs
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.actor_id AND tenant_id = NEW.tenant_id
)
BEGIN
  SELECT RAISE(ABORT, 'audit actor tenant mismatch');
END;

CREATE TRIGGER IF NOT EXISTS audit_tenant_actor_update
BEFORE UPDATE OF tenant_id, actor_id ON audit_logs
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1 FROM users
  WHERE id = NEW.actor_id AND tenant_id = NEW.tenant_id
)
BEGIN
  SELECT RAISE(ABORT, 'audit actor tenant mismatch');
END;
