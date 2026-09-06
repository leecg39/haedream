# Final Adversarial Audit — phase/final-ops-rehearsal-audit

Date: 2026-09-07  
Base: `origin/feat/fit-clone` @ `edbfdec02f2b5b8c871ffe4262dd7716c5f362e9`  
Branch: `phase/final-ops-rehearsal-audit`  
Worktree: `/Users/user01/Desktop/SolarSimz-worktrees/phase-final-ops-rehearsal-audit`

## 1. Verdict

데이터 안전 후속(`edbfdec`) 이후에도 **운영 리허설 계약·복원 검증 자원 정리·모니터 개수 임계치·011 orphan 구분**에 Important 잔여 결함이 있었다.  
이 패스에서 재현·수정·자동 검증했고, 외부 의존(승인 실데이터, ≥1GB DB, 7일 관찰, 실 webhook)은 **완료로 표시하지 않았다**.

## 2. Prior CI baselines (record exactly)

| Run | SHA | Result |
|---|---|---|
| 코드 CI `34059247760` | `4b95315826c4b363f6afe7aacf3f52eb09619927` | **success** — `quality` ✓, `e2e-core` ✓ |
| 문서 병합 CI `34059440570` | `edbfdec02f2b5b8c871ffe4262dd7716c5f362e9` | **success** — `quality` ✓, `e2e-core` ✓ |

현재 작업 기준 SHA(패치 전): `edbfdec02f2b5b8c871ffe4262dd7716c5f362e9`  
패치 후 최종 SHA·신규 CI run ID는 §10에 추가한다.

## 3. Findings fixed in this ops-rehearsal pass

| ID | Area | Severity | Finding | Fix |
|---|---|---|---|---|
| R1 | `migrate-rehearsal.mjs` | Important | `backupAndRestore` 가 항상 `--demo` → 명시적 `--source-db` 운영 offline snapshot 도 operator/"demo" 없으면 실패 | seeded 만 `{ demo: true }`; 외부 source 는 비데모 검증 |
| R2 | `restore-db-verify.mjs` | Important | 실패 경로 `process.exit` 가 `finally`/`db.close` 를 건너뜀 | `VerifyError` + `process.exitCode`; finally 에서 항상 close |
| R3 | monitor `KEPCO_FAIL_STREAK` | Important | 개수 임계치인데 0/소수 허용 → `streak >= 0` 거짓 경보 | 유한 양의 정수(≥1)만; 시간 임계치는 유한 비음수(0·소수 허용)로 명시 |
| R4 | migration `011` | Important | orphan guard 가 단일 테이블이라 collection_jobs vs energy_measurements 구분 불가 | named CHECK `ck_011_orphan_collection_jobs` / `ck_011_orphan_energy_measurements` + orphan별 테스트 |

## 4. Historical limit — unsafe 011 already applied externally (NOT retroactively repaired)

원격 `bc0a40d` 에 **기존 unsafe 011**(orphan 을 `WHERE EXISTS` 로 조용히 삭제)이 한 번 공개됐다.  
`_migrations` 는 **파일명만** 기록하므로, 이미 그 버전의 `011_referential_integrity_and_corrections.sql` 을 적용한 외부 DB에서는 **이번 수정된 011 이 재실행되지 않는다**.

- 과거에 삭제된 orphan 행은 **현재 DB만으로 복원할 수 없다**.
- 이 패치는 소급 복구를 하지 않는다. 신규/미적용 DB 와 아직 011 을 적용하지 않은 환경에만 안전한 preflight가 적용된다.
- 해당 외부 환경의 운영 확인 항목:
  1. 배포 기록에서 `bc0a40d` 전후 011 적용 여부 확인
  2. 011 적용 **전** 백업과 현재 DB 비교
  3. 필요 시 백업에서 orphan/행 복구 (외부 운영 절차)

## 5. Residual external blockers (NOT complete)

| Blocker | Why incomplete | How to finish |
|---|---|---|
| P5-T1 승인 실업체 원본 대조 | 실고객/승인 원본 없음 | 승인 후 원본↔DB↔API↔UI 대조 기록 |
| 1.15GB DB migrate rehearsal | ≥1GB offline snapshot 미제공 | `--source-db` / `MIGRATE_REHEARSAL_SOURCE_DB` 에 WAL 없는 ≥1GB 사본 |
| 7일 파일럿 관찰 | 시간·운영 환경 외부 | 예정 실행/성공·실패·지연 작업 기록 |
| 실 webhook 알림 경로 | 의도적으로 HTTP 송신 금지 | injectable/file sink 검증 후 운영 sink만 별도 연결 |
| 기적용 unsafe-011 외부 DB | 파일명만 기록·소급 재실행 불가 | §4 배포 기록 + 적용 전 백업 비교/복구 |

## 6. Honest checkbox policy

- `[x]` = 이 브랜치에서 자동 검증으로 합격 기준을 증명한 항목만
- Phase5 T1 및 실데이터 승인 항목 = `[ ]`
- Phase7 large DB / 7일 관찰 / 실 webhook = `[ ]` 또는 문서상 `unverified`
- 기적용 unsafe-011 외부 복구 = 외부 운영 확인 (완료 체크 금지)

## 7. E2E evidence note

UI/Playwright 계약을 이번 패스에서 바꾸지 않았다(스크립트·마이그레이션·모니터 중심).  
로컬 전체 E2E 83-pass 반복은 생략하고, 통합 후 GitHub Actions `e2e-core` 로 최종 확인한다.

## 8. Verification (this pass)

| Check | Result |
|---|---|
| related vitest (011 orphan / restore / rehearsal / monitor) | pass |
| `npm test` | **161 passed** |
| `npm run lint` | 0 errors (기존 research warnings만) |
| `npm run typecheck` | pass |
| `npm run build` | pass |
| `npm run check:public-data` | pass |
| `npm audit --omit=dev` | 0 vulnerabilities |
| 합성 비데모 offline snapshot `--source-db` | pass — `externalSourceMigrated=true`, `externalSourceBackupRestore=true`, `largeDbRehearsal=unverified`, `failed=false`; `--demo` 직접 검증은 동일 사본에서 fail |
| orphan collection_jobs / energy_measurements 각각 | named CHECK fail + 원본 스키마·행·`_migrations` 미기록 보존 |
| 로컬 전체 E2E | 생략(UI 미변경) — 원격 `e2e-core` 대기 |

## 9. Commits / merge path

`phase/final-ops-rehearsal-audit` → push → root `feat/fit-clone` `--no-ff` merge → push `origin/feat/fit-clone` → Actions `quality`/`e2e-core` 대기.

## 10. Post-merge CI

| Item | Value |
|---|---|
| Final merge SHA on `origin/feat/fit-clone` | `2c3d528bb65e403a274528f2655fc51c0f5cbdcc` |
| New GitHub Actions run | `34059982086` — https://github.com/leecg39/haedream/actions/runs/34059982086 |
| `quality` / `e2e-core` | **success** / **success** |

Phase commits: `fe95704` (fix), `db3dd24` (docs), merge `2c3d528`.
