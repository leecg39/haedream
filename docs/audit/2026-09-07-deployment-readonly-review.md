# 배포·DB·스케줄러·webhook 읽기 전용 점검

점검일: 2026-09-07 (KST). 소스 기준: `95c026828adb07f69166e20fbcd1e4c95b3ef601`, 브랜치 `feat/fit-clone`. 재개한 감사 도구 수정은 별도 변경이다.

결론: **실제 운영 대상을 아직 식별하지 못했으므로 네 항목 모두 운영 정상 판정을 내릴 수 없다.** Hostinger 인증은 계정 목록 조회에 사용했으며, 이번 재개 작업에서 배포·DNS·서버 설정·운영 DB 변경과 webhook 발송은 수행하지 않았다.

## 요청한 네 항목

| 항목 | 확인한 근거 | 판정과 남은 확인 |
|---|---|---|
| 실제 배포 환경·커밋 | 재조회한 GitHub deployments 0건, environments 0건. 등록된 워크플로는 `.github/workflows/ci.yml` 하나이며 lint·typecheck·test·build·E2E용이다. 앞선 Hostinger 읽기 전용 조사에는 builder 사이트 1개, Node.js 사이트 0개, VPS Docker 프로젝트 11개가 기록돼 있다. | **대상 미식별.** 조사한 프로젝트명·호스트명에 일치가 없다는 결과는 미배포의 증명이 아니다. 실제 URL → 서버/컨테이너 → 실행 이미지 또는 릴리스 SHA를 연결해야 한다. GitHub HEAD/CI 성공을 배포 SHA로 대체하지 않는다. |
| 운영 DB migration 011 | 기존 `local-dev-post-011` 오프라인 감사에는 011 적용, integrity 정상, 두 orphan count 0이 기록돼 있다. 이는 로컬 개발 사본이다. | **운영 DB 미확인.** 실제 환경과 연결된 승인 오프라인 사본을 읽기 전용으로 검사해야 한다. 현재 적용 여부만으로 과거 migration의 데이터 손실 유무까지 확인할 수 없으므로 pre-011 백업 출처도 필요하다. |
| 서버 스케줄러 실행 | `scripts/kepco-worker.mjs`는 stale 작업 복구 후 큐에서 최대 20개를 처리하고 종료한다. 운영 환경에서는 `src/features/kepco/routes.server.ts`의 inline worker가 기본 비활성화된다. 검토한 저장소에는 해당 worker의 반복 실행을 등록한 cron/systemd timer 설정이 없다. | **서버 실행 미확인.** 서버에서 실제 등록된 스케줄, 실행 사용자·작업 디렉터리·DB 대상, 최근 실행/종료 코드, 큐 처리 이력을 확인해야 한다. CLI 존재·프로세스 한 번 실행·Day0 등록은 지속 실행 증거가 아니다. |
| webhook·환경변수 | 현재 로컬 셸에는 `DATABASE_PATH`, `KEPCO_ALERT_SINK`, `KEPCO_ALERT_WEBHOOK_URL`, `KEPCO_ALERT_WEBHOOK_SECRET`, `KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST`가 설정돼 있지 않다. 루트 `.env*` 파일도 발견되지 않았다. | **운영 설정 미확인.** 로컬 미설정을 운영 미설정으로 해석하지 않는다. 실제 앱·worker·monitor 런타임에서 키의 존재/비어 있지 않음만 확인하고 값은 보고서에 기록하지 않는다. config 검사 성공과 실제 수신 성공은 별도이다. |

## 배포 전 명백한 확인 사항

- 큐를 처리하는 worker가 서버에서 반복 실행되지 않으면 API가 요청을 접수해도 수집 작업이 대기 상태로 남을 수 있다.
- 앱·worker·monitor가 **같은 영속 DB**를 가리키는지 확인한다. 현재 migration 기본 경로는 `data/solarsimz.db`, monitor 기본 경로는 `data/app.db`이므로 운영에서는 `DATABASE_PATH`를 명시하고 대상 일치를 검사해야 한다.
- 감사 입력은 저장소 밖의 접근 제한된 오프라인 사본이어야 한다. 실행 중인 WAL DB를 감사 목적으로 초기화하거나 journal mode를 변경하지 않는다. 새 runner는 cold WAL 형식도 열기 전에 거부하며, 정상화된 사본만 허용한다.
- 대용량 파일의 크기·SQLite integrity 통과와 운영자의 확인 기록만으로 실운영 출처·비식별 적합성·복구 완료를 자동 판정하지 않는다. 실제 복구 검증과 배포 연결 근거를 함께 검토한다.

## 다음 작업에 필요한 최소 입력

실제 서비스 URL 또는 서버/호스팅 이름 하나가 먼저 필요하다. 미배포 상태라면 그렇게 명시한다. 운영 대상이 확인되면 기존 읽기 권한으로 릴리스 SHA, DB 사본의 환경 매핑, 스케줄러 최근 실행 결과, 필요한 환경변수의 존재 여부를 확인한다. 비밀번호·webhook secret·원문 고객정보를 채팅에 붙이지 않는다.

서버 접근이 가능한 후속 담당자는 결과마다 관찰 시각과 대상 별칭을 기록한다. migration 실행, 스케줄 등록, env 수정, webhook 테스트 발송은 이 읽기 전용 점검 범위에 포함되지 않는다. 실제 수집의 7일 관찰은 관찰 시작일부터 진행하며 소급해 완료 처리하지 않는다.

## 근거 위치

- 이번 GitHub 조회와 로컬 키 존재 여부: 저장소 밖 `solarsimz-ops-artifacts/evidence/2026-09-07-resumed-readonly/deployment-readonly-audit.json` (0600).
- 이전 Hostinger 조사: [pass4](2026-09-07-ops-evidence-pass4.md), [pass6](2026-09-07-ops-evidence-pass6.md). 이번 문서는 해당 결과를 재검토했으며 Hostinger 전체 조회를 새로 수행한 보고서가 아니다.
- 소스: [worker](../../scripts/kepco-worker.mjs), [요청 큐 등록](../../src/features/kepco/routes.server.ts), [migration 감사](../../scripts/audit-migration-011.mjs), [monitor](../../scripts/monitor-collection-jobs.mjs), [CI](../../.github/workflows/ci.yml).

잔여 A~E와 출시 체크박스는 계속 미완료다. 이 문서는 운영 정상 확인서가 아니다.
