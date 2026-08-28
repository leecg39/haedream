# FirmManager Specification (업체관리)

## Overview
- **Route:** `/fit/firm` · **Target:** `src/components/fit/firm/FirmManager.tsx`
- **원본:** https://fit.rfenms.com/firm.html (라이브와 아카이브 바이트 동일, 26358B)
- **렌더 하니스:** `/fit/_reference/firm.html`
- **Interaction model:** click / select 기반. **scroll-driven 요소 없음.**

## ⚠ 스타일시트

원본은 `firm.css` 를 링크하지만 서버 파일이 **0바이트**다(404 아님, 빈 파일).
실제 스타일은 `common.css` + `deskLib.css` 에서만 온다. firm.css 는 링크하지 않는다.

`.desk .sort::after` 가 `url(../img/icons.png)` 스프라이트를 쓰므로
`/fit/assets/img/icons.png` 이 있어야 정렬 화살표가 나온다.

## 표 노출 분기 (중요)

원본은 `#deskTable`(고압)과 `#lowDeskTable`(저압) 두 표를 두고 **둘 다 `.disable`** 로
시작한 뒤 `vio.activeTable()` 이 하나만 해제한다.

```js
_fileName: window.location.href.match(/\/([^\/#]+)\.html/)[1]   // firm.html → "firm"
if (this._fileName === 'Firm') { lowDeskTable 노출 } else { deskTable 노출 }
```

`"firm" !== "Firm"` 이므로 **firm.html 에서는 `#deskTable`(고압)이 노출**된다.
`#lowDeskTable` 은 `.disable` 을 유지한다.

## DOM 구조

```
main.contents#contentsArea
├ h1.deskTitle                       "업체관리"
└ div.sheetArea
   ├ div.deskHead
   │  ├ span.deskLabel#deskLimit     "1 - 5 / 5"
   │  ├ div.deskTool#deskTool        ← 버튼 5개
   │  └ div.deskPages                ← 서비스상태 select + 검색
   ├ div.deskArea
   │  ├ table.desk#deskTable         (노출)
   │  └ table.desk.disable#lowDeskTable
   └ div.deskFoot
      ├ span.deskLabel#deskStat      "1 - 5 / 5"
      └ div.deskPages#deskPages      prev / 1 / next
```

## 툴바 — 원본 마크업 그대로

```html
<div class="deskTool" id="deskTool">
  <span class="deskAct act" data-act="add">추가</span>
  <span class="deskAct act" data-act="excel">엑셀</span>
  <span class="deskAct act" data-act="print">프린트</span>
  <a href="power.html" target="_blank" class="deskAct act" id="chargeLink">요금표</a>
  <a href="research.html" target="_blank" class="deskAct act" id="researchLink">한전수집</a>
</div>
<div class="deskPages">
  <select class="eSelect serviceType" id="serviceType" style="width:auto;height:40px">
    <option value="0">서비스상태 선택</option>
    <option value="1">EMS</option>          <option value="2">피크</option>
    <option value="3">저압 완료</option>     <option value="11">EMS 준비</option>
    <option value="12">피크 준비</option>    <option value="13">저압 준비</option>
    <option value="21">EMS 제안</option>     <option value="22">피크 제안</option>
    <option value="23">저압 제안</option>
  </select>
  <span class="deskSearch">
    <input class="deskInput" id="deskInput" maxlength="16"/>
    <i class="icon iconSearch"></i>
  </span>
</div>
```

**주의 3가지**
1. 버튼은 `<button>` 이 아니라 **`<span class="deskAct act" data-act="...">`** 다.
   `.deskAct` 에는 배경/보더 리셋이 없어 button 으로 만들면 UA 기본 상자가 보인다.
2. **`엑셀`(data-act="excel") 이 빠지면 안 된다** — 총 5개.
3. select 에 인라인 `style="width:auto;height:40px"` 가 있다.
   `.eSelect` 기본값이 `width:15rem` 이라 이걸 빼면 폭이 달라진다.

## `#deskTable` 컬럼 — 13열, 순서 엄수

| # | 라벨 | th 속성 |
|---|---|---|
| 1 | ID | `class="sort" data-sort="fid"` |
| 2 | 이름 | `class="sort" data-sort="firmName"` |
| 3 | 전력타입 | `class="sort" data-sort="contract"` |
| 4 | 한전고객번호 | `class="sort" data-sort="kepcoNo"` |
| 5 | EOI | — |
| 6 | PCT | — |
| 7 | 최근전력 | — |
| 8 | 목표전력 | — |
| 9 | 운전모드 | — |
| 10 | 제어방식 | — |
| 11 | 활성 | — |
| 12 | 서비스 | — |
| 13 | **메모** | `data-sort="registTime"` (`.sort` 클래스 없음) |

`<tr id="deskSort">` 가 thead 행의 id 다. tbody 는 `<tbody id="deskList">`.

## Computed Styles (deskLib.css 원문)

```css
.sheetArea  { min-height:calc(100vh - 220px); background-color:rgba(3,3,5,0.4); padding:2rem }
.deskArea   { margin:1.5rem 0 1rem }
.deskTool   { font-size:0; display:flex; align-items:center }
.deskAct    { width:max-content; border-radius:4px; text-decoration:none }
.deskPages  { display:flex; gap:2px; align-items:center; font-size:0 }
.deskPage   { padding:.6rem 1rem }
.desk       { clear:both; width:100%; border-collapse:collapse; border-spacing:0; text-align:center }
.desk th    { padding:0.6rem .2rem; background-color:rgba(0,0,29,0.6); color:#fff;
              font-size:1rem; font-weight:400; transition:all 0.2s }
.desk td    { padding:0.6rem .2rem; border-bottom:1px solid #042337; color:#c8c8c8; font-size:1rem }
.desk tr:hover td { background-color:rgba(26,35,126,0.4) }
.desk .sort { position:relative; padding-left:1rem; padding-right:1rem }
.desk .sort::after { position:absolute; top:.7rem; right:0; width:24px; height:0;
                     background-image:url("../img/icons.png"); content:"" }
.desk .sort:hover::after   { height:24px; background-position:-48px -24px }
.desk .sort.asc::after     { height:24px; background-position:-24px -24px }
.desk .sort.desc::after    { height:24px; background-position:0 -24px }
.deskSearch { position:relative; display:inline-block; height:40px; padding:.2rem .6rem;
              border-radius:.4rem; border:1px solid #5190a5; vertical-align:middle; font-size:1rem }
.deskSearch .iconSearch { position:absolute; right:3px; top:7px; opacity:0.9 }
.deskInput  { width:150px; padding:.2rem; border:none; background-color:transparent;
              color:#fff; vertical-align:middle; font-size:1rem }
.eSelect    { padding:.2rem .4rem; width:15rem; border:1px solid #5190a5;
              border-radius:.4rem; background-color:transparent; font-size:1rem }
.eSelect option { background-color:#000 }
```

## States & Behaviors (firm.js 확인값)

### 1. 정렬 — `#deskSort` / `#lowDeskSort` 의 th click
`data-sort` 속성이 있는 th 에만 핸들러가 붙는다. 같은 컬럼 재클릭 시 asc↔desc 토글,
다른 컬럼 클릭 시 이전 컬럼의 `asc`/`desc` 클래스를 제거한다.
화살표는 `.sort::after` 스프라이트로 그린다.

### 2. 행 클릭 → 편집 모달
`#modal` 의 `.disable` 이 제거되어 업체 편집 폼이 열린다. `</main>` **밖**에 있다.

### 3. 서비스상태 필터 — `#serviceType` change
0(선택없음) 이면 전체, 그 외에는 해당 serviceType 만.

### 4. 검색 — `#deskInput` (maxlength 16)
업체명 부분일치.

### 5. 지도 모달 — `#kakaoMapModal`
`.modal.disable` 로 시작. 내부 `#kakaoMapSearch`, `#kakaoMapArea`.
원본은 Kakao Maps SDK 를 쓰지만 클론은 로드하지 않는다.

### 6. 호버
`.desk tr:hover td { background-color: rgba(26,35,126,0.4) }`
`.desk .sort:hover::after` 로 정렬 화살표 노출. transition `all 0.2s` (th).

## 데이터
`src/lib/fit-mocks/firm.ts`. 실 API 호출 없음.

## Responsive Behavior
- deskLib.css 의 `@media screen and (max-width:480px)` 만 존재한다.
- 그 외 폭에서는 `.sheetArea` 가 `min-height:calc(100vh - 220px)` 로 늘어나고
  표는 `.deskArea` 안에서 가로 스크롤된다.
- 셸 브레이크포인트(1340px 좌측 내비 → 햄버거)는 common.css 가 담당한다.
