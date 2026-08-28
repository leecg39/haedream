# WidgetSettings Specification

## Overview
- Target: `src/components/fit/admin/WidgetSettings.tsx`
- Route: `/fit/widget-set`
- Interaction model: click/input-driven settings

## Structure
`FitShell > main.contents > h1 "대시보드 화면설정" > .sheetArea`.
상단에 “1줄에 보여질 위젯 갯수”와 5/4/3개 select.
아래는 에너지사용, 생산현황, RE100 이행, ESG 경영 그룹이다.

## Exact styles
- panel: `rgba(0,0,29,.4)`, border `rgba(255,255,255,.15)`, padding 32px.
- desktop group grid: 2 columns, gap 48px.
- subtitle: 20px/500; 7×22px color bar, blue `#307eeb`, green `#00968a`,
  purple `#592ad0`.
- table header: solid `rgb(1,31,104)`, 16px/400, bottom border white 20%.
- cells: padding `9.6px 3.2px`, bottom border white 20%.
- checkbox: 22px square, border `#5190a5`, checked `#307eeb`.
- order input: 50px wide, transparent, border `#5190a5`.
- save: `#2062bf`, radius 6.4px, padding 8.32px 32px.

## Content
35개 위젯을 원본 순서와 표시 상태로 재현한다. 대표 항목: 실시간 피크 전력(1),
실시간 전력 사용량(2), 오늘의 전력 사용량(3), 현재 상태(10), 공정별 에너지 사용량(16),
이달의 생산현황(17), RE100 이행 현황(22), ESG-지배구조(31), 오늘의 가스 사용량(33),
공정별 에너지(34), 현재 요금제(35). 분야별 에너지 사용량(32)은 미선택이다.

## Responsive
- 1024px 이하 그룹을 1열로 전환.
- 480px 이하 panel padding `16px 0`, 제목/셀은 원본 크기를 유지해 촘촘히 표시.

## Behavior
체크·순서·열 수 편집, 저장 완료 토스트, 미리보기 hover를 구현한다.
