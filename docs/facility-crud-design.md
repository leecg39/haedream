# 주요설비 CRUD 설계 및 운영 가이드

## 0. 프로젝트 정보

- 프로젝트: SolarSimz
- 목적: 에너지 통합관제 화면과 주요설비 운영 데이터 관리
- 핵심 데이터: 주요설비(`facilities`)와 관계 데이터인 게이트웨이
- 기술 스택: Next.js 16.3.3, React 19.2.8, TypeScript 5, Zod 4,
  better-sqlite3 13, Vitest 4, Playwright 1.62
- DB: 단일 인스턴스 영속 볼륨의 SQLite
- 역할: 관리자, 운영자, 조회자
- 언어/시간: 한국어, 화면 `Asia/Seoul`, DB UTC ISO 8601

## 1. 문서 분석과 적용 범위

`egg_ocr.pdf`는 에너지 통합관제 플랫폼의 대시보드, 피크, 전력,
공정 계통, 주요설비, 보고서, 환경설정을 설명한다. 이 중 입력 필드와
변경 규칙이 가장 구체적인 `설비관리 > 개별 설비설정`을 운영형 CRUD의
핵심 리소스로 선정했다.

PDF에서 확인한 필드는 다음과 같다.

- 그룹 이름, 설비 이름
- 우선순위(피크 자동제어 오름차순)
- 기본 설정 온도
- 피크 제어 수치
- 게이트웨이, 노드 번호, 채널 번호
- 자동/수동 제어 모드 및 활성 상태

게이트웨이는 설비의 관계 데이터로 구현했다. 사용자·알람·RTU·모드버스
설정은 PDF에 별도 관리 화면으로 존재하지만 이번 핵심 설비 CRUD에서는
관계 또는 후속 확장 도메인으로 유지한다.

## 2. 적용한 가정

- 단일 배포 인스턴스와 SQLite를 기본 운영 환경으로 사용한다.
- 화면 언어는 한국어, 표시 시간대는 `Asia/Seoul`, DB 시각은 UTC ISO 8601이다.
- PDF의 업체는 기존 fixture와 동일한 대산금속(`tenant_id=121`)이다.
- 설비 코드는 테넌트 안에서 대소문자 구분 없이 고유하며 삭제 후에도
  복구 가능성을 위해 재사용하지 않는다.
- 게이트웨이를 지정하지 않으면 노드와 채널도 비워야 한다. 지정하는
  경우 세 필드를 모두 입력한다.
- 활성 설비의 게이트웨이·노드·채널 조합은 테넌트 안에서 고유하다.
  설비를 소프트 삭제하면 연결 위치를 다른 설비에 할당할 수 있으며,
  충돌하는 위치가 재할당된 경우 기존 설비는 충돌을 해소하기 전까지
  복구할 수 없다.
- 활성 설비가 연결된 게이트웨이는 비활성화할 수 없다.
- 영구 삭제는 관리자만 가능하고 먼저 소프트 삭제되어 있어야 한다.
- 설비별 개인 소유자는 두지 않는다. 모든 설비는 테넌트 소유이며
  역할 권한이 있는 관리자·운영자가 같은 테넌트 안에서 공동 관리한다.

## 3. 데이터 모델

### tenants

업체와 시간대를 보관한다. 모든 업무 데이터는 `tenant_id`로 격리된다.

### users / sessions

- 역할: `ADMIN`, `OPERATOR`, `VIEWER`
- 비밀번호는 bcrypt 해시로 저장한다.
- 세션 토큰 원문은 HttpOnly 쿠키에만 두고 DB에는 SHA-256 해시를 저장한다.
- 기본 만료 시간은 8시간이며 로그아웃 시 폐기한다.

### gateways

테넌트 내 고유 코드, 이름, 활성 상태를 가진다. 설비는 같은 테넌트의
활성 게이트웨이에만 연결할 수 있다.

### facilities

- 고유 ID와 테넌트 내 고유 코드
- 이름, 공정, 그룹
- 우선순위 `0..254`
- 기본 설정 온도 `0..999`
- 피크 제어 수치 `0..100`
- 게이트웨이/노드 `1..10`/채널 `1..32`
- 자동·수동 모드, 활성·비활성 상태
- 낙관적 잠금용 `version`
- 코드·테넌트·최초 등록자·최초 등록일은 생성 후 변경 불가
- 등록/수정/삭제 시각과 사용자
- `deleted_at` 기반 소프트 삭제

### audit_logs

등록, 수정, 삭제, 복구, 영구 삭제, 로그인, 로그아웃 이벤트를 저장한다.
설비 이벤트는 변경 전후 JSON, 사용자, 요청 ID와 시각을 포함한다.
감사 로그는 DB 트리거로 수정·삭제를 차단하는 append-only 데이터다.

## 4. 권한표

| 작업 | 관리자 | 운영자 | 조회자 |
|---|:---:|:---:|:---:|
| 운영 데이터 조회 | O | O | O |
| 등록/수정 | O | O | X |
| 소프트 삭제 | O | O | X |
| 삭제 데이터 조회/복구 | O | O | X |
| 영구 삭제 | O | X | X |

권한과 테넌트 범위는 모든 API에서 서버가 다시 검사한다. 클라이언트의
버튼 숨김은 편의 기능일 뿐 보안 경계가 아니다.

## 5. API

신규 인증·설비 CRUD 응답은 `ok`, `requestId`, `data` 또는 `error`를
사용한다. 원본 정적 화면용 레거시 mock 응답은 호환성을 위해 기존 모양을
유지하며 명시된 allowlist 밖의 경로는 404를 반환한다.

- `POST /api/tokens` 로그인 및 세션 쿠키 발급
- `GET /api/auth/session` 현재 사용자
- `POST /api/auth/logout` 세션 폐기
- `GET /api/gateways` 게이트웨이·공정 선택 데이터
- `GET /api/facilities` 검색·필터·정렬·페이지네이션
- `POST /api/facilities` 등록
- `GET /api/facilities/{id}` 상세
- `PATCH /api/facilities/{id}` 부분 수정과 버전 충돌 검사
- `DELETE /api/facilities/{id}` 현재 버전을 확인한 소프트 삭제
- `POST /api/facilities/{id}/restore` 현재 버전을 확인한 복구
- `DELETE /api/facilities/{id}/purge` 영구 삭제

전체 계약은 `docs/openapi/facilities.yaml`에 정의한다.
목록의 `from`/`to`는 `updated_at` 기준 UTC ISO 8601이며, 화면의 한국
달력 날짜는 서울 시간대의 시작·종료 시각으로 변환해 전달한다.

## 6. 보안

- HttpOnly, SameSite=Lax 세션 쿠키
- 서버 RBAC 및 요청 세션의 `tenant_id` 강제 사용으로 IDOR 방지
- strict Zod 허용 목록으로 알 수 없는 필드와 mass assignment 거부
- prepared statement와 정렬 컬럼 허용 목록으로 SQL injection 방지
- React 기본 escaping으로 XSS 방지
- 변경 요청의 `Origin`/`Sec-Fetch-Site` 검사로 CSRF 방어
- JSON 변경 요청은 `application/json`만 허용하고 본문을 64KB로 제한
- 로그인과 CRUD 요청에 인메모리 속도 제한
- 오류 응답에 스택·SQL·비밀번호·세션 토큰 비노출
- 예상하지 못한 서버 오류는 요청 ID와 오류 타입만 구조화 로그로 남기고,
  사용자 입력·비밀번호·세션·설비 상세 값은 기록하지 않는다.
- 영구 삭제 시 설비 코드 입력과 `x-confirm-purge` 서버 재확인
- 모든 신규 CRUD 응답은 본문과 `X-Request-Id` 헤더에 요청 ID를 반환
- 사용자별 목록과 상세 응답은 `private, no-store`로 캐시하지 않는다.
  변경 직후 클라이언트가 목록을 다시 조회하므로 별도 무효화 계층은 없다.

## 7. 실행

```bash
npm install
npm run db:setup:demo
npm run dev -- -p 3456
```

- 로그인: `admin`, `operator`, `viewer`
- 데모 비밀번호: `demo`
- 관리 화면: `http://localhost:3456/admin/facilities`

`db:seed:demo`는 `ALLOW_DEMO_SEED=true`를 명시적으로 설정하는 개발용
명령이다. 운영 배포에서는 `db:migrate`만 실행하고 별도 관리자 프로비저닝
절차를 사용해야 한다.

## 8. 검증

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

단위 테스트는 정규화·범위·관계·페이지 제한을, 저장소 통합 테스트는
제약조건·테넌트 격리·충돌·감사·삭제/복구를, API 테스트는 인증·권한·
CSRF·전체 CRUD를 검증한다. Playwright는 실제 화면에서
목록→등록→상세→수정→삭제→복구→영구 삭제와 조회자 권한을 검증한다.

## 9. 백업·복구와 마이그레이션

- 변경 전 `data/solarsimz.db`와 `-wal`, `-shm` 파일을 SQLite backup API
  또는 애플리케이션 중지 후 함께 백업한다.
- 마이그레이션은 `_migrations`에 적용 이력을 남기고 이름순으로 실행한다.
- `001` 롤백은 신규 테이블을 참조 역순(`audit_logs`, `facilities`,
  `gateways`, `sessions`, `users`, `tenants`)으로 제거한다. 운영 데이터가
  있으면 즉시 제거하지 말고 백업 DB로 복원한다.
- `002`는 사용자/세션/설비/감사 행의 테넌트 일치를 강제하는 인덱스와
  트리거다. 롤백 시 해당 트리거와 `uq_users_tenant_id` 인덱스를 제거한다.
- `003`은 활성 게이트웨이 연결 위치 고유성, 설비 식별자 불변성,
  버전 증가, 삭제 상태 일관성, 게이트웨이 비활성화 제한, 감사 로그
  append-only를 강제한다. 롤백 시 `003`에서 만든 트리거와
  `uq_facilities_active_gateway_endpoint`,
  `idx_facilities_tenant_updated`를 제거한다. 고유 인덱스 제거 전에는
  운영 중 중복 연결이 생기지 않도록 애플리케이션을 먼저 중지한다.
- 대량 데이터나 다중 서버 배포에서는 SQLite 대신 PostgreSQL로 이전하고
  인메모리 속도 제한을 Redis 기반으로 교체한다.

## 10. 알려진 제한과 다음 확장

- 데모 비밀번호 `demo`는 로컬 확인용이며 운영 보안 수준이 아니다.
- 속도 제한은 프로세스 단위라 여러 인스턴스 사이에 공유되지 않는다.
- 현재 SQLite 버전은 단일 Node.js 인스턴스와 영속 볼륨만 지원한다.
  운영에서는 절대 경로 `DATABASE_PATH`가 필수이고 Vercel 환경은 기본
  차단된다. 서버리스 또는 다중 replica에는 PostgreSQL 전환이 필요하다.
- PDF의 사용자, 알람, RTU, 모드버스, 시퀀스 설정은 이번 설비 CRUD의
  다음 독립 리소스 후보다. 현재 설비 CRUD와 동일한 테넌트/RBAC/감사
  기반 위에 추가할 수 있다.
- 시설 CRUD에는 파일 업로드 필드가 없으므로 업로드 MIME·용량 검증은
  적용 대상이 아니다. 향후 첨부 기능 추가 시 본문 제한, 실제 MIME 탐지,
  격리 저장소와 악성 파일 검사를 함께 도입해야 한다.
