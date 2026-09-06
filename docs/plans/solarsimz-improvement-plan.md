# SolarSimz 개선·보완 실행계획

작성일: 2026-09-07

기준 커밋: `aaf396a2a7e52b4d5451a7db43b78c71932d2fcf`

기준 평가: [70점 프로젝트 평가](/Users/user01/Desktop/SolarSimz/docs/audit/2026-09-06/project-evaluation.md)

권장 제품 단계: **제한된 고객 파일럿**

## 1. 목표

현재 SolarSimz는 화면 복제, 시설 CRUD, 한전 데이터 적재, 테스트 기반이 이미 갖춰진 MVP다. 다음 개발의 목적은 기능 수를 늘리는 것이 아니라 다음 네 가지를 운영 가능한 한 흐름으로 만드는 것이다.

1. 모든 실제 업무 데이터는 서버 세션과 업체 접근 범위 안에서만 조회·변경한다.
2. 고객정보는 공개 파일과 브라우저 번들에 포함하지 않는다.
3. 업체 등록·수정과 한전 수집 결과가 DB를 기준으로 일관되게 유지된다.
4. 화면 값의 출처, 측정 시각, 수집 시각, 품질 상태를 사용자가 구분할 수 있다.

완료 시 기대 상태는 “공개 가능한 합성 데모”와 “로그인한 파일럿 고객용 실데이터 화면”이 명확히 분리된 서비스다. 실제 물리 설비 제어, 다중 서버 확장, 전 고객사 동시 상용화는 이번 계획의 완료 조건에 넣지 않는다.

## 2. 현재 확인된 기준선

| 영역 | 현재 상태 | 개선 방향 |
|---|---|---|
| 시설관리 | 세션, 역할, 테넌트 격리, 동시 수정 충돌, 감사 로그 구현 | 검증된 패턴을 업체·한전 API에 재사용 |
| FIT 로그인 | 빈 값만 검사한 뒤 `/fit/peak`로 이동 | `/api/tokens`의 실제 로그인과 HttpOnly 세션으로 통합 |
| 업체 API | 익명 목록 조회와 등록 가능 | 역할과 업체 접근 범위를 API·저장소 양쪽에서 검사 |
| 업체 모델 | `firms`에 `tenant_id` 또는 접근 매핑이 없음 | `tenant_firm_access`로 조직별 허용 업체를 명시 |
| 업체 데이터 원본 | DB와 `FIRM_ROWS` 정적 JSON이 동시에 권위 원본 역할 | DB 한 곳으로 통일, 정적 파일은 완전 합성 fixture만 허용 |
| 업체 수정 | 신규 등록만 DB 저장, 기존 편집은 닫기만 수행 | PATCH, version, 감사 로그, 재조회 연결 |
| 한전 수집 | 실제 수집 코드와 대규모 적재 데이터 존재 | 엄격한 요청 스키마, 업체 권한, 작업 큐, 타임아웃과 중복 방지 추가 |
| 관제·피크 지표 | 실데이터와 데모 상수가 혼재 | `DEMO/MEASURED/ESTIMATED/STALE/NO_DATA`를 데이터와 함께 전달 |
| 모바일 | `/fit/firm`의 넓은 표와 레이아웃이 390px에서 잘림 | 모바일 카드 또는 축약 표, 한 열 편집 폼 적용 |
| 운영 | 로컬 검증은 충실하나 CI·자동 백업·실행 감시 증거 부족 | PR 검사, 마이그레이션 리허설, 수집 감시, 복구 시험 추가 |

핵심 구조 문제는 [`firms`](/Users/user01/Desktop/SolarSimz/db/migrations/006_firms.sql:12)가 어느 테넌트의 업체인지 표현하지 못하는 반면, 세션은 [`tenant_id`](/Users/user01/Desktop/SolarSimz/src/lib/auth.ts:54)를 보유한다는 점이다. `requirePermission()`만 API에 붙이면 익명 접근은 막을 수 있지만, 로그인한 사용자가 허가받지 않은 업체를 보는 문제는 남는다.

## 3. 권장 목표 구조

```text
FIT/ABC/WATT 로그인
        │
        ▼
HttpOnly DB 세션 ── 역할 권한(ADMIN/OPERATOR/VIEWER)
        │
        ▼
tenant_firm_access ── 요청한 fid가 현재 조직에 허용됐는지 검사
        │
        ├── Firm DAL ── 목록/상세/수정용 최소 DTO ── 브라우저
        │
        └── KEPCO DAL ── 조회 DTO / 수집 작업 등록
                              │
                              ▼
                       collection_jobs
                              │
                              ▼
                       별도 수집 worker
                              │
                              ▼
                 한전 원본 → 정규 DB → 출처·품질 포함 화면
```

권장 모델은 다음과 같다.

- `tenants`: 로그인 사용자가 속한 조직이다.
- `firms`: 전체 업체 마스터다.
- `tenant_firm_access`: 어떤 조직이 어떤 업체를 조회·관리할 수 있는지 나타낸다.
- 역할 권한: 허용 업체 안에서 수행 가능한 작업을 제한한다.
- 별도 필드 권한: 연락처·주소·고객번호 원문과 수집 실행 권한을 분리한다.

`tenant_id === fid`라는 현재 데모의 우연한 숫자 일치를 권한 규칙으로 사용하지 않는다. `ADMIN`도 자신의 조직에 매핑된 업체만 볼 수 있게 한다. 플랫폼 전체를 관리하는 계정이 필요하면 일반 `ADMIN`과 구분된 별도 운영 주체로 설계한다.

### 권한 정책 초안

| 주체 | 허가 업체 요약 | 연락처·주소·고객번호 원문 | 업체 등록·수정 | 한전 조회 | 수집 실행 |
|---|---:|---:|---:|---:|---:|
| 비로그인 | 금지 | 금지 | 금지 | 금지 | 금지 |
| VIEWER | 허용 | 기본 마스킹 | 금지 | 허용 | 금지 |
| OPERATOR | 허용 | 업무 권한이 있을 때 허용 | 허용 | 허용 | 허용 |
| ADMIN | 허용 | 허용 | 허용 | 허용 | 허용 |
| 수집 worker | 배정 대상만 | 서버 내부 자격증명만 | 금지 | 배정 대상만 | 배정 작업만 |

초기 권한 문자열은 `firm:read`, `firm:pii:read`, `firm:create`, `firm:update`, `kepco:read`, `kepco:collect`로 확장한다. 삭제·복구는 업체 CRUD의 첫 릴리스에서 제외하고 필요성이 확인되면 별도 PR로 추가한다.

## 4. 작업 순서

### Wave 0. 노출 억제와 제품 상태 표시

예상: 0.5~1일. 인터넷에 배포된 인스턴스가 있다면 코드 작업보다 먼저 수행한다.

작업:

- 실제 업체정보가 포함된 배포의 접근 범위를 승인된 사용자로 제한한다.
- 보호가 완료될 때까지 업체 원문 다운로드와 수동 한전 수집 경로를 외부에서 호출하지 못하게 한다.
- 서버에 연결되지 않은 설정 화면에는 `데모` 또는 `새로고침 시 초기화`를 표시한다.
- 피크·절감·ROI·통합관제의 fixture 값에는 `데모 데이터`를 표시하고 실적 지표로 오인할 문구를 제거한다.
- 현재 배포 URL, 배포 SHA, 정적 번들 해시, 접근 제한 적용 시각을 운영 기록에 남긴다.

완료 기준:

- 공개 사용자가 실제 고객정보와 수집 작업에 접근할 수 없다.
- 저장하지 않는 화면이 `저장 완료`, fixture 화면이 `실시간`이라고 표시되지 않는다.
- 실제 데이터가 포함됐는지 불명확하면 합성 데이터로 확인될 때까지 실제 정보처럼 취급한다.

이 단계에서 Git 이력 재작성이나 운영 DB 초기화는 하지 않는다. 이미 배포된 자료의 처리 범위를 확인한 뒤 별도 승인과 백업을 거쳐 수행한다.

### PR-1. FIT 공통 로그인, 업체 범위, API 기본 거부

예상: 3~5일. 가장 먼저 병합할 코드 변경이다.

주요 수정 대상:

- [`src/lib/auth.ts`](/Users/user01/Desktop/SolarSimz/src/lib/auth.ts:11)
- [`src/components/fit/FitLoginForm.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/FitLoginForm.tsx:60)
- [`src/app/api/firm/route.ts`](/Users/user01/Desktop/SolarSimz/src/app/api/firm/route.ts:15)
- [`src/app/api/[...path]/route.ts`](/Users/user01/Desktop/SolarSimz/src/app/api/[...path]/route.ts:155)
- 신규 `db/migrations/007_tenant_firm_access.sql`
- 신규 `src/features/firms/authorization.server.ts`
- `tests/firm-api.test.ts`, `tests/kepco-api.test.ts`, FIT 로그인 E2E

구현 계획:

1. `tenant_firm_access(tenant_id, fid, can_view_pii, can_collect, created_at)`를 만든다. 두 키의 복합 기본키와 FK를 적용한다.
2. 마이그레이션 자체는 기존 업체 전체를 자동 허가하지 않는다. 데모 시드는 테넌트 `121`에 명시한 합성 업체만 연결하고, 실제 데이터 연결은 별도 명령에서 `--tenant`와 입력 목록을 요구한다.
3. `auth.ts` 권한표에 업체·한전 권한을 추가한다. VIEWER는 읽기만, OPERATOR는 허가 업체의 수정과 단일 수집, ADMIN은 허가 업체의 관리 권한을 가진다.
4. FIT 로그인은 기존 `/api/tokens`를 호출하고 성공했을 때만 이동한다. 실패 메시지, 제출 중 상태, 실제 로그아웃을 공통화한다.
5. `/api/firm`, `/api/firm/*`, `/api/kepco/status`, `/api/kepco/firm/:fid`, `/api/kepco/collect`에 세션·역할·업체 범위 검사를 적용한다.
6. 권한 검사는 UI, Route Handler, repository/DAL에서 반복 방어한다. 레이아웃 리다이렉트만 보안 경계로 사용하지 않는다.
7. 현재 catch-all의 실제 업무 분기를 명시적인 Route Handler로 이동한다. mock 호환 분기는 읽기 전용 allowlist로 한정한다.
8. 오류 계약을 `apiSuccess`와 `apiError` 형태로 통일하고 보호 응답에 `private, no-store`를 적용한다.

합격 기준:

- 익명 사용자의 보호 GET·POST·PATCH·DELETE는 401이고 DB 변경과 외부 요청이 0건이다.
- VIEWER의 모든 쓰기와 수집 요청은 입력 내용과 무관하게 403이다.
- 현재 조직에 매핑되지 않은 `fid`는 조회·수정·수집할 수 없다. 외부 응답은 한 가지 403/404 정책으로 통일한다.
- OPERATOR는 허가받은 업체만 조회하고 단일 업체 수집 작업을 요청할 수 있다.
- 잘못된 FIT 로그인은 `/fit/peak`로 이동하지 않고 세션 쿠키를 만들지 않는다.
- 로그아웃·만료 세션으로 동일 요청을 재실행하면 401이다.
- 정상 권한 시나리오도 통과한다. 요청을 모두 막은 구현은 합격이 아니다.

최소 브라우저 확인:

- `operator / demo`: 로그인 → 허가 업체 조회 → 업체 생성/수정 또는 수집 버튼 사용 → 새로고침 후 상태 유지.
- `viewer / demo`: 로그인 → 허가 업체 조회 → 편집·수집 버튼 미노출 또는 비활성화 → 개발자 도구의 직접 POST/PATCH가 모두 403.
- 시크릿 창: 보호 페이지와 API 접근 시 로그인 화면 또는 401.

### PR-2. 고객정보를 서버 전용 데이터 경계로 이동

예상: 2~4일. PR-1과 같은 공개 재개 게이트에 포함한다.

주요 수정 대상:

- [`src/lib/fit-mocks/firm.ts`](/Users/user01/Desktop/SolarSimz/src/lib/fit-mocks/firm.ts:11)
- `src/lib/fit-mocks/firm-rows.json`
- [`src/app/(fit-app)/fit/layout.tsx`](</Users/user01/Desktop/SolarSimz/src/app/(fit-app)/fit/layout.tsx:3>)
- [`src/app/(abc)/abc/layout.tsx`](</Users/user01/Desktop/SolarSimz/src/app/(abc)/abc/layout.tsx:2>)
- [`scripts/seed-firms.mjs`](/Users/user01/Desktop/SolarSimz/scripts/seed-firms.mjs:1)
- 신규 `src/features/firms/dto.server.ts`
- 신규 `scripts/check-public-data.mjs`

구현 계획:

1. 계약 종류·서비스 상태 같은 공개 상수를 실제 업체 배열과 분리한다.
2. 실제 업체 시드 입력은 저장소 밖의 명시적 경로로 받는다. 저장소에 남길 fixture는 개인·고객정보가 전혀 없는 합성 데이터로 교체한다.
3. 업체 repository와 DTO 모듈에 `server-only` 경계를 적용한다.
4. 레이아웃에는 허가된 `fid`와 표시 이름만 전달한다. 업체 목록에는 필요한 상태 필드만, 상세에는 권한에 따라 마스킹한 필드만 반환한다.
5. `/api/firm`의 전체 1.07MB 응답을 검색·페이지네이션 목록과 단일 상세 API로 분리한다.
6. `.next/static`, HTML, RSC, JSON, 소스맵, `public/`에서 합성 탐지 문자열과 금지 필드가 발견되면 실패하는 검사를 추가한다.
7. 이미 공개된 Git 이력·이전 배포 번들·CDN·스크린샷의 처리 필요성을 별도 비공개 기록으로 남긴다. 현재 파일 삭제만으로 해결됐다고 판단하지 않는다.

합격 기준:

- 쿠키 없는 요청으로 업체 연락처·주소·고객번호 원문을 받을 수 없다.
- 프로덕션 빌드의 공개 JavaScript에 검사 대상 고객정보와 시드 탐지 문자열이 없다.
- Client Component가 전체 업체 레코드 타입을 받을 수 없다.
- VIEWER 목록에는 마스킹 정책을 적용하고 OPERATOR/ADMIN도 현재 조직의 허가 업체만 받는다.
- 한전 비밀번호와 원문 `raw_json`은 어떤 DTO에도 포함되지 않는다.

PR-1과 PR-2가 모두 통과하기 전에는 실제 고객 데이터를 사용하는 공개 접근을 재개하지 않는다.

### PR-3. 업체 DB를 유일한 권위 원본으로 만들고 수정 저장 완성

예상: 4~6일.

주요 수정 대상:

- [`src/features/firms/schema.ts`](/Users/user01/Desktop/SolarSimz/src/features/firms/schema.ts:1)
- [`src/features/firms/repository.ts`](/Users/user01/Desktop/SolarSimz/src/features/firms/repository.ts:16)
- [`src/components/fit/firm/FirmEditModal.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/firm/FirmEditModal.tsx:191)
- [`src/components/fit/firm/FirmManager.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/firm/FirmManager.tsx:19)
- FIT·ABC 상단 업체 선택 레이아웃
- 한전 status·수집 대상 조회
- 신규 `db/migrations/008_firm_integrity.sql`
- 신규 `/api/firms`와 `/api/firms/[fid]`, 기존 `/api/firm` 호환 계층

구현 계획:

1. `firms`에 `version`, `created_at/by`, `updated_at/by`, 필요 시 `deleted_at/by`를 추가한다.
2. 업체 생성 트랜잭션에서 현재 테넌트의 `tenant_firm_access`도 함께 만든다.
3. 목록 GET, 상세 GET, 생성 POST, 부분 수정 PATCH를 strict Zod 스키마와 허용 필드 목록으로 구현한다.
4. 수정은 `fid + version` 조건으로 처리하고 충돌 시 409와 최신 데이터 재조회 정보를 반환한다.
5. 업체 변경 전후를 기존 `audit_logs`에 `entity_type='FIRM'`으로 남긴다. 비밀번호와 필요 없는 개인정보 전체를 감사 로그에 복제하지 않는다.
6. `FirmEditModal`의 create/edit가 모두 API 성공 후 닫히게 하고, 실패 시 입력을 보존한다.
7. FIT·ABC 선택 목록, 업체관리, 한전 수집 대상이 모두 같은 DB repository를 사용하게 한다.
8. ‘엑셀’은 실제 CSV/XLSX 다운로드로 구현하거나 이름을 ‘인쇄’로 바꾼다.

합격 기준:

- 합성 업체 등록·수정 결과가 새로고침, 로그아웃/로그인, 다른 브라우저, 시험 서버 재시작 후 유지된다.
- 새 업체가 FIT·ABC 선택 목록과 허가된 한전 수집 목록에 일관되게 나타난다.
- 두 세션이 같은 버전을 수정하면 뒤 요청이 409이며 먼저 저장된 값은 손실되지 않는다.
- 권한 거부·검증 실패·충돌 요청은 업체 DB와 감사 로그에 잘못된 성공 기록을 남기지 않는다.
- VIEWER UI에는 변경 동작이 없고 직접 API 호출도 403이다.
- 기존 정적 `/firm.html`은 보호된 API를 쓰는 호환 화면으로 남기거나 명시적으로 사용 중단한다. 별도 메모리 상태를 권위 원본으로 유지하지 않는다.

### PR-4. 한전 수집을 HTTP 요청에서 작업 단위로 분리

예상: 5~8일.

주요 수정 대상:

- [`src/app/api/[...path]/route.ts`](/Users/user01/Desktop/SolarSimz/src/app/api/[...path]/route.ts:239)
- [`src/lib/kepco/collect.ts`](/Users/user01/Desktop/SolarSimz/src/lib/kepco/collect.ts:55)
- [`src/lib/kepco/client.ts`](/Users/user01/Desktop/SolarSimz/src/lib/kepco/client.ts:20)
- [`src/lib/kepco/batch-lock.server.ts`](/Users/user01/Desktop/SolarSimz/src/lib/kepco/batch-lock.server.ts:10)
- [`src/components/fit/research/ResearchPanel.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/research/ResearchPanel.tsx:112)
- 신규 `db/migrations/009_collection_jobs.sql`
- 신규 `src/features/kepco/jobs.repository.ts`, `scripts/kepco-worker.mjs`

구현 계획:

1. 단일 수집 요청 스키마는 `{ fid, mode: 'single' }`로 고정한다. malformed JSON, 잘못된 Content-Type, 빈 객체를 기존 오류 코드 그대로 거부한다.
2. 전체 배치는 별도 관리자/worker 경로로 분리한다. `readJson().catch(() => ({}))`와 `fid 없음 = 전체 수집` 규칙을 제거한다.
3. API는 외부 수집을 끝까지 기다리지 않고 `collection_jobs`에 등록한 뒤 `202 + jobId`를 반환한다.
4. 작업 상태를 `QUEUED → RUNNING → SUCCEEDED | PARTIAL | FAILED | CANCELLED`로 저장한다.
5. 동일 업체·대상 기간의 활성 작업에는 유일 제약 또는 DB 잠금을 적용한다. 프로세스 PID 파일만으로 중복을 막지 않는다.
6. worker가 한전 로그인을 수행하고 업체별 타임아웃, 제한된 재시도, 계정 잠금 방지 간격을 적용한다.
7. 각 작업에 요청자, 대상 업체, 시작·종료, 수집 범위, 성공·누락·중복·실패 건수, 오류 분류를 기록한다. 자격증명과 원문 응답은 로그에 쓰지 않는다.
8. 화면은 `요청 접수`, `수집 중`, `부분 성공`, `완료`, `실패`, `데이터 지연`을 구분한다. 작업 성공 시각과 최신 측정 시각도 분리한다.

합격 기준:

- 잘못된 JSON은 400, 잘못된 타입은 415/422, 본문 초과는 413이며 수집 작업이 0개다.
- VIEWER와 미허가 업체 요청은 각각 403/404이며 작업·외부 요청이 0개다.
- 중복 클릭은 하나의 활성 작업만 만든다.
- worker 재시작 후 QUEUED/RUNNING 작업의 복구 규칙이 동작한다.
- 네트워크 시간 초과, 로그인 실패, 일부 데이터 누락이 서로 다른 상태와 메시지로 기록된다.
- 실제 한전 계정 검증은 승인된 시험 업체 하나로 제한하고 자동 테스트는 외부 요청을 mock 처리한다.

### PR-5. 선택 업체 한 곳의 실데이터를 피크·관제 화면에 연결

예상: 5~8일. 데이터 사용 승인과 PR-4 완료가 선행 조건이다.

주요 수정 대상:

- [`src/app/(fit-app)/fit/peak/page.tsx`](</Users/user01/Desktop/SolarSimz/src/app/(fit-app)/fit/peak/page.tsx:1>)
- [`src/components/fit/stat/StatDashboard.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/stat/StatDashboard.tsx:32)
- `src/lib/fit-mocks/peak.ts`, `src/lib/fit-mocks/stat.ts`
- 신규 `src/features/energy/measurements.repository.ts`
- 신규 `src/features/energy/dashboard-dto.server.ts`

구현 계획:

1. 승인된 업체 1곳과 계측 흐름 1개를 먼저 연결한다. 전체 화면 동시 전환은 하지 않는다.
2. DTO에 `source`, `observedAt`, `ingestedAt`, `quality`, `unit`, `calculationVersion`을 포함한다.
3. `kW`, `kWh`, 누적 검침, 15분 구간값, 서울 시간과 UTC를 타입·계산 단계에서 구분한다.
4. 데이터가 없거나 오래되면 0 또는 데모 값으로 대체하지 않고 `NO_DATA` 또는 `STALE`로 표시한다.
5. 데모 화면은 합성 fixture와 `DEMO` 배지를 유지한다. 실제 업체 선택 시에만 `MEASURED` 값을 표시한다.
6. ROI, 절감금액, 데이터 정확도는 계산 기준과 검증 자료가 마련될 때까지 `추정` 또는 데모로 표시한다.
7. 같은 원본을 재처리했을 때 중복 저장되지 않도록 업체·측정점·측정시각의 고유 기준을 적용한다.

합격 기준:

- 승인 원본의 표본 기간을 원본 → DB → API DTO → 화면 값까지 대조해 값·단위·시각이 일치한다.
- 같은 원본을 두 번 처리해도 집계가 증가하지 않는다.
- 미수신, 지연, 계측 없음, 실제 0이 서로 다르게 표시된다.
- 업체를 바꾸면 이전 업체 값이 잠시라도 현재 업체의 실측값처럼 남지 않는다.
- 화면 캡처와 함께 사용한 업체·기간·SHA·대조 결과를 비공개 검증 기록으로 남긴다.

### PR-6. 업체관리 모바일·접근성 개선

예상: 3~4일. PR-3의 화면 계약 이후 진행하며 PR-4/5와 병행할 수 있다.

주요 수정 대상:

- [`src/components/fit/firm/FirmManager.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/firm/FirmManager.tsx:94)
- [`src/components/fit/firm/FirmEditModal.tsx`](/Users/user01/Desktop/SolarSimz/src/components/fit/firm/FirmEditModal.tsx:218)
- [`public/fit/assets/css/deskLib.css`](/Users/user01/Desktop/SolarSimz/public/fit/assets/css/deskLib.css:115)
- [`public/fit/clone-css/firm-extras.css`](/Users/user01/Desktop/SolarSimz/public/fit/clone-css/firm-extras.css:20)
- 공용 Pagination과 모달 버튼

구현 계획:

1. 360/390px에서는 업체명·상태·핵심 작업 중심의 카드 또는 축약 표를 제공한다.
2. 숫자 비교가 필요한 표는 자체 가로 스크롤을 허용하되 페이지 전체와 검색·저장 버튼이 밀리지 않게 한다.
3. 편집 폼을 모바일 한 열로 만들고 긴 주소·고객번호·오류 문구가 폭을 넘지 않게 한다.
4. `span role='button'`과 클릭 전용 아이콘을 실제 `button`으로 바꾸거나 `tabIndex`, Enter/Space, 포커스 표시를 완성한다.
5. 로그인 입력에 label 또는 `aria-label`을 연결하고 모달의 초기 포커스, 포커스 트랩, 닫힌 뒤 복귀 위치를 확인한다.
6. 로딩·빈 데이터·권한 없음·긴 업체명·서버 오류 상태를 같은 화면 폭에서 검증한다.

합격 기준:

- 360, 390, 768, 1280px에서 로그인 → 검색 → 상세 → 수정 → 저장 → 재조회 흐름을 끝까지 수행한다.
- 페이지 수준의 의도하지 않은 가로 넘침이 없고, 내부 표 스크롤은 마지막 열까지 접근 가능하다.
- Tab, Shift+Tab, Enter, Space, Escape만으로 핵심 흐름을 수행할 수 있다.
- VIEWER의 비활성 필드는 이유를 스크린리더 텍스트나 상태 안내로 이해할 수 있다.
- 모바일 Safari와 Chromium에서 핵심 시나리오를 각각 한 번 확인한다.

### PR-7. CI, 마이그레이션, 백업·복구, 수집 감시

예상: 3~5일과 파일럿 관찰 7일.

작업:

1. PR마다 `lint`, `typecheck`, 단위/API 테스트, production build, 권한 회귀, 공개 산출물 검사를 자동 실행한다.
2. 핵심 E2E는 PR에서 실행하고 전체 63개 이상 회귀는 main 또는 nightly에서 실행한다.
3. 1.15GB급 기존 DB 사본에 `007~009` 마이그레이션을 적용해 소요 시간, WAL 증가, 실패 복구를 측정한다.
4. 변경 전 SQLite online backup 또는 정지 상태의 DB/WAL/SHM 일관 백업을 자동화한다.
5. 백업 파일로 별도 경로에 복원하고 테이블 건수·대표 조회·로그인을 검사한다.
6. 마지막 스케줄 실행, 최근 성공 수집, 최신 측정 시각, 연속 실패, 큐 정체를 모니터링한다.
7. 수집 실패 알림에는 업체 식별 최소 정보, 오류 분류, jobId, 재시도 가능 여부를 포함하되 자격증명·원문 응답을 넣지 않는다.
8. `agentation`과 원본 미러 자산의 배포 조건을 확인하고 제품 배포물 포함 여부를 기록한다.

합격 기준:

- 최신 커밋의 자동 검사와 production build가 모두 통과한다.
- 빈 DB와 기존 DB 사본 모두 마이그레이션되며 재실행 결과가 정의되어 있다.
- 백업으로 새 DB 경로에 복원한 뒤 로그인·업체 조회·한전 조회가 성공한다.
- 시험 장애를 주입했을 때 알림이 담당 경로에 도착하고 정상 복구 후 누락 기간 처리 결과가 남는다.
- 7일 파일럿에서 예정 실행, 성공·부분 성공·실패, 데이터 지연을 작업 기록으로 설명할 수 있다.

## 5. PR 의존성과 예상 일정

| 주차 | 작업 | 병행 가능 |
|---|---|---|
| 1주차 | Wave 0, PR-1 인증·업체 범위 | PR-2의 합성 데이터 준비 |
| 2주차 | PR-2 고객정보 경계, PR-3 업체 저장 시작 | CI 기본 골격 |
| 3주차 | PR-3 완료, PR-4 수집 작업화 | PR-6 모바일 시작 |
| 4주차 | PR-4 완료, PR-5 한 업체 실데이터 | PR-6 완료 |
| 5주차 | PR-5 대조 검증, PR-7 운영 자동화 | 전체 회귀 |
| 6주차 | 7일 파일럿 관찰과 잔여 결함 수정 | 없음 |

개발자 1명 기준 예비 범위는 4~6 개발주다. 한전 데이터 이용 승인, 배포 구조, 기존 데이터 정리 수준에 따라 늘어날 수 있다. 일정 단축이 필요하면 PR-5 이후를 미루고 PR-1~3까지 완료한 “보호된 업체관리 베타”를 먼저 배포한다.

## 6. 공통 테스트 매트릭스

| 시나리오 | 익명 | VIEWER | OPERATOR | ADMIN |
|---|---:|---:|---:|---:|
| 허가 업체 목록 | 401 | 200, 최소/마스킹 | 200 | 200 |
| 허가 업체 상세 | 401 | 200, 정책 필드만 | 200 | 200 |
| 미허가 업체 상세 | 401 | 403/404 | 403/404 | 403/404 |
| 업체 생성 | 401 | 403 | 201 | 201 |
| 업체 수정 | 401 | 403 | 200 | 200 |
| 한전 조회 | 401 | 200 | 200 | 200 |
| 단일 수집 작업 | 401 | 403 | 202 | 202 |
| 전체 수집 | 401 | 403 | 403 | 별도 승인 시 202 |
| 잘못된 입력 쓰기 | 401 | 403 우선 | 400/415/422 | 400/415/422 |
| 만료·로그아웃 후 요청 | 401 | 401 | 401 | 401 |

자동 테스트는 상태 코드만 보지 않는다. 거부된 요청에서 `firms`, `audit_logs`, `collection_jobs`, 한전 외부 호출 수가 변하지 않았는지도 확인한다.

각 PR의 필수 검증 명령은 다음과 같다.

```shell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

외부 한전 요청은 기본 테스트에서 차단하고 mock 어댑터로 성공·시간 초과·로그인 실패·부분 데이터·재시도 초과를 주입한다.

## 7. 배포 게이트

### Gate A. 보안 봉쇄 완료

- 익명 보호 API 401.
- VIEWER 쓰기 403.
- 교차 업체 접근 거부.
- 공개 번들·RSC·JSON에 보호할 고객정보 없음.
- 잘못된 수집 입력으로 작업이 만들어지지 않음.

PR-1과 PR-2가 모두 통과해야 한다.

### Gate B. 업체관리 베타

- 업체 등록·수정이 DB와 감사 로그에 저장됨.
- 새로고침·재로그인·재시작 후 유지됨.
- FIT·ABC·한전 대상 목록이 같은 DB 결과를 사용함.
- VIEWER는 조회 전용, OPERATOR는 허가 범위에서만 변경 가능.

PR-3과 PR-6의 핵심 업체관리 시나리오가 통과해야 한다.

### Gate C. 실데이터 파일럿

- 단일 업체 수집이 작업 큐를 거침.
- 원본·DB·화면 대조 통과.
- 측정 시각과 수집 시각, 실측과 데모, 지연과 0을 구분함.
- 중복 수집과 장애 복구 검증 완료.

PR-4와 PR-5가 통과해야 한다.

### Gate D. 고객 확대

- 기존 DB 사본 마이그레이션과 백업 복원 시험 완료.
- CI 전체 통과.
- 7일 파일럿에서 실패·지연·복구 이력을 설명 가능.
- 자산 라이선스와 실제 데이터 이용 범위 확인 완료.

PR-7과 운영 책임자 확인이 필요하다.

## 8. 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| `tenant`와 `firm`의 업무 의미를 잘못 매핑 | 로그인했지만 다른 고객 데이터 노출 | PR-1 시작 전에 실제 조직·업체 관계를 표로 확정하고 `tenant_firm_access`를 기본 거부로 설계 |
| 1.15GB SQLite 마이그레이션 실패 | 배포 지연 또는 DB 손상 | 운영 복사본 리허설, 일관 백업, 마이그레이션별 검증 쿼리와 중단·복구 절차 |
| 정적 WATT와 React FIT/ABC가 서로 다른 원본 사용 | 화면마다 업체·권한·상태가 다름 | DB repository와 DTO를 유일한 원본으로 정하고 정적 화면은 호환 API만 사용 |
| 외부 한전 로그인 반복으로 계정 잠금 | 수집 중단 | 업체별 속도 제한, 로그인 실패 자동 반복 금지, 제한 재시도, 작업 단위 관찰 가능성 |
| 긴 수집을 Next.js 요청 안에서 실행 | 타임아웃, 중복 실행, 서버 정체 | DB 작업 큐와 별도 worker로 분리 |
| 기존 공개 번들이 계속 CDN에 남음 | 코드 수정 후에도 과거 정보 접근 가능 | 배포 해시·CDN·소스맵·Git 이력 조사와 별도 제거 절차 |
| mock 화면을 실제 성과로 해석 | 고객 신뢰 저하 | 출처·품질 배지와 기준 시각 표시, 검증 전 ROI/절감은 추정 또는 데모 |
| 대형 컴포넌트 리팩터링이 기능 개발과 섞임 | 회귀와 리뷰 부담 증가 | 각 PR이 만지는 업무 흐름만 훅·폼·표로 분리하고 전면 재작성은 별도 작업으로 유지 |

## 9. 점수 개선 예상

점수는 작업 완료가 아니라 합격 기준을 실제 검증한 뒤 다시 산정한다.

| 완료 범위 | 기대 상태 | 예상 구간 |
|---|---|---:|
| PR-1~2 | 인증·고객정보 고위험 해소 | 78~82점 |
| PR-1~3 + PR-6 | 보호된 업체관리와 모바일 업무 완성 | 83~87점 |
| PR-1~7 + 7일 파일럿 | 실데이터·수집 운영·복구까지 검증 | 88~92점 |

90점에 가까워지려면 자동 테스트 통과 외에 실제 배포 SHA, 업체별 권한, 원본 데이터 대조, 장애 알림, 백업 복구의 실행 증거가 필요하다. 실제 전력 절감률과 매출 성과는 이 기술 점수와 별도 지표로 관리한다.

## 10. 지금 바로 시작할 첫 작업 묶음

첫 구현 PR은 다음 범위로 제한한다.

1. `tenant_firm_access` 마이그레이션과 합성 데모 매핑.
2. 업체·한전 권한 문자열과 repository 범위 검사.
3. FIT 로그인을 실제 `/api/tokens` 세션에 연결.
4. `/api/firm`과 한전 3개 경로의 익명·VIEWER·교차 업체 차단.
5. 거부 요청의 DB·외부 호출 무변경 테스트.
6. `operator / demo`, `viewer / demo` 최소 브라우저 검증.

이 PR에는 업체 수정 UI, 작업 큐, 모바일 CSS, 피크 실데이터 연결을 넣지 않는다. 첫 PR의 성공 기준은 “로그인한 올바른 주체만 허가된 업체 데이터에 접근한다” 하나다.

그 다음 PR에서 공개 번들의 업체 데이터 제거를 완료해야 외부 공개 게이트를 통과한다.

## 11. 이번 계획에서 제외한 작업

- 실제 설비 ON/OFF와 자동 피크 제어 명령.
- 모든 FIT·ABC·WATT 화면을 한 번에 실데이터로 교체.
- 승인 없는 실제 한전 계정의 부하·침투·반복 로그인 시험.
- 운영 DB를 데모 시드로 초기화하는 작업.
- 협업 확인 없는 Git 이력 재작성과 force-push.
- 사용 근거가 확인되지 않은 ROI·절감률을 성과 지표로 확정하는 작업.
- 트래픽·동시성 요구를 확인하지 않은 PostgreSQL 전면 전환.

## 12. 계획 완료 판단

이 계획은 아래 조건을 모두 충족할 때 완료다.

- 보호할 모든 API와 데이터 경로가 목록화되어 기본 거부 정책을 적용받는다.
- 익명·VIEWER·OPERATOR·ADMIN·미허가 업체 테스트가 자동화되어 있다.
- 공개 산출물에 실제 고객정보와 자격증명이 없다.
- 업체 저장이 영속적이고 모든 화면이 같은 업체 DB를 사용한다.
- 단일 업체 실데이터가 출처·시각·품질과 함께 표시된다.
- 수집 접수와 완료가 분리되고 실패·중복·재시작을 처리한다.
- 모바일에서 업체 조회·수정·저장을 끝까지 수행한다.
- 마이그레이션과 백업 복원을 실제 DB 사본으로 검증한다.
- 최신 배포 SHA에서 전체 테스트와 7일 파일럿 관찰을 통과한다.

[계획 폴더](/Users/user01/Desktop/SolarSimz/docs/plans) · [평가 결과 폴더](/Users/user01/Desktop/SolarSimz/docs/audit/2026-09-06)
