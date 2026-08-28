# FitPowerUsagePage Specification

## Overview
- **Route:** `/fit/power-usage`
- **Target file:** `src/app/(fit-app)/fit/power-usage/page.tsx`
- **원본:** https://fit.rfenms.com/powerUsage.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/powerUsage.html` · JS `docs/research/fit.rfenms.com/assets/js/powerUsage.js`
- **`<title>`:** 전력 사용 보고서
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/powerUsage.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: xlsx.full.min, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle" data-lang="report005">전력 사용 보고서</h1>
            <div class="deskTool">
                <span class="deskLabel">구분</span>
                <select class="selectbox" id="dataType">
                    <option value="hours">일별</option>
                    <option value="days">월별</option>
                    <option value="months">연도별</option>
                </select>
                <div class="datePickerWrap" id="datePickerWrap">
                    <span class="deskLabel" data-lang="report014">날짜</span>
                    <div class="datePicker">
                        <div class="tui-datepicker-input tui-datetime-input tui-has-focus">
                            <input type="text" class="inputDate" id="inputMonth" aria-label="Date-Time" readonly>
                            <i class="bi bi-calendar"></i>
                        </div>
                        <div id="wrapper"></div>
                    </div>
                </div>
                <span class="act actIcon" id="act">
                    <i class="bi bi-search"></i>
                    <span data-lang="report012">조회</span>
                </span>
                <span class="act actIcon" id="actExcelSave">
                    <i class="bi bi-file-earmark-excel-fill excel"></i>
                    <span data-lang="report013">엑셀로 저장</span>
                </span>
                <span class="boardInfo disable" id="boardInfoPanel">
                    <span class="boardInfoLabel">최대전력</span>
                    <span id="boardInfoPower"></span>
                    <span class="boardInfoUnit">kWh</span>
                    <span class="boardInfoSlash">/</span>
                    <span class="boardInfoPowerDate" id="boardInfoPowerDate"></span>
                    <span class="boardInfoLabel">최대피크</span>
                    <span id="boardInfoPeak"></span>
                    <span class="boardInfoUnit">kW</span>
                    <span class="boardInfoSlash">/</span>
                    <span id="boardInfoPeakDate"></span>
                </span>
            </div>
            <div class="sheetArea">
                <table class="sheet" id="hoursTable">
                    <thead>
                        <tr>
                            <th rowspan="2" data-lang="report014">일자</th>
                            <th rowspan="2" data-lang="report050">전체<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th rowspan="2" data-lang="report051">평균<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th rowspan="2" data-lang="report052">최대<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th rowspan="2" data-lang="report052">최대<br>사용시간</th>
                            <th rowspan="2" data-lang="report054">피크<br>전력<br>(<span class="sheetEm">kW</span>)</th>
                            <th rowspan="2" data-lang="report054">피크<br>시간</th>
                            <th colspan="24" data-lang="report053">시간별 전력 사용량<br>(<span class="sheetEm">kWh</span>)</th>
                        </tr>
                        <tr>
                            <th>1</th>
                            <th>2</th>
                            <th>3</th>
                            <th>4</th>
                            <th>5</th>
                            <th>6</th>
                            <th>7</th>
                            <th>8</th>
                            <th>9</th>
                            <th>10</th>
                            <th>11</th>
                            <th>12</th>
                            <th>13</th>
                            <th>14</th>
                            <th>15</th>
                            <th>16</th>
                            <th>17</th>
                            <th>18</th>
                            <th>19</th>
                            <th>20</th>
                            <th>21</th>
                            <th>22</th>
                            <th>23</th>
                            <th>24</th>
                        </tr>
                    </thead>
                    <tbody id="hoursList">
                        <tr>
                            <th>-</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
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
                <table class="sheet disable" id="daysTable">
                    <thead>
                        <tr>
                            <th rowspan="2"></th>
                            <th colspan="12">전력 사용량 (<span class="sheetEm">kWh</span>)</th>
                        </tr>
                        <tr>
                            <th>1월</th>
                            <th>2월</th>
                            <th>3월</th>
                            <th>4월</th>
                            <th>5월</th>
                            <th>6월</th>
                            <th>7월</th>
                            <th>8월</th>
                            <th>9월</th>
                            <th>10월</th>
                            <th>11월</th>
                            <th>12월</th>
                        </tr>
                    </thead>
                    <tbody id="daysList">
                        <tr>
                            <th>전체 전력량 (<span class="sheetEm">kWh</span>)</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <th>평균 전력량 (<span class="sheetEm">kWh</span>)</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <th>최대 전력량 (<span class="sheetEm">kWh</span>)</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <tr>
                            <th>1일</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
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
                <table class="sheet disable" id="monthsTable">
                    <thead>
                        <tr>
                            <th rowspan="2">연도</th>
                            <th rowspan="2">전체<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th rowspan="2">평균<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th rowspan="2">최대<br>전력량<br>(<span class="sheetEm">kWh</span>)</th>
                            <th colspan="31">월별 전력 사용량 (<span class="sheetEm">kWh</span>)</th>
                        </tr>
                        <tr>
                            <th>1월</th>
                            <th>2월</th>
                            <th>3월</th>
                            <th>4월</th>
                            <th>5월</th>
                            <th>6월</th>
                            <th>7월</th>
                            <th>8월</th>
                            <th>9월</th>
                            <th>10월</th>
                            <th>11월</th>
                            <th>12월</th>
                        </tr>
                    </thead>
                    <tbody id="monthsList">
                        <tr>
                            <th>-</th>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
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
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
html#powerUsagePage,html#powerUsagePage body{width:100%;height:100%;overflow:hidden}
#dashboard .contentsArea{min-width:0;height:100vh;overflow:hidden}
#dashboard main.contents{display:flex;flex-direction:column;min-width:0;min-height:0;height:calc(100vh - 80px);overflow:hidden}
.deskTool{display:flex;align-items:center;gap:15px;padding:15px 20px;background:linear-gradient(rgba(0, 0, 29, 0.6), rgba(0, 0, 29, 0.6)), rgba(3, 3, 5, 0.4);border-radius:20px 20px 0 0;text-align:center}
.deskTollLeft{display:flex;width:100%;gap:15px}
.deskLabel{color:#b8faff;white-space:nowrap}
.selectBoxDay{display:flex;align-items:center;width:100%}
.datePickerWrap{display:flex;align-items:center}
.datePickerWrap .datePicker{overflow:hidden;min-width:110px;height:40px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540;margin-left:15px;padding:0 15px}
.datePickerWrap .datePicker:hover, .selectboxWrap:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.datePickerWrap .inputMonth{height:40px;padding:.4rem;border:1px solid #5190a5;border-radius:4px;background-color:transparent;font-size:1rem}
.datePickerWrap .inputMonth::-webkit-calendar-picker-indicator{filter:invert(.8)}
.selectbox{overflow:hidden;min-width:110px;height:40px;padding:0 15px;background-color:#2c3540;border:1px solid #2c3540;border-radius:10px;font-size:1rem}
.tui-datepicker-input {border:0}
.selectbox option{background-color:#000}

.lgtB{border:1px solid #00ffff;background-color:#030305;color:#00ffff}
.boardInfo{justify-content:center;gap:15px;width:100%}
.boardInfo span:nth-child(2),
.boardInfo span:nth-child(3),
.boardInfo span:nth-child(7),
.boardInfo span:nth-child(8){color:#00ffff}
.boardInfoPowerDate{margin-right:15px}
.boardInfoLabelbox{display:flex;flex-direction:row;flex-wrap:nowrap;gap:5px;color:#00ffff}
.boardInfoLabel{color:#b8faff;white-space:nowrap}
.boardInfoSlash{color:#eee}
.boardInfoLabelbox>span:last-child{color:#eee;white-space:nowrap}

.sheetArea{overflow:auto;flex:1 1 auto;min-width:0;min-height:0;width:100%;max-width:100%;height:auto;max-height:none;margin:0;padding:0 0 10px 10px;border-radius:0 0 20px 20px}
.sheetArea::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.sheetArea::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid #b8faff}
.sheetArea::-webkit-scrollbar-track{border-radius:2px}
.sheetArea::-webkit-scrollbar-corner{background-color:transparent}
.sheet{clear:both;width:100%;margin:0;border-collapse:separate;border-spacing:0;text-align:center}
.sheet thead{position:sticky;top:0;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(10px)}
tbody{padding-top:60px}
thead tr:first-child{border-top:3px solid rgba(238,238,238,0.3)}
thead tr:first-child th:not(:nth-child(8)){border-bottom:1px solid rgba(238,238,238,0.3)}
thead tr:last-child {border-bottom:2px solid rgba(238,238,238,0.3)}
thead tr:last-child>th{table-layout:fixed;color:#b8faff}
tbody tr:last-child{border-bottom:2px solid rgba(238,238,238,0.3)}
.sheet th{padding:.5rem 5px;border:1px solid rgba(238,238,238,0.2);background-color:transparent;color:#00ffff;font-size:0.98rem;font-weight:400;white-space:nowrap}
.sheet td{padding:.5rem 5px;border-bottom:1px solid rgba(238,238,238,0.2);border-right:1px solid rgba(238,238,238,0.2);color:#eee;font-size:0.98rem}
.sheet tr:hover td{background-color:rgba(217,217,217,.2);color:#fff}
.sheetEm{color:inherit;font-style:italic}
.sheetSub{color:inherit;font-size:.74rem;font-style:italic}
.sheet tbody.liketh tr td:nth-child(2),
.sheet tbody.liketh tr td:nth-child(3),
.sheet tbody.liketh tr td:nth-child(4),
.sheet tbody.liketh tr td:nth-child(5){background-color:rgba(11,11,20,.9)}

.sheet tr:hover .wattMax{background-color:#ff005b;color:#030305}
.sheet .wattMax{background-color:rgba(140,140,140,0.2);;color:#ff005b}

@media (max-width:1470px){
    .deskTool{flex-direction:row;flex-wrap:wrap}
}

@media (max-width:768px){
    .sheetScroll{width:100%}
    .sheetScroll .sheet{min-width:1400px;margin:0}
    .deskTool{display:flex;flex-direction:row;gap:15px}
    .deskTollLeft{flex-wrap:wrap;gap:10px}
    .sheetArea{max-height:calc(100vh - 360px);margin:1rem 0}
    .inputMonth{width:100%;padding:.2rem .4rem;font-size:1rem}
    .deskLabel{width:60px}
    .datePickerWrap{flex-basis:100%}
    .selectbox,
    .datePicker{flex-basis:calc(100% - 75px)}
    .boardInfo{flex-wrap:wrap;gap:15px}
}
@media (max-width:600px){
    .boardInfo{flex-wrap:wrap;gap:5px}
}
@media (max-width:400px){
    .boardInfo{flex-wrap:wrap;gap:5px}
    .sheetArea{max-height:calc(100vh - 390px)}
}
```

## 원본 JS 이벤트 핸들러

- `dataType` → **change**
- `act` → **click**
- `actExcelSave` → **click**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/powerUsage.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/power-usage.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
