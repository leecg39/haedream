# FitPeakUsagePage Specification

## Overview
- **Route:** `/fit/peak-usage`
- **Target file:** `src/app/(fit-app)/fit/peak-usage/page.tsx`
- **원본:** https://fit.rfenms.com/peakUsage.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/peakUsage.html` · JS `docs/research/fit.rfenms.com/assets/js/peakUsage.js`
- **`<title>`:** 피크 15분 전력보고서
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/peakUsage.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: xlsx.full.min, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle" data-lang="report004">피크 15분 전력보고서</h1>
            <div class="chart1" id="chart1"></div>
            <div class="deskTool">
                <span class="deskLabel" data-lang="report014">날짜</span>
                <div class="datePicker">
                    <div class="tui-datepicker-input tui-datetime-input tui-has-focus">
                        <input type="text" class="inputDate" id="inputMonth" aria-label="Date-Time" readonly>
                        <i class="bi bi-calendar"></i>
                    </div>
                    <div id="wrapper"></div>
                </div>
                <span class="act actIcon" id="act">
                    <i class="bi bi-search"></i>
                    <span data-lang="report012">조회</span>
                </span>
                <span class="act actIcon" id="actExcelSave">
                    <i class="bi bi-file-earmark-excel-fill excel"></i>
                    <span data-lang="report013">엑셀로 저장</span>
                </span>
            </div>
            <div class="sheetArea">
                <table class="sheet" id="itemTable">
                    <thead class="sticky">
                        <tr>
                            <th rowspan="2" data-lang="report014">일자</th>
                            <th rowspan="2" data-lang="report020">분단위</th>
                            <th colspan="24" data-lang="report021">최대수요 ( <span class="sheetEm">kW</span> )</th>
                        </tr>
                        <tr>
                            <th>0</th>
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
                        </tr>
                    </thead>
                    <tbody id="itemList">
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
                        </tr>
                    </tbody>
                </table>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.lowBox{margin-bottom:15px}
.deskTool{display:flex;align-items:center;justify-content:space-between;flex-direction:row;gap:10px;padding:15px 20px;background:linear-gradient(rgba(0, 0, 29, 0.6), rgba(0, 0, 29, 0.6)), rgba(3, 3, 5, 0.4);border-radius:20px 20px 0 0;text-align:center}
.deskLabel{color:#b8faff;white-space:nowrap}
.chart1{width:100%;height:calc(60vh - 180px);margin:0 0 15px 0;overflow:hidden;background-color:rgba(3, 3, 5, 0.4);border:2px solid rgba(0, 0, 0, 0.1);border-radius:20px;box-shadow:rgba(0, 0, 0, 0.15) 0 0 120px inset}
.pickerBox{display:flex;align-items:center;gap:15px;width:100%}
.datePicker{overflow:hidden;width:100%;min-width:170px;height:40px;padding:0 15px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540}
.datePicker:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.tui-datepicker-input{border:0}
.inputDate{text-align:center}
.lgtB{border:1px solid #00ffff;background-color:#030305;color:#00ffff}
.sheetArea{overflow:auto;height:auto;max-height:calc(40vh - 70px);padding:0 20px 20px;border-radius:0 0 20px 20px}
.sheetArea::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.sheetArea::-webkit-scrollbar-thumb{border-radius:2px;border:1px solid #b8faff;background:rgba(0,255,255,0.5)}
.sheetArea::-webkit-scrollbar-track{border-radius:2px}
.sheetArea::-webkit-scrollbar-corner{background-color:transparent}
.sheet{clear:both;width:100%;height:100%;border-top:2px solid rgba(238,238,238,0.3);border-collapse:separate;border-spacing:0;text-align:center}
.sheet thead.sticky{position:sticky;top:0;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(10px)}
.sheet thead th{border-bottom:2px solid rgba(238,238,238,0.3)}
.sheet th{padding:.6rem .2rem;border-bottom:1px solid rgba(238,238,238,0.2);border-left:1px solid rgba(238,238,238,0.2);color:#00ffff;font-size:0.98rem;font-weight:400;white-space:nowrap}
.sheet tr:first-child th:nth-child(1){border-left:0}
.sheet td{padding:.6rem .2rem;border-bottom:1px solid rgba(238,238,238,0.2);color:#eee;font-size:0.98rem}
.stick tr:first-child th:last-child{color:#00ffff}
#itemList tr{border-bottom:1px solid rgba(238,238,238,0.3)}
#itemList tr:last-child{border-bottom:3px solid rgba(238,238,238,0.3)}
#itemList tr th:nth-child(1){border-left:0;color:#00ffff}
#itemList tr td:nth-child(2){color:#b8faff;}
.sheet tr:hover td{background-color:rgba(217,217,217,.2);color:#fff}
.sheet tr:hover .tLabel{background-color:rgba(217,217,217,.2);color:#fff}
.sheetEm{color:inherit;font-style:italic}
.sheetSub{color:inherit;font-size:.74rem;font-style:italic}
.sheetSticky{position:sticky;top:0}

.inputMonth{height:40px;padding:.4rem;border:1px solid #5190a5;border-radius:4px;background-color:transparent;font-size:1rem}
.inputMonth::-webkit-calendar-picker-indicator{filter:invert(.8)}

.sheet .sheetAct{color:#ff005b}
.sheet .sheetAct:hover{background-color:#ff005b;color:#fff;cursor:pointer}

.sheet tr:hover .wattMax{background-color:#ff005b;color:#030305}
.sheet .wattMax{background-color:rgba(140,140,140,0.2);color:#ff005b}

.underline{text-decoration:underline;text-decoration-color:green}

@media (max-width:1470px){
    .chart1{padding:15px}
}

@media (max-width:768px){
    .sheetArea{overflow:auto;width:100%}
    .inputMonth{padding:.2rem .4rem;font-size:1rem}
    .inputDate{text-align:start}
}
@media (max-width:586px){
    .chart1{min-height:30vh ;height:calc(50vh - 190px)}
    .sheetArea{max-height:calc(50vh - 190px)}
    .sheetArea .sheet{min-width:1100px}
    .deskTool{flex-wrap:wrap}
    .datePicker{padding:0;margin-left:0}
    .datePicker i{right:15px}
    .tui-datepicker-input > input{padding:15px}
    .deskLabel{width:15%}
    .datePicker{width:calc(85% - 15px)}
}
```

## 원본 JS 이벤트 핸들러

- `act` → **click**
- `actExcelSave` → **click**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/peakUsage.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/peak-usage.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
