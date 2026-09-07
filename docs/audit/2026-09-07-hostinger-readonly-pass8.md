# Hostinger 배포 읽기 전용 재감사 — pass 8

점검일: 2026-09-07 KST

소스 기준: `a4f58eef1175e5f0db04b6f2f23a2836b68101c9` (`feat/fit-clone`, origin 일치)

CI: GitHub Actions `34099455907`, quality·e2e-core 성공

## 결론

Hostinger 인증과 현재 VPS SSH 접속은 정상이다. 그러나 확인 가능한 Hostinger 웹사이트와 현재 VPS 어디에서도 SolarSimz/haedream 배포를 식별하지 못했다. 따라서 실제 배포 커밋, 운영 DB migration 011/013, 서버 scheduler, webhook 환경변수는 여전히 **미확인**이다. 이름이 발견되지 않았다는 사실을 미배포 증명으로 사용하지 않는다.

## 확인 범위

| 범위 | 읽기 전용 결과 |
| --- | --- |
| Hostinger 계정 웹사이트 | 1개, Builder 유형. Node.js 웹사이트 0개. SolarSimz/haedream 이름 일치 0개. Builder라서 Node.js build·cron API는 적용되지 않아 404 응답 |
| 현재 VPS `srv1655088` | SSH 정상. 실행 컨테이너 17개, Compose 프로젝트 11개. 컨테이너/이미지/프로젝트명에서 solar·simz·haedream·kepco·rfenms·egfit·watt 일치 0개 |
| 현재 VPS 설정 단서 | 실행 컨테이너에서 `DATABASE_PATH`, `FIRM_CREDENTIAL_KEY_PATH`, `KEPCO_INLINE_WORKER`, `KEPCO_ALERT_*` 키 일치 0개. `/opt`, `/srv`, `/root` 4단계 이내 관련 디렉터리명 일치 0개 |
| 현재 VPS 용량 | 193G 중 139G 사용, 55G 여유, 72% |
| 이전 VPS `srv1607352` | 저장된 호스트 키와 현재 제시된 ED25519 키가 달라 SSH가 중단됨. 키를 삭제하거나 우회하지 않았고 서버 검사도 수행하지 않음 |
| GitHub | deployments 0, environments 0. 이는 별도 플랫폼 배포 부재를 증명하지 않음 |

비밀값은 조회·기록하지 않았다. 컨테이너 환경변수는 지정된 키의 존재 여부만 검사했다. 서버 파일·컨테이너·DNS·환경변수·DB를 변경하지 않았고 webhook도 발송하지 않았다.

## 판정

- 실제 배포 환경·커밋: 대상 미식별.
- 운영 DB migration 011/013: 운영 DB 미식별로 미확인.
- 스케줄러 실행: 해당 앱/worker 미식별로 미확인.
- webhook·환경변수: 해당 런타임 미식별로 미확인.
- 이전 VPS: Hostinger 패널이나 별도 신뢰 경로에서 새 SSH 키 지문 확인 전 접근 금지.

## 다음 입력

실제 서비스 URL 또는 정확한 서버/호스팅 별칭 하나가 필요하다. 이전 VPS가 대상이면 패널에서 현재 ED25519 지문을 확인해야 한다. 대상이 확인되면 URL→서버/컨테이너→릴리스 SHA→DB 경로→migration→scheduler→환경변수 존재 순서로 읽기 전용 감사를 재개한다.

원본 증거는 Git 밖의 `solarsimz-ops-artifacts/evidence/2026-09-07-pass8-hostinger-ro/read-only-audit.json`에 0600으로 저장했다.
