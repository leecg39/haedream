# BadStatus Specification

## Overview
- Target: `src/components/fit/admin/BadStatus.tsx`
- Route: `/fit/bad`
- Interaction model: select + query

## Structure
제목 “통신상태 불량”. 공통 패널 상단에 `분류`, 계측설비/제어설비 select, 조회 버튼.
아래 5열 그리드: DEVICE, 업체, 타입, 이름, 갱신일. 초기 대산금속 결과는 빈 상태다.

## Exact styles
- desktop panel: 폭 1176px, 높이 약 171px, padding 32px.
- select: 높이 40px, padding 6.4px, 1px `#5190a5`, 투명 배경.
- 조회: 높이 40px, `#2062bf`, radius 4px, padding `8.32px 24px`.
- 결과 header: 5등분 grid, `rgba(4,56,140,.4)`, padding 9.6px.

## Responsive
390px 실측에서 좌측 내비게이션은 사라지고 상단은 업체 선택·프로필·햄버거만 남는다.
본문 margin-top 70px, padding 16px, 제목 24px, panel padding 16px.
5열 헤더는 모두 유지되며 폭 342px 안에서 균등 배치한다.

## Behavior
조회 시 빈 결과 안내를 표 아래에 표시한다. 분류 변경 상태를 유지한다.
