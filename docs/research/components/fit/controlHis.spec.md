# FitControlHisPage Specification

## Overview
- **Route:** `/fit/control-his`
- **Target file:** `src/app/(fit-app)/fit/control-his/page.tsx`
- **원본:** https://fit.rfenms.com/controlHis.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/controlHis.html` · JS `docs/research/fit.rfenms.com/assets/js/controlHis.js`
- **`<title>`:** 피크제어이력
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/controlHis.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: xlsx.full.min, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">피크제어이력</h1>
            <div class="chart1" id="chart1"></div>
            <div class="deskToolWrap">
                <div class="deskPages">
                    <span class="deskLabel">날짜</span>
                    <div class="datePicker">
                        <div class="tui-datepicker-input tui-datetime-input tui-has-focus">
                            <input type="text" class="inputDate" id="mDate" aria-label="Date-Time" readonly>
                            <i class="bi bi-calendar"></i>
                        </div>
                        <div id="wrapper"></div>
                    </div>
                    <input type="hidden" id="sDate" />
                </div>
                <div class="deskLimit">
                    <span class="deskLabel">제어설비</span>
                    <select class="deskSelect" id="facList">
                        <option value="0">설비 선택</option>
                    </select>
                </div>
                <div class="deskTool" id="deskTool">
                    <span class="deskAct act" data-act="excel">
                        <i class="bi bi-file-earmark-excel-fill excel"></i>엑셀로 다운
                    </span>
                    <span class="deskAct act" data-act="print">
                        <i class="bi bi-printer"></i>프린트
                    </span>
                </div>
            </div>
            <div class="deskArea">
                <div class="tableCaption">
                    <!-- <div>
                        <span class="captionMark" id="energyDate">0000-00월</span>
                    </div> -->
                    <div>
                        <span class="captionTitle">총 제어시간</span>
                        <span class="splitUnit">:</span>
                        <span class="captionMark" id="energyTime">0</span>
                    </div>
                    <span class="splitUnit disable">/</span>
                    <div id="totalFrugal" class="disable">
                        <span class="captionTitle">총 절감액</span>
                        <span class="splitUnit">:</span>
                        <span class="captionMark" id="energyGold">0</span>
                    </div>
                    <span class="splitUnit">/</span>
                    <div>
                        <span class="captionTitle">최대 절감액</span>
                        <span class="splitUnit">:</span>
                        <span class="captionMark" id="energyGoldMax">0</span>
                    </div>
                </div>
                <div class="sheetScroll">
                    <table class="desk" id="deskTable">
                        <thead>
                            <tr id="deskSort">
                                <th>CID</th>
                                <th>제어설비</th>
                                <th>제어시작</th>
                                <th>제어종료</th>
                                <th>예측전력</th>
                                <th>목표전력</th>
                                <th>제어시간</th>
                                <th>절감 (<span class="sheetEm">만원</span>)</th>
                            </tr>
                        </thead>
                        <tbody id="deskList">
                            <tr>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="deskStat">
                <div class="deskLimit">
                    <span class="deskLabel" id="deskStat">1 - 5 / 5</span>
                </div>
                <div class="deskPages" id="deskPages">
                    <span class="deskPage act">prev</span>
                    <span class="deskPage act active">1</span>
                    <span class="deskPage act">next</span>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.lowBox{margin-bottom:15px}
.chart1{width:100%;height:calc(60vh - 160px);overflow:hidden;padding:0;margin:0 0 15px 0;border:2px solid rgba(0, 0, 0, 0.1);border-radius:20px;background-color:rgba(3, 3, 5, 0.4);box-shadow:rgba(0, 0, 0, 0.15) 0 0 120px inset}
/* deskToolWrap */
.deskToolWrap{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;height:auto;padding:15px 20px;background:linear-gradient(rgba(0, 0, 29, 0.6), rgba(0, 0, 29, 0.6)), rgba(3, 3, 5, 0.4);border-radius:20px 20px 0 0;text-align:center}
.deskPages, .deskLimit{display:flex;flex-direction:row;align-items:center;gap:10px;width:100%;height:auto}
.deskLabel{width:auto;height:100%;margin-left:15px;color:#b8faff;white-space:nowrap}
.datePicker,
.deskSelect{overflow:hidden;width:100%;min-width:170px;height:40px;padding:0 15px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540;font-size:1rem}
.datePicker:hover,
.deskSelect:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.deskSelect option{background-color:#000}
.tui-datepicker-input{border:0}
.input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.8)}
.label{cursor:pointer}
.deskTool{display:flex;align-items:center;justify-content:center;flex-direction:row;gap:0.5rem}
.deskPage{padding:.6rem 1rem}
/* deskArea */
.deskArea{width:100%;height:auto;padding:20px;margin-bottom:15px;background-color:rgba(3, 3, 5, 0.4)}
.tableCaption{display:flex;align-items:center;justify-content:center;gap:15px;width:100%;height:auto;margin:0 auto 15px}
.sheetScroll{overflow:auto;max-height:calc(50vh - 290px);min-height:100px}
.sheetScroll::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.sheetScroll::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid #b8faff}
.sheetScroll::-webkit-scrollbar-track{border-radius:2px}
.sheetScroll::-webkit-scrollbar-corner{background-color:transparent}
.desk{clear:both;width:100%;border-top:2px solid rgba(238,238,238,0.3);border-bottom:2px solid rgba(238,238,238,0.3);border-collapse:separate;border-spacing:0;text-align:center}
.desk thead{position:sticky;top:0;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(10px)}
.desk th{height:40px;border-top:1px solid rgba(238,238,238,0.3);border-bottom:2px solid rgba(238,238,238,0.3);color:#00ffff;font-size:0.98rem;font-weight:400}
.desk td{height:40px;border-bottom:1px solid rgba(238,238,238,0.3);color:#eee;font-size:0.98rem}
.desk .em{margin-left:.2rem;color:#808080;font-size:.86rem}
.desk .mark{color:#29b6f6}
.desk tr:hover td{background-color:rgba(217,217,217,.2);color:#fff}
.active td{border-top:1px solid #b8faff;border-bottom:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.unable td{color:#707070}
.captionMark{color:#b8faff}
.splitUnit{margin:0 .4rem;color:#808080;font-weight:600}
/*deskStat */
.deskStat{display:flex;justify-content:space-between;align-items:center}
.deskStat .deskPages{width:auto}
/* 기존데이터 */
.toggle{display:inline-block;position:relative;width:38px;height:21px;background-color:#fff;border-radius:.6rem;cursor:pointer}
.toggle::before{position:absolute;top:3px;left:3px;width:15px;height:15px;background-color:#989898;border-radius:50%;content:""}
.toggle.active{background-color:#1976d2}
.toggle.active::before{left:auto;right:3px;background-color:#fff}
.deskSearch{display:inline-block;padding:.2rem .6rem;border-radius:.4rem;border:1px solid #5190a5;vertical-align:middle;font-size:1rem}
.deskInput{width:12rem;padding:.2rem;border:none;background-color:transparent;color:#fff;vertical-align:middle;font-size:1rem}
.deskInput:focus{outline:none}

.desk .sort{position:relative;padding-left:1rem;padding-right:1rem}
.desk .asc{padding-left:0;padding-right:2rem}
.desk .desc{padding-left:0;padding-right:2rem}
.desk .sort:hover{padding-left:0;padding-right:2rem}
.desk .sort::after{position:absolute;top:.8rem;right:0;width:24px;height:0;background-image:url("../img/icons.png");content:""}
.desk .sort:hover::after{height:24px;background-position:-48px -24px}
.desk .sort.asc::after{height:24px;background-position:-24px -24px}
.desk .sort.desc::after{height:24px;background-position:0 -24px}
.textMemo{margin:.4rem 1.6rem 0;padding:.2rem .8rem;border-radius:.4rem;background-color:#ad1457;color:#fff;font-size:.92rem}

.desk .textAct:hover{color:#8bc34a;cursor:pointer}
.input::-webkit-calendar-picker-indicator{filter:invert(.8)}
.sheetEm{margin-right:4px;color:inherit;font-style:italic}
.caption{margin-bottom:1rem}

@media (max-width:1470px){
    .chart1{padding:15px}
}

@media (max-width:850px){
    .deskToolWrap{flex-wrap:wrap}
    .deskTool{width:100%}
    .deskLabel{width:80px;text-align:start}
    .deskPages{width:100%}
    .chart1{width:100%;;height:calc(50vh - 150px)}
    .sheetScroll{overflow:auto;max-height:calc(50vh - 310px)}
}

@media (max-width:768px){
    .deskTool+.deskPages{display:none}
    .deskArea{overflow:auto}
    .desk th{min-width:6rem}
    .input{width:8rem;padding:.2rem .4rem;font-size:1rem}
    .captionMark:first-child{display:block}
    .splitUnit{display:none}
    .chart1{width:100%;;height:calc(50vh - 150px)}
    .tableCaption{flex-wrap:wrap;justify-content:space-around}
    .tableCaption>div:first-child{width:100%;text-align:center}
    .deskStat{flex-wrap:wrap;gap:5px;justify-content:center}
}
@media (max-width:363px){
    .tableCaption{flex-wrap:wrap;justify-content:space-between}
    .tableCaption>div:first-child{width:100%;text-align:center}
    .deskTool{flex-direction:column}
    .deskStat{flex-wrap:wrap;gap:5px;justify-content:center}
}
```

## 원본 JS 이벤트 핸들러

- `facList` → **change**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/controlHis.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/control-his.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
