# AdminTablePage Specification

## Overview
- Target: `src/components/fit/admin/AdminTablePage.tsx`
- Routes: user, gate-node, gateway, sequence, gate-rtu, device
- Interaction model: click-driven CRUD/search/sort/pagination

## Structure
`FitShell > main.contents#contentsArea > h1.deskTitle + .sheetArea.setSub`.
패널 상단은 좌측 도구 버튼과 우측 검색, 중앙은 표, 하단은 건수와 페이지 버튼이다.

## Exact styles
- main: 데스크톱 폭 `calc(100% - 200px)`, `margin-top:60px`, `padding:16px 32px`.
- h1: `22.4px`, 500, 흰색, `padding:0 0 10px 5px`, 높이 45.84px.
- panel: `rgba(0,0,29,.4)`, 1px `rgba(255,255,255,.15)`, padding 32px.
- button: 높이 40px, `#2062bf`, 4px radius, 16px; hover `#2b76df`.
- search: 높이 40px, 1px `#5190a5`, 6.4px radius, 폭 150px.
- th: padding `9.6px 3.2px`, `rgba(4,56,140,.4)`, 흰색, 16px/400.
- td: padding `9.6px 3.2px`, 하단 1px `#042337`, `#c8c8c8`, 16px.
- row hover: `rgba(26,35,126,.4)`.

## Page data
- user: 이름/아이디/권한/부서/연락처/접속일자, 원본 빈 상태.
- gate-node: 5행, GATE 4110/4109/4108/4107/4100와 노드 1~10.
- gateway: 18행, 모바일 핵심 GATE/이름/모드/순위, 자동은 `#2dd377`.
- sequence: 업체/제어이름/제어모드/우선순위/제어/상태/제어가능여부/전압/전류/메모, 빈 상태.
- gate-rtu: 6행, RTU 4106~4101, IP `115.94.112.219`.
- device: 40개 이상처럼 보이는 데모 행, 핵심 실제 계측행 최소 12개.

## Responsive
- 768px 이하 패널 16px, 표 영역 가로 스크롤.
- 480px 이하 도구 축소·줄바꿈, 핵심 첫 4열만 노출한다.
- 모바일 표 행 높이 약 62px(gateway)이며 페이지 버튼은 하단 중앙.

## States
검색 결과 없음, 정렬 방향, 선택 행, 추가/수정 모달, 성공 토스트를 구현한다.
