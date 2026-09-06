# SolarSimz 개선 실행 태스크

기준 브랜치: `feat/fit-clone`

기준 커밋: `aaf396a2a7e52b4d5451a7db43b78c71932d2fcf`

상세 계획: [`docs/plans/solarsimz-improvement-plan.md`](../plans/solarsimz-improvement-plan.md)

## 실행 규칙

- 각 Phase는 기준 브랜치에서 분기한 별도 Git worktree에서 수행한다.
- Phase 1 이후 구현은 테스트를 먼저 실패시키는 RED → 최소 구현 GREEN → 정리 REFACTOR 순서를 따른다.
- 각 Phase는 테스트, 타입 검사, 린트, 프로덕션 빌드, 코드 리뷰를 통과해야 한다.
- 인증·권한·외부 수집 변경은 보안 검토까지 통과해야 한다.
- 검토에서 발견한 Critical/Important 문제는 같은 Phase에서 수정하고 전체 품질 검사를 다시 실행한다.
- 통합 기준 브랜치 병합과 원격 push는 오케스트레이터만 수행한다.

## Phase 0 — 평가와 실행 기준선

- [x] **P0-T1 프로젝트 전체 평가와 증거 기록**
  - 담당: orchestrator
  - Depends On: 없음
  - 산출물: `docs/audit/2026-09-06/project-evaluation.md`
  - 완료 기준: 점수, 근거, 재현 검증, 주요 위험이 기록되어 있다.

- [x] **P0-T2 개선 실행계획 작성**
  - 담당: orchestrator
  - Depends On: P0-T1
  - 산출물: `docs/plans/solarsimz-improvement-plan.md`
  - 완료 기준: 우선순위, 수정 대상, PR 단위, 합격 기준과 잔여 위험이 기록되어 있다.

## Phase 1 — FIT 인증·업체 범위·API 기본 거부

- [x] **P1-T1 세션 권한과 업체 접근 모델 구현**
  - 담당: backend/database
  - Depends On: P0-T2
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-1-auth-scope`
  - Branch: `phase/1-auth-scope`
  - 범위: `007_tenant_firm_access.sql`, demo seed, 업체·한전 권한 문자열, 서버 접근 검사
  - 완료 기준: 익명 401, VIEWER 쓰기 403, 교차 업체 403/404, 허가 업체 정상 성공, 거부 요청의 부수 효과 0건.

- [x] **P1-T2 FIT 실제 로그인과 보호 API 연결**
  - 담당: frontend/backend
  - Depends On: P1-T1
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-1-auth-scope`
  - Branch: `phase/1-auth-scope`
  - 범위: FIT 로그인, 업체 API, 한전 status/detail/collect, 보호 응답 캐시 정책
  - 완료 기준: 올바른 계정만 이동하고 HttpOnly 세션을 만들며, 보호 API가 역할·업체 범위를 일관되게 적용한다.

- [x] **P1-T3 권한 회귀·브라우저 검증**
  - 담당: test/security
  - Depends On: P1-T2
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-1-auth-scope`
  - Branch: `phase/1-auth-scope`
  - 완료 기준: API 권한 행렬, 로그아웃·만료 세션, operator/viewer/시크릿 브라우저 시나리오가 통과한다.

## Phase 2 — 고객정보 서버 경계와 공개 산출물 차단

- [x] **P2-T1 실제 업체 데이터를 클라이언트 코드에서 제거**
  - 담당: backend/frontend
  - Depends On: P1-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-2-data-boundary`
  - Branch: `phase/2-data-boundary`
  - 완료 기준: 레이아웃·Client Component·정적 자산에 실제 업체 배열이나 원문 고객정보가 포함되지 않는다.

- [x] **P2-T2 서버 전용 최소 DTO와 마스킹 구현**
  - 담당: backend/security
  - Depends On: P2-T1
  - 완료 기준: 목록·상세 응답은 역할과 업체 범위에 필요한 최소 필드만 포함하며 비밀번호와 원문 수집 응답을 직렬화하지 않는다.

- [x] **P2-T3 공개 빌드 정보 노출 검사 자동화**
  - 담당: test/security
  - Depends On: P2-T2
  - 완료 기준: `.next/static`, HTML, RSC, JSON, source map, `public/`의 금지 필드·탐지 문자열 검사가 CI에서 실패를 일으킨다.

## Phase 3 — 업체 DB 단일 원본과 수정 영속화

- [x] **P3-T1 업체 무결성·버전·감사 마이그레이션**
  - 담당: database/backend
  - Depends On: P2-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-3-firm-crud`
  - Branch: `phase/3-firm-crud`
  - 완료 기준: 버전, 작성·수정 주체/시각, 접근 매핑 생성이 트랜잭션으로 보장된다.

- [x] **P3-T2 업체 목록·상세·생성·수정 API 완성**
  - 담당: backend
  - Depends On: P3-T1
  - 완료 기준: strict 입력, 허용 필드, 409 충돌, 권한 거부 무변경, 감사 기록이 검증된다.

- [x] **P3-T3 FIT/ABC 업체 UI를 DB 원본에 연결**
  - 담당: frontend
  - Depends On: P3-T2
  - 완료 기준: 등록·수정 결과가 새로고침, 재로그인, 다른 브라우저, 시험 서버 재시작 후 유지된다.

## Phase 4 — 한전 수집 작업 큐와 worker

- [x] **P4-T1 수집 작업 스키마·repository·엄격한 요청 계약**
  - 담당: database/backend
  - Depends On: P3-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-4-kepco-jobs`
  - Branch: `phase/4-kepco-jobs`
  - 완료 기준: malformed/빈 입력은 전체 수집으로 바뀌지 않고, 단일 요청은 202와 jobId를 반환한다.

- [x] **P4-T2 별도 worker·중복 방지·재시도 구현**
  - 담당: backend
  - Depends On: P4-T1
  - 완료 기준: QUEUED부터 종료 상태까지 기록하며 같은 업체·기간의 활성 작업은 하나만 존재한다.

- [x] **P4-T3 화면 작업 상태와 데이터 최신성 분리**
  - 담당: frontend/test
  - Depends On: P4-T2
  - 완료 기준: 접수/실행/부분 성공/완료/실패와 최신 측정 시각을 서로 다르게 표시한다.

## Phase 5 — 한 업체 실데이터 흐름과 품질 표기

> Phase 5 상태: 합성 measurement/quality DTO·중복 방지 기반은 `phase/5-real-data`로 병합됨.
> 승인된 실업체 원본 대조(P5-T1)와 7일 관찰은 외부 데이터 이용 승인 후에 완료한다.

- [ ] **P5-T1 승인된 업체·계측점의 원본→정규 DB 흐름 연결**
  - 담당: backend/database
  - Depends On: P4-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-5-real-data`
  - Branch: `phase/5-real-data`
  - 완료 기준: 승인 원본과 DB·집계·화면 값을 대조할 수 있고 재처리해도 중복이 없다.

- [ ] **P5-T2 출처·측정/수신 시각·품질 DTO 적용**
  - 담당: backend/frontend
  - Depends On: P5-T1
  - 완료 기준: `DEMO/MEASURED/ESTIMATED/STALE/NO_DATA`가 실제 상태와 함께 전달·표시된다.

- [ ] **P5-T3 지연·누락·정정·단위 회귀 검증**
  - 담당: test
  - Depends On: P5-T2
  - 완료 기준: kW/kWh, 15분 간격, KST/UTC, 누적값 리셋, 누락, 정정 이력이 자동 검증된다.

## Phase 6 — 모바일·접근성·업무 완주

- [x] **P6-T1 업체 목록과 편집 폼 반응형 개선**
  - 담당: frontend
  - Depends On: P3-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-6-mobile-a11y`
  - Branch: `phase/6-mobile-a11y`
  - 완료 기준: 360·390·768·1280px에서 조회→수정→저장→재조회가 가능하고 페이지 전체 가로 넘침이 없다.

- [x] **P6-T2 키보드·포커스·모달 접근성 보완**
  - 담당: frontend/test
  - Depends On: P6-T1
  - 완료 기준: 메뉴·탭·모달을 키보드로 사용할 수 있고 포커스 복귀와 Escape 닫기가 동작한다.

## Phase 7 — CI·마이그레이션·백업·운영 감시

- [x] **P7-T1 PR 품질 검사와 보안 스캔 CI 구성**
  - 담당: devops/test
  - Depends On: P2-T3
  - Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-7-operations`
  - Branch: `phase/7-operations`
  - 완료 기준: lint, typecheck, unit/API, build, 핵심 E2E, 정보 노출 검사, 의존성 감사가 PR에서 자동 실행된다.

- [x] **P7-T2 마이그레이션 리허설과 백업 복구 자동화**
  - 담당: database/devops
  - Depends On: P5-T3
  - 완료 기준: 운영 DB 사본 마이그레이션, 백업 무결성, 복구 후 핵심 데이터 대조가 재현 가능하다.

- [x] **P7-T3 수집 지연·실패·스케줄 누락 감시**
  - 담당: backend/devops
  - Depends On: P4-T3
  - 완료 기준: 마지막 실행, 최신 측정, 연속 실패, 지연 임계치가 기록되고 시험 경고·복구가 검증된다.

## 전체 완료 조건

- [ ] 보호 데이터의 익명 접근, VIEWER 쓰기, 교차 업체 접근이 차단된다.
- [ ] 공개 빌드에서 고객정보와 수집 자격증명이 검출되지 않는다.
- [ ] 업체 등록·수정이 DB에 영속되고 충돌·감사 이력이 검증된다.
- [ ] 수집 API와 worker가 분리되고 데이터 출처·최신성·품질이 화면에 표시된다.
- [ ] 모바일 핵심 업무, CI, 마이그레이션, 백업 복구, 운영 감시 검증이 통과한다.
- [ ] 모든 Phase 브랜치가 적대적 검토와 수정 후 통합 기준 브랜치에 병합·push되어 있다.
