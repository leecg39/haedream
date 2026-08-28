# Program — fit 클론 인터랙션 커버리지

## 목표

fit.rfenms.com 클론에서 **원본이 실제로 제공하는 인터랙션**을 구현한다.

## Frozen Metric

```
node autoresearch/eval/interaction_coverage.mjs
→ 마지막 줄: COVERAGE <hit> <total> <percent>
```

분모 = 원본 페이지 JS(`docs/research/fit.rfenms.com/assets/js/*.js`)가
`addEventListener` 를 붙이는 DOM id 전체 (45개).
분자 = 그중 클론 렌더 결과에 존재하는 id 수.

**방향: higher is better. 베이스라인 31/45 = 68.89%**

분모는 원본 사이트 아카이브에서 파싱한다. 실험 에이전트는 아카이브와
`autoresearch/eval/` 을 절대 수정하지 않는다.

## Guard (모두 통과해야 keep)

```
npx tsc --noEmit                                   # 타입 0 오류
npm test                                           # 53/53 통과
node autoresearch/eval/class_preservation.mjs      # 클래스 보존 100%
```

Guard 파일과 테스트는 수정하지 않는다. 구현을 적응시킨다.

## 수정 범위 (in-scope)

```
src/components/fit/**
src/app/(fit-app)/fit/**
src/lib/fit-mocks/**
```

## 범위 밖 (수정 금지)

```
autoresearch/eval/**              메트릭·가드 인프라
docs/research/fit.rfenms.com/**   원본 아카이브 (메트릭의 분모)
src/app/(watt)/**, src/app/api/** 기존 watt 작업
tests/**, e2e/**                  테스트
public/watt/**, .tmp-qa-*.png     타 작업자 진행분
```

## 힌트

- 누락 id 는 대부분 **모달**이다. 원본은 `.disable` 클래스 토글로 열고 닫는다
  (`.disable { display:none !important }`). React state 로 같은 클래스를 토글하되
  원본 마크업과 클래스명을 그대로 유지할 것.
- 마크업은 `docs/research/fit.rfenms.com/pages/<page>.html` 에 원문이 있다.
  구조를 지어내지 말고 원문에서 가져올 것.
- 동작은 `docs/research/fit.rfenms.com/assets/js/<page>.js` 에서 확인할 것.
- 외부 SDK(카카오맵)는 로드하지 않는다. 컨테이너와 id 만 원본대로 두고
  내부는 정적 플레이스홀더로 채운다.
- 한 이터레이션 = 한 기능. "and" 가 필요하면 분할한다.

## 루프 모드

Bounded — 최대 14회. 커버리지 100% 도달 시 조기 종료.
