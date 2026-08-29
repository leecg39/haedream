PRAGMA foreign_keys = ON;

-- 한전 파워플래너 수집 데이터 (업체 fid 기준)
CREATE TABLE IF NOT EXISTS kepco_summary (
  fid INTEGER PRIMARY KEY,
  collected_at TEXT NOT NULL,
  start_dt TEXT NOT NULL DEFAULT '',
  end_dt TEXT NOT NULL DEFAULT '',
  cntr_knd_nm TEXT NOT NULL DEFAULT '',
  f_ap_qt TEXT NOT NULL DEFAULT '',
  total_charge TEXT NOT NULL DEFAULT '',
  predict_total_charge TEXT NOT NULL DEFAULT '',
  joj_kw TEXT NOT NULL DEFAULT '',
  max_pwr TEXT NOT NULL DEFAULT '',
  max_pwr_time TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS kepco_hourly (
  fid INTEGER NOT NULL,
  ymd TEXT NOT NULL,
  hhmi TEXT NOT NULL,
  f_ap_qt TEXT NOT NULL DEFAULT '',
  max_pwr TEXT NOT NULL DEFAULT '',
  co2 TEXT NOT NULL DEFAULT '',
  pf TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (fid, ymd, hhmi)
);

CREATE INDEX IF NOT EXISTS idx_kepco_hourly_fid_ymd
  ON kepco_hourly(fid, ymd);

CREATE TABLE IF NOT EXISTS kepco_monthly (
  fid INTEGER NOT NULL,
  yyyymm TEXT NOT NULL,
  f_ap_qt TEXT NOT NULL DEFAULT '',
  kwh_bill TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (fid, yyyymm)
);

CREATE TABLE IF NOT EXISTS kepco_collect_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fid INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'no_credentials', 'login_failed', 'error')),
  message TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_kepco_collect_log_fid
  ON kepco_collect_log(fid, id DESC);
