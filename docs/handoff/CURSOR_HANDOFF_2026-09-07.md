# Cursor 인수인계 — SolarSimz 개선 작업

작성일: 2026-09-07  
상태: Codex 작업 일시중지, Cursor Agent가 계속 작업 중

## 현재 작업 위치

- 제품 통합 저장소: `/Users/user01/Desktop/SolarSimz`
- 통합 브랜치: `feat/fit-clone`
- 현재 통합 HEAD: `1e7a904` (`merge: complete Phase 2 data boundary`)
- 현재 구현 worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-3-firm-crud`
- 현재 구현 브랜치: `phase/3-firm-crud`
- Cursor Agent 세션: `6a45c50b-5671-4f2b-86a8-efd4ea93e791`

현재 worktree의 미커밋 변경을 보존한다. `reset`, `clean`, `stash`, 강제 checkout을 실행하지 않는다. 루트의 `.Codex/`, `.commandcode/`, `.omo/`, `docs/audit/2026-09-06/evidence/`, `docs/handoff/`는 작업 메타데이터이므로 제품 커밋에 섞지 않는다.

## 완료된 작업

### Phase 1 — 인증·권한 경계

- `17ceb91 feat: protect FIT firm and KEPCO access`
- `8c97736 fix: close Phase 1 authorization review gaps`
- `0fce5c4 merge: complete Phase 1 auth scope`
- `9b44af8 fix: keep firm catalog out of client bundles`
- `1537055 merge: complete Phase 1 auth scope catalog leak fix`
- `6b095a3 docs: mark Phase 1 auth scope tasks complete`

검증: 단위/API 테스트 123개, typecheck, lint 오류 0, production build, Playwright 75개, npm audit 취약점 0.

### Phase 2 — 고객정보 서버 경계

- `99d60bd feat: move firm customer data behind server DTOs`
- `1e7a904 merge: complete Phase 2 data boundary`

주요 결과:

- 추적되던 실제 업체 데이터 덤프를 합성 fixture로 교체
- 고객정보를 서버 전용 DTO와 권한 검사 뒤에서 반환
- 목록 응답 최소화 및 상세 조회 분리
- 공개 산출물 고객정보 검사 스크립트 추가
- 브라우저 합성 데이터 시드 적용

검증: Vitest 전부 통과, typecheck, lint 오류 0, production build, Playwright 75/75, 공개 데이터 검사 통과. Critical/High 보안 이슈 없음.

## 진행 중인 Phase 3 — 업체 CRUD·영속 저장

현재 미커밋 변경:

- `db/migrations/008_firm_integrity.sql`
- `src/app/api/firm/[fid]/route.ts`
- `src/app/api/firm/route.ts`
- `src/features/firms/{dto.server,repository,schema,types}.ts`
- `src/components/fit/firm/FirmEditModal.tsx`
- `public/assets/js/firm-demo.js`
- `tests/{firm-integrity,firm-dto,fit-authorization}.test.ts`

구현된 내용:

- 업체 생성/상세/PATCH API
- `version` 기반 낙관적 잠금과 충돌 시 409
- 작성·수정 메타데이터 및 감사 로그
- FIT React 화면과 레거시 `firm.html`의 실제 DB 저장 연결
- PII 쓰기 권한이 없는 사용자의 수정에서 기존 원문 PII 보존
- 비밀번호 필드 요청 차단 및 감사 로그에 PII/비밀번호 제외

현재 검증 결과:

- 전체 Vitest 130/130 통과
- TypeScript 통과
- ESLint 오류 0, 기존 경고 72
- production build 통과
- 자체 적대적 검토에서 발견한 PII 덮어쓰기 문제 수정 및 회귀 테스트 추가
- Playwright 전체 75개를 `E2E_PORT=3478`에서 재실행 중

## Cursor가 이어서 수행할 순서

1. 실행 중인 Phase 3 Playwright 결과를 확인하고 실패 시 시나리오를 삭제하지 않은 채 구현을 수정한다.
2. 마지막 수정 이후 아래 전체 게이트를 다시 실행한다.

       npm test
       npm run typecheck
       npm run lint
       npm run build
       npm run check:public-data
       E2E_PORT=3478 npm run test:e2e
       git diff --check

3. Phase 3 변경 전체를 독립 코드 리뷰와 보안 적대적 검토에 맡긴다. Critical/High/Important 미해결을 0건으로 만든다.
4. 제품 파일만 `phase/3-firm-crud`에 커밋하고 push한다.
5. `feat/fit-clone`에 `--no-ff`로 병합하고 원격에 push한다.
6. `docs/planning/06-tasks.md`의 실제 완료 항목과 검증 근거를 갱신한다.
7. 같은 규칙으로 다음 단계 worktree를 만들고 끝까지 진행한다.

## 남은 단계

정확한 계약은 `docs/planning/06-tasks.md`와 `docs/plans/solarsimz-improvement-plan.md`를 따른다.

1. Phase 4: KEPCO 수집 DB job queue, worker, idempotency, 재시도
2. Phase 5: 승인된 한 업체·한 계측점 데이터 연결, 출처·측정시각·품질 상태 표기
3. Phase 6: 360/390/768px 모바일 업체관리와 수집 화면, 접근성 및 브라우저 회귀
4. Phase 7: CI, 마이그레이션, 백업·복구, 운영 감시, 전체 출시 게이트
5. 요구사항별 최종 완료 감사 후에만 전체 작업 완료 처리

실제 KEPCO/RTU 고객 연계는 외부 승인과 자격증명이 없으면 합성 어댑터와 계약 테스트까지만 완료하고 명확한 외부 차단 사항으로 기록한다. 7일 운영 관찰은 코드 구현 시간과 별도다. 실고객 데이터나 실제 외부 수집을 임의로 실행하지 않는다.

## 필수 문서

- 실행 체크리스트: `/Users/user01/Desktop/SolarSimz/docs/planning/06-tasks.md`
- 개선 계획: `/Users/user01/Desktop/SolarSimz/docs/plans/solarsimz-improvement-plan.md`
- 이 인계 문서: `/Users/user01/Desktop/SolarSimz/docs/handoff/CURSOR_HANDOFF_2026-09-07.md`
- Next.js 16 문서: `/Users/user01/Desktop/SolarSimz/node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `data-security.md`

## 예상 시간

- Phase 3 마무리: 테스트 실패가 없으면 약 1~2시간
- 외부 승인 없이 가능한 Phase 4~7 코드·합성 검증: 약 5~10개 개발일
- 실제 고객 1곳 연계와 운영 관찰: 승인·자격증명 준비 시간 + 최소 7일 관찰
- 전체 상용화 수준: 기존 계획 기준 약 3~6개 개발주
