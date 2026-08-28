# AutoResearch 세션 — fit 클론 인터랙션 커버리지

## 상태: 목표 달성 (bounded 14회 중 7회에서 조기 종료)

| 항목 | 값 |
|------|-----|
| Frozen Metric | 원본 인터랙션 커버리지 (higher better) |
| 베이스라인 | 31/45 = 68.89% |
| 최종 | **45/45 = 100.00%** |
| 개선 | +14 인터랙션 (+31.11pp) |
| 이터레이션 | 7회 (keep 7 / discard 0 / crash 0) |
| Guard | tsc 0오류 · 53/53 테스트 · 클래스 보존 100% (전 이터레이션 통과) |

## 재현

```bash
npm run dev                                        # 또는 npm run build && npm start
node autoresearch/eval/interaction_coverage.mjs    # VERIFY
node autoresearch/eval/class_preservation.mjs      # GUARD
```

## 이터레이션 요약

| # | 커밋 | 메트릭 | 변경 |
|---|------|--------|------|
| 0 | caa545d | 68.89 | 베이스라인 |
| 1 | 3b4ebcc | 75.56 | acp 피크제어설정 모달 (#modal #modalActClose #acpStatPeak) |
| 2 | 849b2f8 | 80.00 | acp 에어컨 온도설정 모달 (#modalFan #modalFanActClose) |
| 3 | 901cb0a | 86.67 | firm 업체관리 편집 모달 (#modal #modalActClose #edit-serviceType) |
| 4 | e77334e | 88.89 | firm 주소검색 지도 모달 (#kakaoMapSearch) |
| 5 | c7ffe52 | 91.11 | control-his 표 헤더 #deskSort |
| 6 | 74442cb | 93.33 | firm 저압 업체 테이블 (#lowDeskSort) |
| 7 | 3530ca4 | 100.00 | report 제안서 B/C + 2차 사업타당성 (#print2 #print3 #truth2) |

## 배운 것

- 누락 14개 중 9개가 **모달**이었다. 죽은 빌더 에이전트들이 원본 마크업 대신
  자체 구조를 지어냈고, 그 결과 원본의 id 가 전부 사라져 있었다.
- 원본은 모달을 DOM 에 두고 `.disable` 만 토글한다. 조건부 렌더로 바꾸면
  id 가 DOM 에서 사라져 인터랙션 커버리지가 떨어진다. **원본 방식이 옳다.**
- control-his 의 `#deskSort` 는 원본 th 에 `data-sort` 가 없어 실제로는
  핸들러가 붙지 않는다. 동작을 지어내지 않고 id 만 맞추는 것이 정확하다.

## 남은 것

- 원본 화면과의 픽셀 대조 QA 미수행 (Chrome 확장 무응답 + 로그인 계정 없음).
  현재 검증은 전부 원본 소스 대조 기반이다.
