# 잔여 운영 준비 — blocker 상태 (A~E)

작성일: 2026-09-07  
기준 브랜치: `feat/fit-clone`  
기준 SHA: `a1107a7919d29f3f62ed71eb0ede3b4c2dec3514`  
관련: [cursor-handoff-remaining-work.md](cursor-handoff-remaining-work.md), [phase-8-measurement-csv-and-alerts.md](phase-8-measurement-csv-and-alerts.md)

이 문서는 **완료 체크가 아니다**. 외부 입력이 오면 여기의 요청 목록으로 실행하고, 증거는 `docs/audit/YYYY-MM-DD-…`에만 기록한다.

## 요약

| ID | 항목 | 상태 | 내부 준비 |
|---|---|---|---|
| A | P5-T1 승인 CSV 원본 대조 | **blocked** — 승인 CSV·메타 미제공 (합성 dry-run/apply/reconcile 리허설은 `ops:synth-rehearsal`로 통과, 완료 아님) | CLI/가드/합성 회귀·합성 운영 리허설 |
| B | ≥1GB migrate/backup rehearsal | **부분** — 합성 크기 verified + `db:deid-snapshot` 도구 준비. **운영자 attestation 전 P7-T2 체크 금지** | offline/deid/synthetic large 도구 |
| C | 실 HTTPS webhook HMAC | **blocked** — endpoint/secret/allowlist/수신자 미제공 (`ops:external-input` 매니페스트로 실행 가능) | config 동기 검증 CLI; 송신 0회 |
| D | 7일 운영 관찰 | **blocked** — 스케줄러 환경·관찰 창 미지정 (합성 Day0 monitor no-alert만 준비) | 일별 로그 템플릿 + synth rehearsal |
| E | 외부 환경 migration 011 감사 | **blocked** — 외부 환경 목록 미제공 (Hostinger MCP timeout; local-dev offline 감사 ok) | read-only 감사 CLI + external-input runner |

로컬 `data/solarsimz.db`(약 1.1GB)는 라이브 경로이며 WAL/SHM 이 다시 생길 수 있다. B/E 입력으로 직접 쓰지 말고, 승인 후 `npm run db:offline-snapshot` → (필요 시) `npm run db:deid-snapshot` 만 사용한다.

외부 입력 일괄 실행: 저장소 **밖** 매니페스트 + `npm run ops:external-input -- --manifest /outside/manifest.json`  
스키마 예: [external-input-manifest.example.json](external-input-manifest.example.json)

---

## A — 필요한 입력

제공 시 **채팅/이슈/커밋에 원문·경로를 붙이지 말 것**. 로컬 절대경로만 운영자 셸에서 사용.

| 필드 | 예시 형식 | 비고 |
|---|---|---|
| 승인 CSV 로컬 경로 | (셸 전용) | UTF-8, 헤더 계약 준수 |
| CSV expected SHA-256 | 64 hex | `shasum -a 256` |
| `tenantId` | 문자열 | |
| `fid` | `[1-9]\d*` | leading zero 거부 |
| `actor` | 문자열 | |
| `calculationVersion` | 문자열 | |
| 대상 기간·단위·소스 승인 | 문서/티켓 ID | |
| 오프라인 대상 DB | WAL/SHM 없는 snapshot | |

합격 후 증거(카운트·hash·시간·환경 별칭만) → `docs/audit/`.

---

## B — 필요한 입력

| 필드 | 비고 |
|---|---|
| 승인된 **비식별** offline snapshot 경로 | ≥1GB, `-wal`/`-shm`/`-journal` 없음 |
| 동일 크기급 temp disk | 복사+backup 여유 |
| backup/restore 위치 | 저장소 밖 |

합성 크기 경로(운영 사본 대체 아님):

```bash
# 저장소 밖 경로 권장
npm run db:synthetic-large -- /path/outside-repo/synth-1gb.db
npm run db:migrate-rehearsal -- --source-db /path/outside-repo/synth-1gb.db
```

`docs/audit/migrate-rehearsal-latest.json` 의 `largeDbRehearsal=verified` 이고 `largeDbBytes >= 1e9` 일 때만 크기 경로 주장. P7-T2 체크박스는 **승인 비식별 운영 사본** 증거가 있을 때만.

---

## C — 필요한 입력

| 필드 | 비고 |
|---|---|
| 승인 HTTPS URL | 커밋/채팅 금지 |
| HMAC secret (≥8) | 커밋/채팅 금지 |
| hostname allowlist | 콤마 구분 |
| 수신 담당자 ack 창구 | |
| 모니터 대상 offline/운영 DB | |

사전(네트워크 0회):

```bash
KEPCO_ALERT_SINK=webhook \
KEPCO_ALERT_WEBHOOK_URL='…' \
KEPCO_ALERT_WEBHOOK_SECRET='…' \
KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST='…' \
npm run ops:verify-webhook-config
```

---

## D — 필요한 입력

| 필드 | 비고 |
|---|---|
| 스케줄러 활성 환경 별칭 | |
| 관찰 시작일 (달력) | 최소 7일 |
| 알림 수신 담당자 | |
| 장애 주입 승인 여부 | 무단 주입 금지 |

일별 기록 템플릿: [observation-log-template.md](observation-log-template.md)

---

## E — 필요한 입력

| 필드 | 비고 |
|---|---|
| 환경 목록(별칭) | staging/prod 등 |
| 각 환경 offline snapshot 또는 read-only DB 경로 | 라이브 WAL 거부 |
| 011 적용 전 backup 존재·해시(별칭) | |
| 배포 기록상 unsafe-011(`bc0a40d` 전후) 적용 여부 | |

```bash
npm run ops:audit-migration-011 -- \
  --db /path/to/offline.db \
  --env-alias staging \
  --report /path/outside-repo/audit-011-staging.json
```

orphan>0 또는 integrity 실패 → **즉시 중단**, 무단 rollback 금지.

---

## 도구 인덱스 (이번 준비 패스)

| npm script | 스크립트 |
|---|---|
| `db:offline-snapshot` | `scripts/create-offline-db-snapshot.mjs` |
| `db:synthetic-large` | `scripts/create-synthetic-large-db.mjs` |
| `ops:audit-migration-011` | `scripts/audit-migration-011.mjs` |
| `ops:verify-webhook-config` | `scripts/verify-webhook-config.mjs` |
| `ops:synth-rehearsal` | `scripts/ops-synthetic-readiness-rehearsal.mjs` |
| `db:deid-snapshot` | `scripts/create-deidentified-offline-snapshot.mjs` |
| `ops:external-input` | `scripts/ops-external-input-runner.mjs` |
