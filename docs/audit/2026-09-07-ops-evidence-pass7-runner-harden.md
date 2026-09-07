# Ops evidence pass 7 — 2026-09-07 (external-input runner adversarial harden)

Parent tip: `95c026828adb07f69166e20fbcd1e4c95b3ef601`  
Finding source: completion audit of `ba09f12` runner gaps.  
Goal A~E: **still incomplete** (no approved external inputs).

## Fixes

| ID | Gap | Fix |
|---|---|---|
| 1 | `OPS_ATTEST_MIN_BYTES` could lower ≥1GB gate | Removed; fixed `ATTEST_MIN_BYTES=1000000000`; env override refused |
| 2 | `evidenceDir` / paths lexical-only | `realpath` + parent-symlink escape checks; evidenceDir `0700`; manifest/evidence `0600` |
| 3 | Quiet evidence overwrite | Immutable stamped filenames + atomic hard-link publication (existing/dangling entries refused); partial run recorded |
| 4 | Attest accepted arbitrary 1GB bytes | RO SQLite open + `integrity_check`; mode must be `0600`; hosting snapshots same |
| 5 | `2026-02-31` accepted | UTC calendar round-trip validation |
| 6 | `envAlias` echoed to stdout | Safe alias regex; stdout only `envAliasPresent` |
| 7 | import/audit/migrate paths unchecked | Outside-repo + SQLite/CSV mode contracts |
| 8 | Missing regressions | Symlink, in-repo evidence, overwrite, invalid date, non-SQLite, permissive mode, override, synthetic ≥1GB success |
| 9 | Failed child action did not stop following actions | Stop on returned `ok:false` as well as thrown errors; record attempted/planned action counts |
| 10 | Malformed JSON/unknown action/native errors could echo input | Allowlisted action types and safe error messages; secret canary regression |
| 11 | Child rehearsal wrote its report inside the repository | Runner supplies private external `--report`; source bytes and repository report preservation checked |
| 12 | Readonly SQLite open of cold WAL format could create sidecars | Read header first and reject WAL format without opening SQLite; normalized offline snapshots required |

Shared guards: `scripts/lib/ops-external-input-guard.mjs`  
Checkbox auto-complete: still forbidden.

## Validation

재개 후 targeted tests에서 보고서 격리·원본 보존과 가드 검증을 통과했다. 전체 기본 병렬 테스트의 첫 실행은 197개 중 193개 통과, 기존 5초 제한시간 초과 4개였다. 동일 전체 스위트를 `npm test -- --maxWorkers=1`로 재검증해 **24개 파일·197개 테스트 모두 통과**했다(49.22초). 제한시간 설정은 변경하지 않았다.

- 전체 lint: 0 errors, 기존 경고 포함. 새 코드의 불필요한 suppression 제거 후 변경 파일 lint도 통과.
- typecheck, production build: 통과.
- `check:public-data`: 통과.
- `npm audit --omit=dev`: 0 vulnerabilities.
- 마지막으로 보강한 정상 SQLite 소용량 거부 테스트: targeted 재검증 통과.
- GitHub의 기본 병렬 CI는 push 이후 해당 커밋에서 별도로 확인한다.

초기 보고서 격리 테스트는 WAL 형식 입력의 보조 파일 생성으로 실패했다. WAL 사전 거부를 구현하고 정상화된 합성 입력으로 원본 불변을 확인했다.

## 변경 범위

로컬 운영 도구·회귀 테스트·문서를 수정했다. Hostinger 배포, 서버 설정 변경, 실운영 DB 변경, webhook 발송은 수행하지 않았다. 테스트는 임시 합성 DB를 사용한다. 실제 환경 네 항목은 [읽기 전용 점검](2026-09-07-deployment-readonly-review.md)과 같이 아직 미확인이다.
