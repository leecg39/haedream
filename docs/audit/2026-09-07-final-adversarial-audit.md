# Final Adversarial Audit — phase/final-data-safety-audit

Date: 2026-09-07  
Base: `origin/feat/fit-clone` @ `bc0a40dc64ac14da98dae94f3de002446aa67734`  
Branch: `phase/final-data-safety-audit`  
Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-final-data-safety-audit`

## 1. Verdict

이전 적대적 감사(`bc0a40d`) 이후에도 **데이터 손실·재시도·복구 증거·권한 계약**에 Critical/Important 잔여 결함이 있었다.  
이 후속 작업에서 A–F를 수정·자동 검증했고, 외부 의존(승인 실데이터, ≥1GB DB, 7일 관찰, 실 webhook)은 **완료로 표시하지 않았다**.

## 2. Prior audit (merged @ bc0a40d)

이전 라운드에서 worker CLI, max_attempts, FK `011`, monitor streak, energy UTC/corrections, firm `can_view_pii=0` 기본값, E2E 83-pass 등을 반영했다. 상세는 아래 §8 이전 기록 요약 참고.

## 3. Follow-up findings (this Cursor pass)

| ID | Area | Severity | Finding | Fix |
|---|---|---|---|---|
| A1 | migration `011` | Critical | `INSERT…WHERE EXISTS(firms)` 가 orphan `collection_jobs`/`energy_measurements` 를 조용히 삭제 | CHECK 기반 preflight로 실패·트랜잭션 롤백; 전량 `INSERT` + FK. 자동 테스트로 orphan 실패·원본 보존·정상/재실행 고정 |
| B1 | `restore-db-verify.mjs` | Important | `path.resolve("")` → cwd 로 usage 무력화; `firmSample.length >= 0` 항상 참; demo 로그인 가정 | 인자 필수; `firmQueryOk` 실의미; `--demo` 없으면 해시 형식·integrity만; 실패 시 non-zero exit |
| C1 | `migrate-rehearsal.mjs` | Important | `import.meta.url` 공백 취약; helper `process.exit` 이 catch 무력화; live WAL `copyFileSync`; 실패를 성공처럼 보고 | `fileURLToPath`; throw/`RehearsalError`; offline snapshot + backup API + integrity; 정직한 JSON(`failed`, backup flags) |
| D1 | energy measurements | Important | timezone 없는 `observedAt`; firms 전역 존재만으로 저장; quality 무시/invalid→MEASURED; version-only 정정 이력 누락 | Z/±hh:mm만 허용; `tenant_firm_access` 필수; quality는 derive만·invalid→`NO_DATA`; `calculation_version` 변경도 corrections |
| E1 | kepco jobs | Critical | retryable 실패 후 같은 `processQueuedJobs` 에서 즉시 재claim → max_attempts 소진; failure_count 덮어쓰기; finish 전이 미강제 | `012` `next_attempt_at` backoff + seen-set; failure_count 누적; RUNNING→terminal만; 실패 어댑터 테스트 |
| F1 | monitor / firm PII | Important | `lastScheduledRun` 이 모든 job 활동 시각인데 스케줄로 오인; NaN env; 생성 시 PII 저장 후 `can_view_pii=0` 으로 본인 숨김 | `lastJobActivityAt` 로 개명; 숫자 env 거부; PII 쓰기 시 역할 검사 + 명시적 `can_view_pii=1` |

## 4. Residual external blockers (NOT complete)

| Blocker | Why incomplete | How to finish |
|---|---|---|
| P5-T1 승인 실업체 원본 대조 | 실고객/승인 원본 없음 | 승인 후 원본↔DB↔API↔UI 대조 기록 |
| 1.15GB DB migrate rehearsal | offline snapshot 경로 미제공 | `--source-db` / `MIGRATE_REHEARSAL_SOURCE_DB` 에 WAL 없는 사본 |
| 7일 파일럿 관찰 | 시간·운영 환경 외부 | 예정 실행/성공·실패·지연 작업 기록 |
| 실 webhook 알림 경로 | 의도적으로 HTTP 송신 금지 | injectable/file sink 검증 후 운영 sink만 별도 연결 |

## 5. Honest checkbox policy

- `[x]` = 이 브랜치에서 자동 검증으로 합격 기준을 증명한 항목만
- Phase5 T1 및 실데이터 승인 항목 = `[ ]`
- Phase7 large DB / 7일 관찰 = `[ ]` 또는 문서상 `unverified`

## 6. E2E evidence note

UI/Playwright 계약 자체는 이번 후속에서 바꾸지 않았다(서버 권한·저장소·스크립트·마이그레이션 중심).  
관련 E2E `e2e/firm-mobile-a11y.spec.ts` + `e2e/watt-firm.spec.ts` **18 passed**.  
전체 83-pass 스위트는 UI 미변경으로 이전 최종 증거가 적용되나, 통합 후 GitHub Actions `e2e-core` 로 재확인한다.

## 7. Post-fix verification (this pass)

| Check | Result |
|---|---|
| `npm test` (158) | pass |
| `npm run lint` | 0 errors (기존 research warnings만) |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm run check:public-data` | pass |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run db:migrate-rehearsal` | empty/seeded pass; `largeDbRehearsal=unverified`; `failed=false` |
| temp DB clean migrate + seed + `kepco-worker.mjs` | pass (`processed 0`) |
| orphan preflight 011 (자동 테스트) | fail + 원본 보존 |
| related E2E (firm mobile + watt-firm) | 18 passed |
| GitHub Actions remote | push 후 `quality` / `e2e-core` 확인 |

## 8. Prior round summary (bc0a40d)

Worker CLI, jobs retry/stale, monitor streak, restore/rehearsal 기초, energy UTC/corrections, firm least-privilege 기본, CSS/E2E 83-pass.  
이번 패스가 그 위의 잔여 데이터 안전 결함을 닫는다.

## 9. Commits / merge path

`phase/final-data-safety-audit` → push → `--no-ff` merge into root `feat/fit-clone` → push `origin/feat/fit-clone` → Actions 대기.
