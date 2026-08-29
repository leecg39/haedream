# ABC 관리자 잔여 3페이지 Specification

원본: watt.rfenms.com (인증 없이 스켈레톤 서빙). 라이브 fetch 기준.

## 1. sequence.html → /abc/sequence 시퀀스제어

기존 AbcDeskTable(공유) 재사용.

- deskTool wrapper class: `deskTool onlypci` (원본 그대로 유지)
- 툴바 6개, data-act 순서: add, mode, off, on, excel, print
  - add: bi-node-plus "추가"
  - mode: bi-toggles "모드전환"
  - off: bi-toggle-off "전체 OFF"
  - on: bi-toggle-on "전체 ON"
  - excel: bi-file-earmark-excel-fill excel "엑셀로 다운"
  - print: bi-printer "프린트"
- 컬럼(10열): 업체, 제어이름, 제어모드, 우선순위, 제어, 상태, 제어가능여부, 전압, 전류, 메모
- CSS: common.css + deskLib.css (이미 로드 중, 전용 CSS 없음)

## 2. net.html → /abc/net 실시간데이터

전용 레이아웃 (테이블 아님, 2단 note 그리드).

```
h1.deskTitle "실시간 데이터"
div.sheetArea
  div.deskTool
    span.deskLabel "필터 "
    input.input#filterGate[maxlength=8][placeholder=gate]
    span.act.space#togglePause > i.bi.bi-stop-circle + "업데이트 멈춤"
  div.noteTwin
    div.note#itemListRTU  → span×6: LoadID / Name / Gate / LoadNo / Len / Data
    div.note#itemListNODE → span×6: Type / Name / Gate / Node / Len / Data
```

CSS(net.css, 원본):
- `.deskTool{margin-top:1rem}` `.deskLabel{color:#72bce3;margin-right:.5rem}`
- `.input{width:4rem;padding:.4rem;border:1px solid #5190a5;border-radius:4px;background:transparent;font-size:1rem}`
- `.act{height:40px;padding:.52rem 1.5rem;border-radius:4px;background-color:#2062bf}` `.act:hover{background-color:#2b76df}`
- `.act.space{margin-left:.5rem}`
- `.noteTwin{display:flex;gap:2rem}` (≤640px: `display:block`)
- `.note{flex:1;display:grid;grid-template-columns:1fr 4fr 1fr 1fr 1fr 8fr;gap:.4rem;margin-top:1rem}`
- `.noteText{font-size:.86rem;color:#c0c0c0}`

원본은 실시간 폴링으로 note 안에 행을 append 한다. 클론은 정적 데모 행 2~3개로 레이아웃만 재현한다.

## 3. widgetSet.html → /abc/widget-set 대시보드 화면설정

원본 마크업(35개 위젯, 4개 섹션) 재현. 데이터는 `docs/research/abc.watt/widgetset-rows.json`.

```
h1.deskTitle "대시보드 화면설정"
div.sheetArea
  div.col1
    div.subtitle > span.colorBar.blue + "1줄에 보여질 위젯 갯수"
    select#displayNumber.select > option[5개,4개,3개]
  (섹션마다 반복 4회)
    div.subtitle > span.colorBar.{blue|green|purple|blue} + 섹션명
    div.col2
      div.col2Left > table.sheet(보이기/순서/항목/미리보기) > tbody: widgetRow 절반
      div.col2Rt   > table.sheet(동일) > tbody: widgetRow 나머지 절반
```

| 섹션 | colorBar | 위젯 수 |
|---|---|---|
| 에너지사용 | blue | 19 (id 1-15,31-33,35) |
| 생산현황 | green | 6 (id 16-20,34) |
| RE100 이행 | purple | 5 (id 21-25) |
| ESG 경영 | blue | 5 (id 26-30) |

각 행: `<tr class="widgetRow" id="widget{N}"><td><input type="checkbox"></td><td><input type="number" value="{order}"></td><td>{label}</td><td>미리보기</td></tr>`
- id=23 라벨: "SMP·REC 그래프" (원본 `<i class="bi bi-dot">` 구분자 텍스트화)
- id=35(현재 요금제)는 미리보기 칸이 원본에서 비어있음

CSS(widgetSet.css, 원본):
- `.col1{display:flex;align-items:center;gap:2rem;margin-bottom:2rem}`
- `.col2{display:grid;grid-template-columns:1fr 1fr;gap:3rem;margin-bottom:1rem}`
- `.subtitle{display:flex;align-items:center;font-size:20px;font-weight:500}`
- `.colorBar{display:inline-block;width:7px;height:22px;margin-right:12px;border-radius:4px;background-color:#307eeb}`
- `.sheet{clear:both;width:100%;margin:1rem 0 2rem 0;text-align:center;border-collapse:collapse;border-spacing:0}`

체크박스/순서 입력은 React state 로 토글 가능하게 만든다(원본 기본값 unchecked).

## 공통

- 모든 페이지 `<main class="contents" id="contentsArea">` (disable 제거).
- 환경설정 메뉴 3항목을 `/abc/sequence`, `/abc/net`, `/abc/widget-set` 으로 연결.
