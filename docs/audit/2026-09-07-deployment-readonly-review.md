# 배포·DB·스케줄러·webhook 읽기 전용 점검

점검일: 2026-09-07 (KST).  
소스 기준(최초 초안): `95c026828adb07f69166e20fbcd1e4c95b3ef601`.  
재확인 기준(인계 후): `96bc273431d8004a2e1e13dd92fce99afe5f468e` (`feat/fit-clone`, origin 일치).  
CI: `34071489074` — `quality` ✓, `e2e-core` ✓ (exact SHA).

결론: **실제 운영 대상을 아직 식별하지 못했으므로 네 항목 모두 운영 정상 판정을 내릴 수 없다.** Hostinger 인증은 계정 목록 조회에 사용했으며, 이번 재개·인계 작업에서 배포·DNS·서버 설정·운영 DB 변경과 webhook 발송은 수행하지 않았다. 조사 범위에서 대상이 안 보인다고 해서 **미배포로 단정하지 않는다.**

## 요청한 네 항목

| 항목 | 확인한 근거 | 판정과 남은 확인 |
|---|---|---|
| 실제 배포 환경·커밋 | 재조회 GitHub deployments **0**, environments **0**. 워크플로 `.github/workflows/ci.yml` 하나(품질/E2E). Hostinger pass4/pass6: builder 1·Node.js 0·VPS Docker 11, 호스트명에 solar/haedream/fit/kepco/watt/simz 매칭 없음. | **대상 미식별.** 미배포 증명 아님. **필요 입력:** 실제 서비스 URL 또는 서버/호스팅 별칭(또는 “미배포” 명시). 그다음 URL→서버/컨테이너→실행 이미지·릴리스 SHA 연결. GitHub HEAD/CI 성공 ≠ 배포 SHA. |
| 운영 DB migration 011 | `local-dev-post-011` 오프라인 감사: 011 적용·integrity ok·orphan 0 (로컬 개발 사본). | **운영 DB 미확인.** 실제 환경에 매핑된 승인 offline 사본 + pre-011 backup provenance 필요. 로컬 011 통과는 운영 증거가 아님. |
| 서버 스케줄러 실행 | `scripts/kepco-worker.mjs`는 stale 복구 후 `processQueuedJobs(20)` 하고 **종료**(장기 daemon/cron 아님). production에서 inline worker는 `KEPCO_INLINE_WORKER`/`NODE_ENV` 계약상 기본 비활성. 저장소에 worker 반복 실행 cron/systemd 설정 없음. | **서버 실행 미확인.** 서버에 등록된 스케줄(또는 동등 반복 실행), 실행 사용자·cwd·`DATABASE_PATH`, 최근 exit/로그·큐 처리 이력 필요. CLI 1회 실행·Day0 등록 ≠ 지속 실행. |
| webhook·환경변수 | 로컬 셸/`.env*`: `DATABASE_PATH`·`KEPCO_ALERT_*` 키 **미설정**. | **운영 설정 미확인.** 로컬 미설정 ≠ 운영 미설정. 앱·worker·monitor 런타임에서 키 **존재/비어 있지 않음**만 확인(값 미기록). config dry-check ≠ 실송신. |

## 배포 전 명백한 확인 사항 (소스 계약)

- 큐 worker가 서버에서 **반복 실행**되지 않으면 API 접수 후 작업이 대기할 수 있다. 현재 CLI는 배치 처리 후 종료한다.
- 앱·worker·monitor가 **같은 영속 DB**를 가리켜야 한다. 기본값 불일치: app/migrate `data/solarsimz.db` (`src/lib/db.ts`, `scripts/migrate.mjs`) vs monitor `data/app.db` (`scripts/monitor-collection-jobs.mjs`). 운영에서는 `DATABASE_PATH`를 명시하고 세 경로 일치를 검사한다.
- 감사 입력은 저장소 밖·접근 제한 offline 사본. live WAL/`data/solarsimz.db` 직접 감사 금지. runner는 cold WAL 형식도 열기 전 거부.
- 대용량·integrity·attestation만으로 실운영 출처·복구 완료를 자동 판정하지 않는다.

## 다음 작업에 필요한 최소 입력

**하나만 먼저:** 실제 서비스 URL 또는 서버/호스팅 이름. 미배포면 그렇게 명시.  
이후(읽기 전용): 릴리스 SHA, 환경↔offline DB 매핑, 스케줄러 최근 실행, 필요 env 키 존재 여부. 비밀번호·webhook secret·원문 고객정보 채팅 금지.

migration 실행, 스케줄 등록, env 수정, webhook 테스트 발송은 이 읽기 전용 범위 밖. A~E·7일 관찰 체크박스는 미완료 유지.

## 근거 위치

- 재개 감사: `solarsimz-ops-artifacts/evidence/2026-09-07-resumed-readonly/deployment-readonly-audit.json` (0600)
- 인계 후 follow-up: `…/deployment-readonly-followup-96bc273.json` (0600)
- CI 기록: `…/verification-96bc273.ci.json`
- Hostinger: [pass4](2026-09-07-ops-evidence-pass4.md), [pass6](2026-09-07-ops-evidence-pass6.md)
- 소스: [worker](../../scripts/kepco-worker.mjs), [routes inline](../../src/features/kepco/routes.server.ts), [db](../../src/lib/db.ts), [monitor](../../scripts/monitor-collection-jobs.mjs), [CI](../../.github/workflows/ci.yml)

이 문서는 운영 정상 확인서가 아니다.
