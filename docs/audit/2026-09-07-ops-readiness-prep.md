# Ops readiness prep — 2026-09-07

기준: `origin/feat/fit-clone` @ `b46be117f6ae0fe19a7d7da0cc1b7e031dc70b18`  
CI baseline: https://github.com/leecg39/haedream/actions/runs/34064267548 (`quality` ✓, `e2e-core` ✓)

## Verdict

A~E **외부 증거는 아직 없음**. 이번 패스는 blocker를 명문화하고, 승인 입력 도착 즉시 실행 가능한 **읽기 전용 감사·offline snapshot·합성 large DB·webhook config 검증** 도구와 테스트를 추가했다.  
`docs/planning/06-tasks.md` 체크박스는 변경하지 않았다.

## External blockers (inputs still required)

상세: `docs/ops/remaining-blockers-status.md`

| ID | Status | Required (do not paste secrets/URL/CSV into git) |
|---|---|---|
| A | blocked | approved CSV + tenant/fid/actor/calculationVersion/expected SHA-256 + offline DB |
| B | blocked for P7-T2 checkbox | approved de-identified ≥1GB **ops** offline snapshot still required; synthetic size path already `verified` (not a substitute for checkbox) |
| C | blocked | approved HTTPS endpoint + HMAC secret + host allowlist + receiver ack |
| D | blocked | scheduler env alias + calendar start + alert owner (≥7 days) |
| E | blocked | env alias list + offline snapshots + pre-011 backup provenance |

## Local observations (non-sensitive)

| Item | Value |
|---|---|
| `data/solarsimz.db` size class | ~1.1GB |
| journal | WAL (+shm present at check time) |
| firms count (local live) | 1654 |
| Used for A~E apply/rehearsal? | **No** (not approved offline/de-id) |
| `migrate-rehearsal-latest.json` at start | `largeDbRehearsal=unverified`, prior failed note = WAL source |

## Artifacts added this pass

| Path | Role |
|---|---|
| `scripts/create-offline-db-snapshot.mjs` | live→offline consistent copy |
| `scripts/create-synthetic-large-db.mjs` | non-PII size-path DB (≥1GB optional) |
| `scripts/audit-migration-011.mjs` | read-only 011/orphan audit |
| `scripts/verify-webhook-config.mjs` | sync webhook env check, no network |
| `tests/ops-readiness-prep.test.ts` | automated coverage |
| `docs/ops/remaining-blockers-status.md` | input checklist |
| `docs/ops/observation-log-template.md` | D daily log |

## Synthetic ≥1GB size-path rehearsal (NOT approved ops copy)

| Item | Value |
|---|---|
| Source kind | synthetic non-PII (`db:synthetic-large`) |
| Source basename | `synth-1gb.db` (stored outside git) |
| `largeDbBytes` | 1051475968 |
| `largeDbRehearsal` | **verified** (size tooling path) |
| `externalSourceMigrated` | true |
| `externalSourceBackupRestore` | true |
| Report | `docs/audit/migrate-rehearsal-latest.json` |
| P7-T2 checkbox | **still open** — approved de-identified ops snapshot still required |

Absolute paths were redacted from the rehearsal report (`externalSourceDb` = basename only) after adversarial finding.

## Verification (this prep pass)

| Check | Result |
|---|---|
| `npm test` | 24 files / **188** tests |
| `npm run typecheck` | pass |
| `npm run lint -- --quiet` | pass |
| `npm run build` | pass |
| `npm run check:public-data` | ok |
| `npm audit --omit=dev` | 0 vulnerabilities |
| adversarial (path leakage) | fixed — basename only in report |
| A/C/D/E external evidence | **still blocked** |