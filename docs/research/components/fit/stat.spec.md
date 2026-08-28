# StatDashboard Specification (통합관제)

## Overview
- **Route:** `/fit/stat` · **Target:** `src/components/fit/stat/StatDashboard.tsx`
- **원본:** https://fit.rfenms.com/stat.html (라이브와 아카이브 바이트 동일, 18353B)
- **렌더 하니스:** `/fit/_reference/stat.html` — 원본은 비인증 시 login.html 로 리다이렉트되므로
  스크립트만 제거해 로컬에서 렌더한 것. computed style 은 여기서 실측했다.
- **CSS:** `/fit/assets/css/stat.css` (원본 무변환) + common.css
- **Interaction model:** click-driven + select-driven. **scroll-driven 요소 없음.**

## ⚠ 루트 폰트 크기

`stat.css` 첫 줄이 `html { font-size: 15px }` 다. 기본 16px 이 아니므로 이 페이지의
모든 `rem` 은 15px 기준이다. ≤1075px 에서는 14px 로 다시 줄어든다.

## DOM 구조 (원본 `<main>` 직계 4개)

```
main.contents#contentsArea          flex row, space-between, height calc(100% - 60px)
├ div.widget.firmData               z-index:2, 28vw, min-width 390px, height calc(100vh - 60px - 2rem)
│  ├ div.listFilter                 flex, space-between, center, padding 0 10px
│  │  ├ div.selectIcon              flex, center → i.bi.bi-justify-left + select#orderBy
│  │  └ div.listStatus              flex, gap 5px, height 50px, #c9c0ba, 13px
│  ├ div.listCover                  width 100%, height calc(100% - 80px), overflow hidden
│  │  └ div.list                    height 100%, overflow-x auto, radius 20px,
│  │                                bg rgba(3,3,5,0.3), backdrop-filter blur(10px)
│  │     ├ ul.listHeader > li.headerRow
│  │     └ ul.listBody#firmList > li.dataRow × N
│  └ div.pagination#deskPages       flex, gap 20px, center, 0.875rem, rgba(238,238,238,.4)
├ div.rightsection                  z-index:2, flex column, gap 1vh, height 100%, overflow hidden
│  ├ div.widget.until               18vw, min-width 250px, height 32vh, min-height 240px
│  ├ div.widget.ranking             18vw, min-width 250px, height 33vh
│  └ div.widget.csBox               18vw, min-width 250px, height calc(33vh - 60px - 2rem)
├ div.map#map                       position absolute, inset 0, 100%×100%, z-index 1  ← 배경
└ div.peakDetailWrap.disable#peakDetailWrap   position absolute, top -265px, right -220px
```

**중요:** `.map` 은 절대위치 배경이고 `.firmData`/`.rightsection` 이 `z-index:2` 로 그 위에 뜬다.
래퍼 div 로 감싸면 `#contentsArea` 의 flex 직계 자식 관계가 깨져 레이아웃이 무너진다.
**직계 4개 구조를 반드시 유지할 것.**

## Computed Styles (원본 CSS 원문값)

### .widget (공통)
padding `15px 20px` · overflow hidden · background `rgba(3,3,5,0.5)`
box-shadow `0 8px 32px 0 rgba(0,0,0,0.25) inset` · backdrop-filter `blur(4px)` · border-radius `20px`

### .list .headerRow / .list .dataRow — 6열 그리드
`display:grid; grid-template-columns:8% 25% 14% 16% 16% 21%; justify-content:center;
align-items:center; min-width:420px; line-height:1; font-size:1rem; text-align:center`
- headerRow 만: `height:80px; padding:0 10px; background-color:rgba(0,0,29,0.6);
  backdrop-filter:blur(10px); word-break:keep-all`
- dataRow 만: `padding:0 15px; border:1px solid transparent; cursor:pointer`
- `.dataRow > span { display:inline-block; padding:7px }`

**열 색상**
| 열 | headerRow | dataRow |
|---|---|---|
| 2 (업체명) | `#b8faff` | `#b8faff` |
| 5 (절감률) | `#00ffff` | `#00ffff` |
| 6 (절감금액) | `#ffec7d` | `#ffec7d` |

`.list .firmName { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left }`
`.list .listBody { display:flex; flex-direction:column; justify-content:space-between; height:calc(100% - 84px) }`

### .statusIcon
`display:inline-block; width:10px; height:10px; margin-left:3px; border-radius:5px; background-color:#76ff03`
- `.good` → `#ffff81` · `.warning` → `#ffa403` · `.emergency` → `#ff0000`
- `.listStatus .statusIcon:first-child { margin-left:10px }`

### .untilData
`display:flex; justify-content:space-between; align-items:center; position:relative; width:100%`
- `.label` — `line-height:1.2; font-size:1rem; color:#b8faff`
- `.value` — `color:#ad44ff; font-size:1.25rem; font-weight:600`
- `.untilData:nth-child(3n) .value { color:#00ffff }`
- `.title { width:100%; text-align:start; font-size:1.125rem; white-space:nowrap }`
- `.title:nth-child(2) { padding-top:40px }`
- `hr { width:100%; margin:0; border:0; border-top:1px solid rgba(238,238,238,0.2) }`
- `.upday { display:flex; justify-content:start; gap:5px; width:100%; padding-top:2px;
  line-height:1; font-size:0.875rem; word-break:keep-all; flex-wrap:wrap }`

### .ranking / .csBox
- `.rankingTop { display:flex; justify-content:space-between; align-items:center }`
- `.ranking .rankingChart { width:100%; height:calc(100% - 40px) }`
- `.cs { display:flex; flex-direction:column; width:100%; height:calc(100% - 35px);
  margin-top:5px; overflow-y:scroll }`
- `.cs` 스크롤바: width 8px, track bg `rgba(19,21,24,0.5)`,
  thumb `rgba(0,255,255,0.5)` + `1px solid rgb(184,250,255,0.5)`, radius 2px
- `.alarmItem { width:100%; color:#eee }` · `.alarmItem i { margin-left:30px }`
- `.alarmCategory, .alarmTitle { display:flex; justify-content:space-between;
  align-items:center; padding-bottom:5px }`
- `.alarmCategory { color:#00ffff; word-break:keep-all }`
- `.alarmItem .date { color:#c6c6c6; font-size:0.875rem }`
- `.alarmTitle .title { font-size:0.875rem; font-weight:300; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis }`

### .peakDetailWrap (상세 오버레이)
`position:absolute; top:-265px; right:-220px` — **인라인 style 로 덮어쓰지 말 것**
- `.peakDetail { z-index:2; padding:0.2rem 0.3rem; width:450px; background:rgb(0 0 0 / 80%); border-radius:10px }`
- `.peakDetailHead`, `.peakDetailRow` — `display:grid; grid-template-columns:20% 19% 19% 19% 19%; gap:1%`
- `.peakDetailColumn { color:#8fd0e9; font-size:1rem; text-align:center }`
- `.peakDetailLabel { color:#a4dcff; font-size:1rem }` · `.peakDetailUnit { color:#9fa0a0; font-size:0.7rem }`
- `.peakDetailItemIcon svg { display:block; width:1rem; height:1rem }` — `<i class="bi">` 로 대체 금지
- `.peakDetailItemLabel { background-color:#4b4b4b; border-radius:4px; padding:0.1rem 0.2rem; color:#fff }`

## States & Behaviors (stat.js 확인값)

### 1. 정렬 — `#orderBy` change
옵션 9개(원문): `정렬 보기`(""), `업체명 내림차순`(firmNameDESC), `업체명 오름차순`(firmNameASC),
`실시간 전력 내림차순`(thisPowerDESC), `실시간 전력 오름차순`(thisPowerASC),
`절감률 내림차순`(frugalRatioDESC), `절감률 오름차순`(frugalRatioASC),
`절감금액 내림차순`(frugalMonthDESC), `절감금액 오름차순`(frugalMonthASC)

### 2. 행 선택 — `#firmList` click
`event.target.closest('.dataRow')` 의 `data-fid` 가 있을 때만 동작한다.
선택 행에 `.active` 부여 → `background-color:#26ccff33` + 4방향 `1px solid #00d6ff`.
동시에 `#peakDetailWrap` 의 `.disable` 이 제거되어 상세 오버레이가 열린다.

### 3. 랭킹 기간 — `#rankingFilter` change
`오늘`(today) / `이번주`(week) / `이번달`(month) / `올해`(year). ECharts dark 테마로 재렌더.

### 4. 상태 아이콘 규칙 (원본 stat.js)
`serviceType === 3`(저압 완료)일 때만 표시한다.
- 피크 발생 중 → `<span class="statusIcon warning">`
- `netError === 0` (통신불량) → `<span class="statusIcon emergency">`

### 5. 호버
`.dataRow { cursor:pointer }` 외에 별도 hover 전환 규칙 없음. transition 정의 없음.

## Text Content (원본 verbatim)
- 범례: `제안` / `정상` / `통신불량` / `피크발생`
- 표 머리글: `업체명` / `계약전력(kW)` / `실시간 전력(kW)` / `절감률(%/월별)` / `절감금액(원/월별)`
  (1열은 상태아이콘용 빈 칸)
- 우측: `참여 업체 수` · `제안` · `설치` · `개` · `총 누적 절감 금액` · `원`
- `업데이트` · `[D+0, 0000.00.00 ~ ]`
- `절감금액 랭킹 TOP 5` · `오늘/이번주/이번달/올해`
- `알림` · 알림 항목 카테고리 예: `통신상태 오류`

## 데이터
데모 목 데이터는 `src/lib/fit-mocks/stat.ts` 에 둔다. 실 API 호출 없음.
ECharts / Kakao Maps SDK 는 로드하지 않는다.
`#rankingChart` 는 컨테이너와 id 를 원본대로 두고 내부만 CSS/SVG 근사.
`#map` 은 절대위치 배경 컨테이너를 유지하고 정적 플레이스홀더를 넣는다.

## Responsive Behavior
- **>1075px:** 3열 (firmData | map 배경 | rightsection), `html` 15px
- **≤1075px:** `html` **14px**, `#contentsArea { flex-direction:column-reverse; gap:1rem; height:auto }`
  → **지도가 시각적으로 맨 위로 간다**. `.map { position:relative; height:calc(60vh - 60px - 1rem) }`,
  `.firmData { width:100%; min-width:0 }`, `.rightsection { flex-direction:row; height:auto }`,
  `.until/.ranking/.csBox { width:calc(33.3vw - 2rem); height:380px }`, `.upday { padding-top:0 }`
- **≤810px:** `.rightsection { flex-direction:column }`, 위젯 3종 `width:100%; height:360px`
