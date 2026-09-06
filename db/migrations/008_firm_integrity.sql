PRAGMA foreign_keys = ON;

-- 업체 무결성: 낙관적 잠금 버전과 작성·수정 주체/시각.
-- 기존 행은 version=1, 시각은 regist_time 또는 현재 UTC 기준으로 채운다.

ALTER TABLE firms ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE firms ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE firms ADD COLUMN created_by TEXT NOT NULL DEFAULT '';
ALTER TABLE firms ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE firms ADD COLUMN updated_by TEXT NOT NULL DEFAULT '';

UPDATE firms
SET
  created_at = CASE
    WHEN created_at = '' AND regist_time <> '' THEN regist_time
    WHEN created_at = '' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ELSE created_at
  END,
  updated_at = CASE
    WHEN updated_at = '' AND regist_time <> '' THEN regist_time
    WHEN updated_at = '' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ELSE updated_at
  END
WHERE created_at = '' OR updated_at = '';

CREATE TRIGGER IF NOT EXISTS firms_version_increment
BEFORE UPDATE OF version ON firms
FOR EACH ROW
WHEN NEW.version <> OLD.version + 1
BEGIN
  SELECT RAISE(ABORT, 'firm version must increment by one');
END;
