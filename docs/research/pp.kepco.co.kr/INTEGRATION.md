# 한전 파워플래너(pp.kepco.co.kr) 데이터 연동

## 개요

- 사이트: https://pp.kepco.co.kr/intro.do (한전 파워플래너)
- 목적: 업체의 전력 사용 데이터를 파워플래너에서 조회해 이 프로젝트와 연동한다.
- 로그인은 **업체관리(`/fit/firm`)에 저장된 한전고객번호 + 한전비밀번호** 를 사용한다.
- 원본(watt.rfenms.com)과 같은 방식: 프론트가 아니라 **서버가 업체별 계정으로 로그인해 수집** 한다.

## 인증 정보 소스

| 항목 | 필드 | 저장 위치 | 비고 |
| --- | --- | --- | --- |
| 한전고객번호 | `FirmRow.kepcoNo` | `src/lib/fit-mocks/firm-rows.json` | 10자리 숫자, 앞자리 0 보존 문자열 |
| 한전비밀번호 | 서버 전용 `getKepcoPassword(fid)` | `src/lib/fit-mocks/kepco-passwds.json` | **gitignore 로컬 전용. 저장소 커밋·API/클라이언트 직렬화 금지** |

- 비밀번호 맵은 `fid → 비밀번호` 형태이며 `src/lib/kepco/credentials.server.ts`가 런타임에만 읽는다. 공유 `FIRM_ROWS`에는 병합하지 않는다.
- 갱신 절차:
  1. `node scripts/export-kepco-passwds.mjs` — fit.rfenms.com 에서 업체 비밀번호 수집 → `data/kepco-passwds.{json,md}`
  2. `node scripts/match-kepco-passwds.mjs` — fid 기준 매칭(한전고객번호 교차 검증) → `src/lib/fit-mocks/kepco-passwds.json`
- 한전고객번호는 26개 키가 중복이라 매칭 키로 쓸 수 없다. 반드시 fid 로 조인하고 고객번호는 검증용으로만 쓴다.
- 비밀번호가 비어 있는 업체(예: fid=5 서원유리)는 파워플래너 로그인 불가.

## 로그인 흐름 (2026-08-29 실계정 검증 완료)

고객번호 `1016122623`(삼운실업)으로 실제 로그인해 확인한 흐름이다.

1. `GET /intro.do` — 응답 쿠키로 `cookieSsId`(세션 토큰), `cookieRsa`(RSA 공개키 modulus, 512 hex)가 내려오고, 페이지 내 hidden input `#RSAExponent` 가 지수를 가진다.
2. 클라이언트에서 RSA(jsbn, PKCS#1 v1.5)로 고객번호·비밀번호를 각각 암호화하고 `cookieSsId + '_'` 접두사를 붙인다.
3. `POST /intro/chkUser.do` — JSON `{USER_ID, USER_PWD, USER_CI, TYPE}` (개인 고객번호 로그인은 `TYPE:"I"`, `USER_CI:""`) → SSO 여부 반환.
4. `POST /login` — form 필드 `USER_ID`, `USER_PWD`, `APT_YN`(고객번호 10자리면 `N`), `SSO_ID` → 인증 세션(`JSESSIONID` 쿠키) 확립 후 `/rm/rm0101.do?menu_id=O010101`(스마트뷰)로 리다이렉트.
5. 이후 모든 데이터 API는 `JSESSIONID` 쿠키 + `content-type: application/json` POST 로 호출한다.

### 서비스 가능여부 확인 (비인증)

- `POST /auth/custno` — JSON `{CUSTNO: "10자리"}`, 응답 `"true"/"false"`. 수집 대상 업체 사전 필터링에 사용 가능.

## 데이터 API 맵 (인증 후, 전부 POST JSON)

| 메뉴 | 페이지 | 데이터 엔드포인트 | 요청 본문 | 응답 요약 |
| --- | --- | --- | --- | --- |
| 스마트뷰 | `/rm/rm0101.do` | `/rm/getRM0101.do` | `{}` | 실시간/예상 사용량·요금, 요금적용전력(`JOJ_KW`), 최대수요전력(`MAX_PWR`·발생일), 계약종별(`CNTR_KND_NM`), 기본요금단가, 검침기간(`START_DT`~`END_DT`) |
| 스마트뷰 차트 | 〃 | `/rm/rm0101_chart.do` | `{menuType: "time"｜"day"｜"month"｜"year"}` | 시간/일/월/년별 사용량(`F_AP_QT`), 전일 대비(`LDAY_F_AP_QT`), 요금(`KWH_BILL`) |
| 스마트뷰 계약 | 〃 | `/rm/rm0101_contract_info.do` | `{}` | 계약 정보 |
| 전기사용량 | `/rs/rs0101N.do` | `/rs/rs0101N_total.do` | `{SELECT_DT:"yyyymmdd", ...}` | 기간 합계 |
| 전기사용량(시간) | 〃 | `/rs/rs0101N_hour.do` | `{SELECT_DT, SEL_METER_ID:"", TIME_TYPE:"15", SEL_REV_USER:"F"}` | 시간대별 `F_AP_QT`(kWh), `MAX_PWR`(최대수요 kW), 유효/무효전력·역률, `CO2`, `NO_DATA_YN` |
| 전기사용량 차트 | 〃 | `/rs/rs0101N_chart.do` | 〃 | 차트용 시계열 |
| 전기사용 패턴 | `/rp/rp0101.do` | `/rp/rp01xx_*.do` | — | 사용 패턴 분석 |
| 전기요금 | `/pr/pr0101.do` | `/pr/pr01xx_*.do` | — | 청구 요금 상세 |
| 공통 | — | `/auth/usercustno_list.do` | `{}` | 계정에 연결된 고객번호 목록(1계정 N고객번호 가능, `MAIN_CUST_YN`) |

- 응답은 전부 `application/json;charset=UTF-8`.
- 세션은 `JSESSIONID` 쿠키 기반이며 만료가 있으므로 수집 작업 단위로 재로그인한다.

## 원본(watt.rfenms.com)의 연동 방식

1. 업체관리(firm)에 업체별 `kepcoNo` / `kepcoPasswd` / `kepcoCyber`(한전 ID) 를 저장한다.
2. 백엔드가 **매일 02:00 배치**로 업체별 파워플래너 로그인 → 데이터 수집 → 자체 DB 적재.
3. `한전데이터 수집`(research) 화면에 업체별 수집 상태·최근 갱신 시각을 보여주고 수동 수집을 제공한다.
4. 수집된 데이터는 KPI 화면(kpi.html) 등에서 조회한다.

## SolarSimz 연동 기획

### 아키텍처

```
┌─────────────┐   매일 02:00 / 수동 트리거   ┌──────────────────┐
│  수집 스케줄러 │ ────────────────────────▶ │ pp.kepco.co.kr   │
│  (서버 사이드) │ ◀──────── JSESSIONID ──── │ 로그인 + 데이터 API │
└──────┬──────┘                             └──────────────────┘
       │ fid 단위로 공개 업체정보 + 서버 전용 비밀번호를 결합해 순회
       ▼
┌─────────────┐    조회 API    ┌──────────────────┐
│ SQLite 적재  │ ───────────▶ │ /fit/research 등  │
└─────────────┘               └──────────────────┘
```

### 구성 요소

1. **로그인 모듈** `src/lib/kepco/login.ts`
   - `/intro.do` 에서 `cookieSsId`·`cookieRsa`·`RSAExponent` 획득
   - RSA 암호화: 사이트 원본 jsbn을 `node:vm`에서 실행해 브라우저와 동일한 PKCS#1 v1.5 암호문 생성
   - `chkUser.do` → `/login` → `JSESSIONID` 반환
2. **수집기** `src/lib/kepco/collect.ts`
   - 업체 1곳 로그인 후 `getRM0101`(요약) + `rs0101N_hour`(시간대별) + `rm0101_chart`(일/월) 순차 호출
   - 실패(로그인 불가·NO_DATA)는 업체 단위로 기록하고 다음 업체 진행
3. **저장 스키마** (SQLite)
   - `kepco_summary(fid, select_dt, 실시간/예상 사용량·요금, joj_kw, max_pwr, max_time, 수집시각)`
   - `kepco_hourly(fid, ymd, hhmi, f_ap_qt, max_pwr, pf, co2)`
   - `kepco_collect_log(fid, started_at, status, message)`
4. **스케줄러**: 매일 02:00 (원본과 동일). Next 서버 내 cron 또는 외부 스케줄러에서 `POST /api/kepco/collect` 호출.
5. **UI**: `/fit/research`(한전데이터 수집)에 업체별 수집 상태·수동 수집 버튼 연동.

### 주의사항

- 비밀번호는 서버 메모리에서만 사용하고 로그·API·클라이언트 번들·DB 원문에 남기지 않는다.
- 로그인 연속 실패 시 계정 잠금 가능성 → 업체당 재시도 1회, 전체 수집에 지연(수 초/업체)을 둔다.
- 파워플래너 데이터는 "단순 참고용"(실제 청구 요금과 상이할 수 있음) 고지를 UI에 유지한다.
- 비밀번호 없는 업체(약 100곳)는 수집 대상에서 제외하고 상태를 "미등록"으로 표시한다.

## 구현 완료 (2026-08-29)

- `src/lib/kepco/login.ts` — RSA 로그인(쿠키 저장소, chkUser→/login, 세션 검증)
- `src/lib/kepco/rsa.ts` + `src/lib/kepco/vendor/` — **사이트 원본 jsbn을 node:vm으로 실행**
- `src/lib/kepco/collect.ts` — 업체별 수집기(요약+시간대별+월별) 및 SQLite 적재
- `db/migrations/004_kepco.sql` — `kepco_summary`/`kepco_hourly`/`kepco_monthly`/`kepco_collect_log`
- API: `GET /api/kepco/status`, `GET /api/kepco/firm/{fid}`, `POST /api/kepco/collect` (`{fid}` 생략 시 비밀번호 보유 전 업체 배치)
- UI: `/fit/research` 가 업체 선택 드롭다운 + 수집 상태 + 수집 요청 버튼 + 요약/월별/시간별 실데이터 표시로 교체됨
- 검증: `node scripts/kepco-probe.mjs <fid>` 로 실로그인+수집 확인, `tests/kepco-*.test.ts`, `e2e/fit-research.spec.ts`

### RSA 구현 주의사항 (실측으로 확인)

`node:crypto` 의 `publicEncrypt(RSA_PKCS1_PADDING)` 암호문은 서버가 거부한다.
같은 세션 쿠키로 A/B 검증한 결과 브라우저 jsbn 암호문만 로그인이 성공했다(전송 헤더·쿠키·TLS 무관).
따라서 사이트가 쓰는 jsbn 라이브러리 자체를 vendor 에 두고 vm 으로 실행한다.

그 외 로그인 구현 시 주의점:

- `cookieSsId` 쿠키 값은 URL 인코딩(`%3D`)되어 내려온다. USER_ID/USER_PWD 접두사에는 **디코딩된 값**을, Cookie 헤더에는 **원본 값**을 써야 한다(브라우저 getCookie 동작과 동일).
- `cookieSsId` 디코딩 값은 `JSESSIONID` 와 동일하다(세션당 RSA 키 바인딩).
- `chkUser.do` 응답의 `SSO_ID` 는 `result === "success"` 일 때만 `USER_SSO_YN`, 아니면 `"N"` 을 보낸다(응답 원문을 그대로 넣으면 로그인 실패).
- `/login` 은 `redirect: "manual"` 로 받아 302 의 Set-Cookie(인증 세션 회전)를 직접 흡수해야 한다. fetch 의 `redirect: "follow"` 는 리다이렉트 중간 쿠키를 버린다.

## 확장 수집 범위 및 전 업체 배치 (2026-08-30)

원본 `/fit/research` 화면의 11열 월별 청구정보와 선택 월 15분 그리드를 지원하기 위해 수집 범위를 확장했다.

| 데이터 | 파워플래너 원본 | 저장 테이블 |
| --- | --- | --- |
| 스마트뷰 요약 | `POST /rm/getRM0101.do` | `kepco_summary` |
| 계약·요금제 | `POST /rm/rm0101_contract_info.do` | `kepco_contract` |
| 일 합계 | `POST /rs/rs0101N_total.do` | `kepco_daily_total` |
| 1시간 집계 24건 | `POST /rs/rs0101N_hour.do` | `kepco_hourly` |
| 15분 시계열 96건/일 | `POST /rs/rs0101N_chart.do`의 `list1` | `kepco_interval` |
| 월별 청구 개요 12건 | `POST /cc/cc0102Info.do` | `kepco_billing` |
| 상세 청구·부하대별 사용량 | `GET /cc/cc0103.do?yymm=YYYY.MM` HTML | `kepco_billing` |

- `db/migrations/005_kepco_detail.sql`이 확장 테이블과 1시간 집계 보강 컬럼을 만든다.
- `src/lib/kepco/client.ts`는 순차 요청으로 서비스 부하와 쿠키 경쟁을 줄인다.
- 15분 API가 빈 날짜 또는 일부 슬롯만 반환하면 96개 슬롯을 유지하되 해당 슬롯을 `no_data_yn=Y`로 저장한다. 이는 0 사용량을 조작하지 않고 “요청 성공·계측 없음”을 명시한다.
- `src/lib/kepco/parse.ts`는 외부 HTML을 실행하지 않고 id 기반 텍스트만 파싱한다.
- 상세 API는 정규화 필드만 반환하며 `raw_json`은 서버 DB에만 보존한다.

### 장시간 배치

```shell
# 기본 요약/시간/월별 수집 — 겹치지 않는 fid 범위로 분할 가능
node scripts/kepco-collect-all.mjs --min-fid 800 --max-fid 2000 --worker high --delay 1200
node scripts/kepco-collect-all.mjs --min-fid 0 --max-fid 799 --worker low --delay 1200

# 기본 적재 완료 업체의 계약/일합계/15분 당일/청구 상세 보강
node scripts/kepco-enrich-all.mjs --worker detail --delay 1500

# 선택 월 전체 15분 자료 백필(list1+list2를 함께 저장해 호출 수 절감)
node scripts/kepco-backfill-interval.mjs --month YYYYMM --request-delay 1200

# 자동 파이프라인은 성공 업체 수가 비슷한 세 비중첩 fid 범위로 백필 후 최종 누락만 순차 재처리
node scripts/kepco-finish-pipeline.mjs

# 전체 완전성·96슬롯/일·비밀번호 비포함 검증
node scripts/kepco-verify.mjs
```

안전 정책:

- `login_failed`는 기본 실행에서 재시도하지 않는다. 전체 배치 후 최초 실패가 정확히 1회이고 미적재인 업체만 단일 작업자·3초 간격으로 한 차례 재확인한다.
- 네트워크 등 `error`는 명시적 `--retry-failed` 실행에서 한 차례 재시도한다.
- 상세 보강과 월 백필은 동일 업체 세션 교체를 막기 위해 서로 다른 단계에서 실행한다.
- coordinator는 `data/kepco-pipeline.lock`에 자신과 worker PID를 기록하며, 이 중 하나라도 실행 중이면 `POST /api/kepco/collect`는 409로 수동 수집을 차단한다.
- 진행 파일과 로그는 `data/kepco-*.json`, `data/kepco-*.log`에 저장하며 비밀번호를 출력하지 않는다.
