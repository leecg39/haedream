PRAGMA foreign_keys = ON;

-- 업체관리(/fit/firm, /firm.html) 마스터.
--
-- 지금까지 업체 목록은 정적 JSON(src/lib/fit-mocks/firm-rows.json, 1,654건)을
-- 그대로 응답해 왔고 쓰기 경로가 없었다. 화면에서 업체를 추가할 수 있어야 하므로
-- 실제 테이블로 옮긴다. 시드는 scripts/seed-firms.mjs 가 넣는다.
--
-- 보안: 한전 사이버지점 비밀번호(kepcoPasswd)는 이 테이블에 두지 않는다.
-- 수집 경로는 src/lib/kepco/credentials.server.ts 에서만 자격증명을 읽는다.
CREATE TABLE IF NOT EXISTS firms (
  fid INTEGER PRIMARY KEY,
  -- 정적 JSON 의 배열 순서. 기존 응답 순서를 그대로 재현하기 위한 정렬 키다.
  -- 새로 추가된 업체는 기존 최대값 뒤에 붙는다.
  seq INTEGER NOT NULL,
  firm_name TEXT NOT NULL,
  regist_time TEXT NOT NULL DEFAULT '',
  contract TEXT NOT NULL DEFAULT '',
  kepco_no TEXT NOT NULL DEFAULT '',
  eoi_time INTEGER NOT NULL DEFAULT 0,
  pct_ratio INTEGER NOT NULL DEFAULT 0,
  peak_last INTEGER NOT NULL DEFAULT 0,
  power_limit INTEGER NOT NULL DEFAULT 0,
  peak_run_mode INTEGER NOT NULL DEFAULT 0,
  peak_control_mode INTEGER NOT NULL DEFAULT 0,
  is_disable INTEGER NOT NULL DEFAULT 0,
  service_type INTEGER NOT NULL DEFAULT 0,
  memo TEXT NOT NULL DEFAULT '',
  frugal INTEGER NOT NULL DEFAULT 0,
  contract_limit INTEGER NOT NULL DEFAULT 0,
  able_low_power INTEGER NOT NULL DEFAULT 0,
  max_able_watt INTEGER NOT NULL DEFAULT 0,
  max_able_date INTEGER NOT NULL DEFAULT 0,
  pass TEXT NOT NULL DEFAULT '',
  degree_city INTEGER NOT NULL DEFAULT 0,
  bone TEXT NOT NULL DEFAULT '',
  kepco_cyber TEXT NOT NULL DEFAULT '',
  manager TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address_text TEXT NOT NULL DEFAULT '',
  check_day INTEGER NOT NULL DEFAULT 0,
  able_limit INTEGER NOT NULL DEFAULT 0,
  able_limit_time TEXT NOT NULL DEFAULT '',
  pulse_num INTEGER NOT NULL DEFAULT 0,
  frugal_time TEXT NOT NULL DEFAULT '',
  invest_gold INTEGER NOT NULL DEFAULT 0,
  kepco_contract TEXT NOT NULL DEFAULT '',
  boss TEXT NOT NULL DEFAULT '',
  map_geo TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_firms_seq ON firms (seq);
CREATE INDEX IF NOT EXISTS idx_firms_name ON firms (firm_name);
