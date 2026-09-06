# Cursor 인계 — SolarSimz 잔여 운영 준비

작성일: 2026-09-07
대상: 다른 Cursor 패널(이 대화 없이 실행)
상태: Phase 8 CSV/webhook **내부 도구 APPROVE** 이후, 외부 blocker A~E 미완

## 1. 제목과 목표

**최종 목표:** SolarSimz 잔여 운영 준비를 **증거 기반**으로 끝까지 완료한다.

**반복 순서 (매 항목·매 변경):**

1. 계획 확인 (`docs/planning/06-tasks.md`, 본 문서, ops runbook)
2. 외부 입력 검증 (없으면 blocker + 필요 입력 기록, 완료 표시 금지)
3. 구현/운영 실행
4. 독립 적대적 검토
5. Critical/Important 수정
6. 테스트·검증
7. 커밋·푸시
8. GitHub Actions(`quality`, `e2e-core`) 확인
9. 다음 미완료 항목으로 반복

**금지:** 근거 없는 완료 표시, 실데이터/secret/endpoint URL을 commit·로그·이슈·채팅에 복사.

외부 입력이 없으면 **blocker와 필요한 입력**을 정확히 기록하고, 가능한 준비 작업(합성 회귀·문서·감사 템플릿·CI)은 계속한다. 전체 goal은 A~E 증거가 모두 쌓일 때까지 완료로 표시하지 않는다.

---

## 2. 시작 절차

```bash
cd /Users/user01/Desktop/SolarSimz
git fetch origin
git switch feat/fit-clone
git pull --ff-only
git status
git rev-parse HEAD
```

- **통합 브랜치:** `feat/fit-clone`
- **기준:** 인계 시점의 **원격 HEAD**. 이 문서에 적힌 과거 SHA만 checkout하지 말 것.
- **보호(삭제·추가·되돌리기 금지):** untracked `.Codex/`, `.commandcode/`, `.omo/`, `docs/audit/2026-09-06/evidence/`, `docs/handoff/`
- 실데이터·HMAC secret·운영 webhook URL을 저장소/채팅/이슈에 넣지 말 것.

필수 선행 읽기:

- [docs/ops/cursor-handoff-remaining-work.md](cursor-handoff-remaining-work.md) (본 문서)
- [docs/planning/06-tasks.md](../planning/06-tasks.md)
- [docs/ops/phase-8-measurement-csv-and-alerts.md](phase-8-measurement-csv-and-alerts.md)
- [docs/audit/2026-09-07-final-adversarial-audit.md](../audit/2026-09-07-final-adversarial-audit.md) (migration 011·외부 환경 주의)

---

## 3. 완료된 내부 범위 (인계 기준 증거)

이미 내부적으로 준비·APPROVE된 것 (외부 실데이터/실 endpoint/≥1GB/7일 **아님**):

- Phase 1~7 핵심 보안·CRUD·worker·migration·backup 기반
- Phase 8: 승인 측정 CSV dry-run/apply/reconcile, strict CSV, hash/report, unchanged write-skip, offline snapshot guard(fsync·TOCTOU), apply leaf symlink guard
- Phase 8: HTTPS webhook DNS entry 검증·IP pin(`https.request` custom lookup)·HMAC·no-alert 시 DNS/TCP/HTTP 0회·monitor 안전 오류
- IPv6 embedding/transition 차단(NAT64/6to4/Teredo 등), 로컬 TLS pin 검증(OpenSSL prerequisite)

**인계 직전 로컬 검증(고정 스냅샷, 새 변경 후 재실행 필수):**

| 검증 | 결과 |
|---|---|
| `npm test` | 23 files / **183** tests |
| `npm run typecheck` | pass |
| `npm run lint -- --quiet` | pass |
| `npm run build` | pass |
| `npm run check:public-data` | ok |
| `npm audit --omit=dev` | 0 vulnerabilities |
| 독립 최종 adversarial review | **APPROVE** |

관련 코드/문서: `scripts/import-measurement-csv.mjs`, `scripts/lib/kepco-webhook-policy.mjs`, `scripts/lib/measurement-db-guard.mjs`, `scripts/monitor-collection-jobs.mjs`, `tests/measurement-csv-and-webhook.test.ts`, `docs/ops/phase-8-measurement-csv-and-alerts.md`.

---

## 4. 실제 남은 blocker와 필요한 입력

| ID | 항목 | 필요한 외부 입력 | 승인 전 금지 |
|---|---|---|---|
| **A** | P5-T1 승인 실고객/계측 CSV 원본 대조 | 승인 CSV, `tenantId`, `fid`, `actor`, `calculationVersion`, expected SHA-256, 대상 기간/단위/소스 승인 | 실제 import/apply |
| **B** | ≥1GB 오프라인 DB migration/backup rehearsal | 승인된 **비식별** offline snapshot(운영 라이브 경로 아님), live WAL/SHM 없음, 동일 크기급 temp disk, backup/restore 위치 | live DB 직접 파괴·재시드 |
| **C** | 실 webhook 전달 | 승인 HTTPS endpoint, HMAC secret, exact hostname allowlist·운영 DNS, 수신 담당자 | URL/secret 공개·커밋 |
| **D** | 7일 운영 관찰 | 스케줄러 활성 환경, 알림 수신 담당자, 관찰 시작/종료, 장애 주입 승인 | 무단 장애 주입 |
| **E** | 외부 배포 migration 011 감사 | 환경 목록, 각 DB `_migrations`, 011 적용 전 backup 존재 여부, firms↔collection_jobs 관계 대조 | 무단 rollback/force migration·라이브 파괴 |

011 배경: [docs/audit/2026-09-07-final-adversarial-audit.md](../audit/2026-09-07-final-adversarial-audit.md) — 과거 unsafe 011이 외부에 적용됐을 수 있으며 **소급 복구 불가**. read-only 감사 후 불일치 시 즉시 중단·별도 복구 계획.

---

## 5. 항목별 실행 순서 · 명령 템플릿 · 합격 기준

공통: 먼저 [docs/ops/phase-8-measurement-csv-and-alerts.md](phase-8-measurement-csv-and-alerts.md)를 읽는다. 아래 스크립트명은 `package.json`과 일치한다.

### A) 승인 측정 CSV 원본 대조 (P5-T1)

**순서**

1. 오프라인 DB인지 확인: leaf regular file, `-wal`/`-shm`/`-journal` 없음. 필요 시 사전 backup.
2. CSV SHA-256 계산(로컬만; secret 아님).
3. dry-run → 사람 검토(삽입/정정/거부 카운트) → apply → reconcile.
4. 원본↔DB↔화면 표본 대조. 재apply 시 unchanged·`ingested_at` 불변.
5. 교차 tenant/fid·잘못된 입력 시 부수효과 0.

**명령 템플릿** (값은 승인 후에만; 실데이터 경로를 커밋하지 말 것)

```bash
# 사전 backup (오프라인 대상 DB)
npm run db:backup -- /path/to/offline-target.db /path/to/backups/pre-import.db

# dry-run
npm run ops:import-measurements -- \
  --db /path/to/offline-target.db \
  --tenant '<tenantId>' \
  --fid '<fid>' \
  --csv /path/to/approved.csv \
  --actor '<actor>' \
  --calculation-version '<calculationVersion>' \
  --expected-sha256 '<hex64>' \
  --report /path/to/report-dry-run.json

# apply (사람 검토 후)
npm run ops:import-measurements -- \
  --db /path/to/offline-target.db \
  --tenant '<tenantId>' \
  --fid '<fid>' \
  --csv /path/to/approved.csv \
  --actor '<actor>' \
  --calculation-version '<calculationVersion>' \
  --expected-sha256 '<hex64>' \
  --apply \
  --report /path/to/report-apply.json

# reconcile
npm run ops:import-measurements -- \
  --db /path/to/offline-target.db \
  --tenant '<tenantId>' \
  --fid '<fid>' \
  --csv /path/to/approved.csv \
  --actor '<actor>' \
  --calculation-version '<calculationVersion>' \
  --expected-sha256 '<hex64>' \
  --reconcile \
  --report /path/to/report-reconcile.json
```

**합격:** `ok: true`, reconcile `mismatchCount === 0`, 재apply unchanged/`ingested_at` 불변, 교차 접근 거부, 보고서·로그에 원시 측정값·경로 과다 노출 없음. 증거는 count/hash/시간/환경 별칭만 `docs/audit/` 신규 일자 문서에.

### B) ≥1GB migration / backup rehearsal (P7-T2)

**순서**

1. 승인 offline snapshot 확보(WAL/SHM 없음). 동일 크기 temp 디스크 확인.
2. 리허설 실행 → `docs/audit/migrate-rehearsal-latest.json`의 `largeDbRehearsal` 확인.
3. backup → restore-verify(운영 사본은 `--demo` 금지).
4. integrity_check·row counts·011 보호·소요 시간/용량 기록. 전·후 해시·backup 경로(별칭) 증거.

**명령 (실제 package scripts)**

```bash
# ≥1GB offline snapshot 명시
npm run db:migrate-rehearsal -- --source-db /path/to/approved-offline-snapshot.db
# 또는: MIGRATE_REHEARSAL_SOURCE_DB=/path/to/approved-offline-snapshot.db npm run db:migrate-rehearsal

npm run db:backup -- /path/to/copy-or-snapshot.db /path/to/backups/rehearsal.db
npm run db:restore-verify -- /path/to/backups/rehearsal.db
# 시드/데모 DB에만: npm run db:restore-verify -- /path/to/backups/seeded.db --demo
```

구현·계약: `scripts/migrate-rehearsal.mjs`, `scripts/backup-db.mjs`, `scripts/restore-db-verify.mjs`.
보고: `docs/audit/migrate-rehearsal-latest.json` (`largeDbRehearsal`가 `verified`이고 bytes ≥ 1e9일 때만 ≥1GB 완료 주장).

**합격:** empty/seeded/external 경로 성공, `largeDbRehearsal=verified`, restore-verify pass, WAL 소스 거부, 011 orphan 보호 유지. 미제공 시 `unverified` 유지·체크박스 금지.

### C) 실 webhook 전달 (P7-T3)

환경 변수(**코드 기준** `scripts/monitor-collection-jobs.mjs`):

| 변수 | 의미 |
|---|---|
| `DATABASE_PATH` | 모니터 대상 DB |
| `KEPCO_ALERT_SINK` | `webhook` |
| `KEPCO_ALERT_WEBHOOK_URL` | HTTPS URL (비공개) |
| `KEPCO_ALERT_WEBHOOK_SECRET` | HMAC secret (비공개, 길이 ≥8) |
| `KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST` | 콤마 구분 hostname |
| `KEPCO_ALERT_TIMEOUT_MS` | 선택, 기본 5000 |
| `KEPCO_STALE_MINUTES` / `KEPCO_FAIL_STREAK` / `KEPCO_QUEUE_STALL_MINUTES` | 임계치 |

**순서**

1. 테스트 endpoint(또는 승인 스테이징)로 먼저.
2. no-alert: 임계 미위반 → DNS/HTTP 0, exit 0, `reason: no_alert`.
3. alert: HMAC·Host·SNI·peer·2xx; non-2xx/timeout/redirect → `delivered=false`+안정 `errorCode`, exit 2 의미 유지.
4. stderr/stdout에 secret·절대 URL 미노출.
5. 운영 endpoint **1회** 승인된 실송신(담당자 ack).

```bash
DATABASE_PATH=/path/to/db \
KEPCO_ALERT_SINK=webhook \
KEPCO_ALERT_WEBHOOK_URL='<approved-https-url>' \
KEPCO_ALERT_WEBHOOK_SECRET='<secret>' \
KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST='alerts.example.com' \
npm run ops:monitor-kepco
```

**합격:** 계약 위 항목 + 수신 담당자 ack. URL/secret은 증거 문서에 넣지 말 것(환경 별칭·시각·status만).

### D) 7일 운영 관찰

**일별 확인**

- scheduled vs actual job
- latest measurement vs collection completion
- queue stall / stale running / failure streak
- alert delivery / ack
- 실패 후 recovery·backfill

달력 **최소 7일**. 중간 실패 수정 시 관찰 기간 연장. 증거: 일자별 status·count·환경 별칭만 `docs/audit/YYYY-MM-DD-…`.

### E) 외부 환경 migration 011 감사

**순서**

1. 환경 목록 확보.
2. 각 환경 **read-only**로 `_migrations`, firms / collection_jobs / energy_measurements 관계 감사.
3. 011 적용 전 backup 존재·해시 비교.
4. 관계 불일치·의심 orphan 삭제 흔적 → **즉시 중단**, 별도 복구 계획. 무단 rollback/force migration 금지.

참고: [docs/audit/2026-09-07-final-adversarial-audit.md](../audit/2026-09-07-final-adversarial-audit.md), `db/migrations/011_referential_integrity_and_corrections.sql`.

---

## 6. 완료 기준과 문서 갱신

- [docs/planning/06-tasks.md](../planning/06-tasks.md) 체크박스는 **실제 증거 있을 때만** 변경.
- 증거: commit SHA, 시간, 환경 별칭, 해시, count, status, artifact path만 — `docs/audit/` **새 날짜** 문서. 실데이터·secret 금지.
- 각 변경: 독립 적대적 리뷰 Critical/Important **0**, 그리고

```bash
npm test
npm run typecheck
npm run lint -- --quiet
npm run build
npm run check:public-data
npm audit --omit=dev
# 필요 시 E2E / CI e2e-core
```

- commit/push 후 `feat/fit-clone` GitHub Actions **quality**·**e2e-core** 성공 확인. 실패 시 로그 근거로 수정 반복.
- A~E 전부 증거 쌓이기 전 **전체 goal 완료 표시 금지**. 일부만 되면 나머지로 계속.

TLS pin 회귀: CI는 **Node 22+** 와 `openssl version` 성공·`openssl req -addext` 지원 필요([phase-8 runbook](phase-8-measurement-csv-and-alerts.md)).

---

## 7. 예상 시간

| 항목 | 예상 |
|---|---|
| A 승인 데이터 대조 | 0.5~1 개발일 |
| B ≥1GB rehearsal | 0.5~1 개발일 (+ 복사/복구 벽시계) |
| C 실 webhook | 0.5 개발일 |
| E migration 011 외부 감사 | 0.5~2 개발일 (환경 수) |
| D 7일 관찰 | 달력 **최소 7일** (실패 수정 시 연장) |

외부 승인 대기 제외 **실작업 약 2~5 개발일 + 관찰 7일**.

---

## 8. 다른 Cursor 패널에 붙여넣을 Goal

```text
목표: SolarSimz 잔여 운영 준비를 증거 기반으로 끝까지 완료한다. 근거 없는 완료 표시 금지.

시작:
1) cd /Users/user01/Desktop/SolarSimz
2) git fetch origin && git switch feat/fit-clone && git pull --ff-only && git status && git rev-parse HEAD
3) 인계 시점의 원격 HEAD를 기준으로 작업한다. 문서에 적힌 고정 과거 SHA만 checkout하지 않는다.
4) untracked `.Codex/`, `.commandcode/`, `.omo/`, `docs/audit/2026-09-06/evidence/`, `docs/handoff/` 를 삭제·추가·되돌리지 않는다.
5) 실데이터·HMAC secret·운영 webhook URL을 commit·로그·이슈·채팅에 복사하지 않는다.

필수 독서(순서):
- docs/ops/cursor-handoff-remaining-work.md
- docs/planning/06-tasks.md
- docs/ops/phase-8-measurement-csv-and-alerts.md
- docs/audit/2026-09-07-final-adversarial-audit.md

잔여 blocker A→E를 순서대로 자율 실행:
A) P5-T1 승인 CSV 원본 대조 (dry-run→검토→apply→reconcile)
B) ≥1GB offline snapshot migrate-rehearsal + backup/restore-verify
C) 실 HTTPS webhook (no-alert 0 net → alert HMAC/Host/SNI → 승인 1회 송신)
D) 7일 운영 관찰 (일별 증거, 실패 시 기간 연장)
E) 외부 환경 migration 011 read-only 감사 (불일치 시 중단·복구 계획)

외부 값이 없으면 필요한 입력을 요청하고 blocked로 명시하되, 합성 회귀·문서·감사 템플릿 등 독립 준비 작업은 계속한다.

매 변경 루프(전체 완료 전 멈추거나 완료 표시 금지):
계획 확인 → 실행 → 독립 적대적 리뷰 → Critical/Important 수정 → npm test / typecheck / lint --quiet / build / check:public-data / audit(--omit=dev) → 필요 시 E2E → commit/push → feat/fit-clone GitHub Actions quality·e2e-core 성공 확인 → 다음 미완료 항목.

docs/planning/06-tasks.md 체크박스는 실제 증거(SHA·시간·환경 별칭·해시·count·status·artifact path를 docs/audit/ 신규 일자 문서에, 실데이터/secret 없이)가 있을 때만 변경한다. A~E 전부 증거가 쌓일 때까지 전체 goal을 완료로 표시하지 않는다.
```
