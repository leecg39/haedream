# SolarSimz RSI 세션

상태: 완료. Inner 6/6, Outer 2/2. 최선: exp-06 (317), 앱 커밋 4e1d4d2.
원본 커밋: `00a61d2`. 평가 동결: `4c42a1f`.
대상 파일: `src/features/pilot/ops-repository.ts`.
기준선: inner 작업량 2971, outer 작업량 10707.
기존 테스트 67개 통과, 타입 검사 통과, lint 오류 0/기존 경고 38.

평가 및 재개 절차는 `outer/program.md` 참조. 모든 실험별 JSON은 `artifacts/`에 저장한다.
작업량은 `10 × SQL 실행 수 + 반환 행 수`로 측정하며 API 지연 시간과 같지 않다.
백그라운드 모델 서비스는 실행하지 않는다. 현재 세션의 에이전트가 6회 실험을 수행한다.

실험 1 keep: 검수 20건 SQL 21→2회, 100건 SQL 101→2회. Guard 통과.
실험 2 keep: 최근 계측 시각 조회를 2400/8760행에서 1행으로 축소. Guard 통과.
실험 3 keep: 일일 확인 생성·갱신 SQL 4→3회, ID 보존. Guard 통과.
Outer 1: 큰 규모 작업량 10707→937, 회귀 없음. 우선순위를 매핑·알람으로 갱신.
실험 4 keep: 매핑 조회 반환량 18/66→1행, 대소문자 엄격 비교 보존. Guard 통과.
실험 5 discard: 총점 316으로 개선되었으나 반복 ack 비용 11→21, SQL 1→2회로 회귀. f04e469를 git revert.
실험 6 keep: 최초 ack SQL 3→2회, 반복 ack 1회 유지. Guard 통과.
Outer 2: 작업량 797, 기준선 대비 92.5563% 감소. 개별 시나리오 회귀 없음.
Inner 작업량 317, 기준선 대비 89.3302% 감소. 5 keep / 1 discard / 0 crash.
프로덕션 빌드 및 Chrome 브라우저 E2E 12개 통과(32.9초). 동결 134개 파일 무변경 확인.
이번 6회 실행은 종료되었다. 백그라운드 실험 프로세스는 없다. 전체 결과는 REPORT.md 참조.

다음 재개 후보: 일일 확인 UPSERT RETURNING. 반드시 기존 평가 해시와 실험 로그부터 확인한다.
재개 시 새 실험 ID를 사용한다. 예: `node autoresearch/eval/run.mjs exp-07 --guard`.
기존 폴더 이름을 재사용하면 평가 실행기가 덮어쓰기를 거부한다.
