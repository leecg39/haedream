PRAGMA foreign_keys = ON;

-- 파워플래너 전기사용량 1일 합계
CREATE TABLE IF NOT EXISTS kepco_daily_total (
  fid INTEGER NOT NULL,
  ymd TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  f_ap_qt TEXT NOT NULL DEFAULT '',
  max_pwr TEXT NOT NULL DEFAULT '',
  f_larap_qt TEXT NOT NULL DEFAULT '',
  f_lerap_qt TEXT NOT NULL DEFAULT '',
  co2 TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (fid, ymd)
);

-- 파워플래너 15분 시계열. 기존 kepco_hourly(1시간 집계)와 의미를 분리한다.
CREATE TABLE IF NOT EXISTS kepco_interval (
  fid INTEGER NOT NULL,
  ymd TEXT NOT NULL,
  hhmi TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  f_ap_qt TEXT NOT NULL DEFAULT '',
  max_pwr TEXT NOT NULL DEFAULT '',
  f_larap_qt TEXT NOT NULL DEFAULT '',
  f_lerap_qt TEXT NOT NULL DEFAULT '',
  f_larap_pf TEXT NOT NULL DEFAULT '',
  f_lerap_pf TEXT NOT NULL DEFAULT '',
  co2 TEXT NOT NULL DEFAULT '',
  no_data_yn TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (fid, ymd, hhmi)
);

CREATE INDEX IF NOT EXISTS idx_kepco_interval_fid_ymd
  ON kepco_interval(fid, ymd);

-- 원본 research 화면의 월별 요금정보 11개 필드 + 파워플래너 원본 보강 필드
CREATE TABLE IF NOT EXISTS kepco_billing (
  fid INTEGER NOT NULL,
  bill_ym TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  mr_ymd TEXT NOT NULL DEFAULT '',
  contract_pwr TEXT NOT NULL DEFAULT '',
  bill_aply_pwr TEXT NOT NULL DEFAULT '',
  use_kwh TEXT NOT NULL DEFAULT '',
  use_days TEXT NOT NULL DEFAULT '',
  base_bill TEXT NOT NULL DEFAULT '',
  kwh_bill TEXT NOT NULL DEFAULT '',
  req_bill TEXT NOT NULL DEFAULT '',
  lload_usekwh TEXT NOT NULL DEFAULT '',
  mload_usekwh TEXT NOT NULL DEFAULT '',
  maxload_usekwh TEXT NOT NULL DEFAULT '',
  ji_pwrfact TEXT NOT NULL DEFAULT '',
  jn_pwrfact TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (fid, bill_ym)
);

CREATE INDEX IF NOT EXISTS idx_kepco_billing_fid_bill_ym
  ON kepco_billing(fid, bill_ym DESC);

-- 요금제/계약 단가 정보는 계약종별에 따라 필드가 달라 원문 JSON을 보존한다.
CREATE TABLE IF NOT EXISTS kepco_contract (
  fid INTEGER PRIMARY KEY,
  collected_at TEXT NOT NULL,
  cntr_knd_cd TEXT NOT NULL DEFAULT '',
  selbill_cd TEXT NOT NULL DEFAULT '',
  raw_json TEXT NOT NULL DEFAULT '{}'
);

-- 기존 1시간 집계에서 누락했던 무효전력·진상역률·결측 여부를 보강한다.
ALTER TABLE kepco_hourly ADD COLUMN f_larap_qt TEXT NOT NULL DEFAULT '';
ALTER TABLE kepco_hourly ADD COLUMN f_lerap_qt TEXT NOT NULL DEFAULT '';
ALTER TABLE kepco_hourly ADD COLUMN f_lerap_pf TEXT NOT NULL DEFAULT '';
ALTER TABLE kepco_hourly ADD COLUMN no_data_yn TEXT NOT NULL DEFAULT '';
ALTER TABLE kepco_hourly ADD COLUMN raw_json TEXT NOT NULL DEFAULT '{}';
