# AlarmSettings Specification

## Overview
- Target: `src/components/fit/admin/AlarmSettings.tsx`
- Route: `/fit/notify`
- Interaction model: inline input/save

## Structure and content
제목 “알람설정”, 1176px 패널 안에 폭 1102px 표.
2단 헤더: 설비명/현재전압/현재전류/현재전력 + SMS 알람 설정.
하위 열: 시간, MIN/MAX 전압, MIN/MAX 전류, MIN/MAX 전력, 알람, 저장.
TR1/TR2/TR3와 다이캐스팅·콤프레셔 계측기 행을 표시한다.

## Exact styles
- 공통 panel: `rgba(0,0,29,.4)`, 1px `rgba(255,255,255,.15)`, padding 32px.
- 헤더: `rgb(1,31,104)`, 하늘색 텍스트, 셀 경계 white 15%.
- 입력: 투명 배경, 1px `#5190a5`, 6.4px radius.
- 시간 기본값 09:00~18:00, 숫자 placeholder 0.0 또는 0.
- 저장은 텍스트 액션이며 hover 색을 강조한다.

## Responsive
768px 이하 표 컨테이너를 가로 스크롤하고 패널 padding 16px.
모바일에서도 원본 입력 크기와 열 구조를 보존한다.

## Behavior
각 행을 독립 편집하고 저장하면 해당 행에 짧은 저장 완료 상태를 표시한다.
