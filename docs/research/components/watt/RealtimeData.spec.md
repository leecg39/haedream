# RealtimeData Specification

## Overview
- Target: `src/components/fit/admin/RealtimeData.tsx`
- Route: `/fit/net`
- Interaction model: time-driven polling plus filter/toggle

## Structure
제목 “실시간 데이터”. 패널 상단 도구는 Gate 필터와 “업데이트 멈춤”.
본문은 `LoadID / Name / Gate / LoadNo / Len / Data` 6열 그리드이며 긴 16진 패킷을 표시한다.

## Exact styles
- panel: 공통 관리 패널 스타일, 최소 높이 `calc(100vh - 220px)`.
- label: `#72bce3`, margin-right 8px.
- input: 폭 64px, padding 6.4px, 1px `#5190a5`, radius 4px.
- 행: CSS grid, Data 열은 가장 넓고 긴 값은 ellipsis 또는 줄바꿈 없이 잘림.
- 헤더: `rgba(4,56,140,.4)`, 흰색, 중앙 정렬.

## Content
실측 데이터 행을 사용한다: 5884 다이캐스팅1 메인/4101/12/202,
9748 다이캐스팅7 온도 #2/4103/81/42, 9759 다이캐스팅1 온도 #1,
9724 컴프레샤2 등 최소 12행. Data는 실제 형식의 16진 문자열을 사용한다.

## Behavior
Gate 필터, 업데이트 일시정지/재개를 지원한다. 실행 중 수신 시각 또는 패킷 끝부분을
3초마다 작게 바꿔 실시간 상태를 표현하되 레이아웃은 흔들리지 않는다.

## Responsive
640px 이하 도구를 줄바꿈하고 그리드는 가로 스크롤 가능한 최소 폭을 유지한다.
