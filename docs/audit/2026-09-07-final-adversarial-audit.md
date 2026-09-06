# Final Adversarial Audit — phase/final-adversarial-audit

Date: 2026-09-07  
Base: `origin/feat/fit-clone` @ `89913b9`  
Branch: `phase/final-adversarial-audit`  
Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-final-adversarial-audit`

## 1. Verdict

통합 브랜치의 Phase 1~4·6·7 / Phase5 기반 **완료 표시는 과장**되어 있었다.  
이 브랜치에서 확인된 Critical/Important 결함을 수정했고, 외부 의존(승인 실데이터, 1.15GB DB, 7일 관찰, 실 webhook)은 **완료로 표시하지 않았다**.

## 2. Findings before change

| ID | Phase | Severity | Finding | Evidence |
|---|---|---|---|---|
| F1 | P4 | Critical | `scripts/kepco-worker.mjs` 가 fresh temp DB에서 CLI 실패 (`@/` unresolved, `server-only` throw, Node strip-only TS) | 직접 실행 재현 |
| F2 | P4 | Important | `max_attempts` 기반 제한 재시도 없음 — 실패 즉시 FAILED | `jobs.repository.ts` |
| F3 | P4 | Important | stale RUNNING 복구가 max_attempts 무시하고 무조건 QUEUED | `recoverStaleRunningJobs` |
| F4 | P4 | Important | `collection_jobs.fid` / `energy_measurements.fid` FK 없음 | `009`/`010` SQL |
| F5 | P6 | Important | `firm-extras.css` 가 `html,body{overflow-x:hidden}` 로 가로 잘림을 숨김 | L72 |
| F6 | P6 | Important | E2E 가 scrollWidth·Escape 위주 — 생성→저장→재조회·viewer·포커스 복귀 부족 | `firm-mobile-a11y.spec.ts` |
| F7 | P7 | Critical | failure streak 가 최근 FAILED 개수만 합산 → 성공 사이 과거 실패까지 포함 | `monitor-collection-jobs.mjs` |
| F8 | P7 | Important | last scheduled / latest success / latest measurement / queue stall 미계산 | 동일 |
| F9 | P7 | Important | alert sink·장애→알림→복구 테스트 없음 (실 webhook도 없음) | 동일 |
| F10 | P7 | Important | restore-verify 가 active operator 존재만 확인 | `restore-db-verify.mjs` |
| F11 | P7 | Important | migrate rehearsal 이 외부 1.15GB 사본 경로를 받지 않고, 없으면 완료처럼 보임 | `migrate-rehearsal.mjs` |
| F12 | P5 | Important | `observedAt` 문자열 그대로 저장 → `+09:00`/`Z` 중복 가능 | `measurements.repository.ts` |
| F13 | P5 | Important | 정정 이력 테이블/보존 없음 | schema |
| F14 | P5 | Important | timestamp/value/meterPoint 검증·품질 API/UI 연결 부족 | code |
| F15 | P3 | Important | 신규 업체 생성 시 `can_view_pii=1` 자동 부여 (DEFAULT 0·최소권한과 불일치) | `createFirmForUser` |
| F16 | Docs | Important | `06-tasks.md` Phase7·전체 완료 체크가 증거 없이 `[x]` | planning |

## 3. Fixes applied

- Worker: `tsx` + CJS/ESM alias + `server-only` shim bootstrap; CLI smoke test 추가
- Jobs: non-retryable vs retry requeue; stale recover respects `max_attempts`; firm existence / FK migration `011`
- Monitor: consecutive streak only; schedule/success/measurement/queueStall fields; file/injectable alert sink (no real webhook HTTP)
- Restore verify: password hash integrity (no secret logging), firm query, kepco_summary query
- Migrate rehearsal: `--source-db` / env; `largeDbRehearsal=unverified` when no ≥1GB copy; JSON report
- Energy: UTC canonical `observedAt`, validation, corrections history, synthetic interval/reset/15min tests; `/api/energy/[fid]` + peak quality banner (DEMO disclaimer)
- Firm create: `can_view_pii=0`, `can_collect=0`
- CSS: removed page-level `overflow-x:hidden`
- E2E: operator create→save→reload, viewer readonly, keyboard focus return, widths 360/390/768/1280

## 4. Residual external blockers (NOT complete)

| Blocker | Why incomplete | How to finish |
|---|---|---|
| P5-T1 승인 실업체 원본 대조 | 실고객/승인 원본 없음 | 승인 후 원본↔DB↔API↔UI 대조 기록 |
| 1.15GB DB migrate rehearsal | 사본 경로 미제공 | `MIGRATE_REHEARSAL_SOURCE_DB=/path/to/copy node scripts/migrate-rehearsal.mjs` 또는 `--source-db` |
| 7일 파일럿 관찰 | 시간·운영 환경 외부 | 예정 실행/성공·실패·지연 작업 기록 |
| 실 webhook 알림 경로 | 의도적으로 HTTP 송신 금지 | injectable/file sink 검증 후 운영 sink만 별도 연결 |
| GitHub Actions 원격 결과 | push 후 확인 필요 | CI push 후 Actions 상태 확인 |

## 5. Honest checkbox policy

- `[x]` = 이 브랜치에서 자동 검증으로 합격 기준을 증명한 항목만
- Phase5 T1 및 실데이터 승인 항목 = `[ ]`
- Phase7 large DB / 7일 관찰 = `[ ]` 또는 문서상 unverified

## 6. Commands for remaining ops

```bash
# large DB (when available)
MIGRATE_REHEARSAL_SOURCE_DB=/absolute/path/to/1.15g-copy.db npm run db:migrate-rehearsal

# monitor with local alert sink
KEPCO_ALERT_SINK=file KEPCO_ALERT_PATH=data/alerts/kepco.jsonl npm run ops:monitor-kepco

# standalone worker
DATABASE_PATH=data/app.db node scripts/kepco-worker.mjs
```

## 7. Post-fix verification (this branch)

| Check | Result |
|---|---|
| `npm test` (147) | pass |
| `npm run lint` | 0 errors |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm run check:public-data` | pass |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run db:migrate-rehearsal` | empty/seeded pass; `largeDbRehearsal=unverified` |
| `node scripts/kepco-worker.mjs` (fresh temp DB) | pass (`processed 0`) |
| `npm run test:e2e` | 83 passed |
| GitHub Actions remote | confirm after push |

## 8. Commits / merge path

Branch `phase/final-adversarial-audit` → push → merge into `feat/fit-clone` → push.
