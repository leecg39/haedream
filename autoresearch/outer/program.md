# SolarSimz 파일럿 운영 RSI

목표: 파일럿 운영 응답의 정확성·테넌트 격리·갱신 직후 최신성을 보존하면서 불필요한 DB 왕복과 JS 행 생성을 줄인다.

실행 범위: 우선 6회 Inner 실험, 3회마다 Outer 분석(2세대). 사용자 선택 전 제안한 기본값으로 진행한다.
유일한 Inner 수정 대상: `src/features/pilot/ops-repository.ts`.
`autoresearch/eval/`, `autoresearch/meta_eval/`, `autoresearch/frozen.json` 및 기존 테스트·스키마·대상 외 소스는 기준선 이후 수정 금지.

## 고정 판정

- 메트릭: inner 시나리오별 `10 × SQL 실행 수 + DB에서 JS로 반환된 행 수`의 합. 작을수록 좋음.
- 정확성 검증을 통과하고 총 작업량이 1 이상 감소해야 keep. 각 시나리오의 작업량이 기존 최선보다 늘면 discard.
- Guard: 기존 테스트, 타입 검사, lint exit code 0. 기존 lint 경고 38개는 기준선에 명시한다.
- 시간은 참고 수치이며 API 응답 시간 개선률로 해석하지 않는다.
- Outer 점수는 별도 규모(137회 검수, 8,760개 계측, 추가 관제점 64개)에서 고정 공식으로 평가한다.

## Inner 절차

1. 대상 코드·최근 로그·`git log --oneline -20`·마지막 keep diff를 읽는다.
2. 하나의 가설을 적고 대상 파일에 원자적 변경 하나를 적용한다.
3. 해당 파일만 stage하여 `experiment(pilot): ...`로 검증 전에 커밋한다.
4. `node autoresearch/eval/run.mjs exp-01 --guard`처럼 고유 ID로 측정한다.
5. 개선+Guard 통과만 keep, 나머지는 해당 실험 커밋을 `git revert`한다. hard reset 금지.
6. 성공·실패 모두 inner_results.tsv와 세션 문서에 기록한다.

## Outer 절차

3회마다 `node autoresearch/meta_eval/outer_score.mjs autoresearch/artifacts/baseline/result.json autoresearch/artifacts/<최선ID>/result.json`을 실행한다.
남은 비용과 실패 이유에 따라 다음 가설의 초점을 갱신하고 `strategy_log.tsv`, `outer_results.tsv`에 근거를 기록한다.
`metric_weights.json`은 탐색 우선순위만 제어한다. 평가 점수의 가중치는 절대 변경하지 않는다.

## 최초 전략

검수 목록 N+1 조회 제거 → 운영 요약의 전체 계측 로딩 제거 → 쓰기 후 중복 조회 제거.
결과 캐시는 최신성을 깨뜨릴 수 있으므로 고정 검증에서 쓰기 직후 재조회한다.
API 응답 필드·권한·DB 스키마·화면과 외부 시스템은 이 실험 범위 밖이다.

## 재개

`autoresearch/autoresearch.md`와 로그를 읽고 마지막 keep에서 이어간다. 새 범위·메트릭은 별도 연구 버전에서 동결한다.
이 문서는 에이전트 실행 지침이며 자체적으로 모델 호출이나 백그라운드 작업을 시작하지 않는다.
