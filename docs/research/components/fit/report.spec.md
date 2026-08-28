# FitReportPage Specification

## Overview
- **Route:** `/fit/report`
- **Target file:** `src/app/(fit-app)/fit/report/page.tsx`
- **원본:** https://fit.rfenms.com/report.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/report.html` · JS `docs/research/fit.rfenms.com/assets/js/report.js`
- **`<title>`:** 저압 절감 보고서
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/report.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tui-date-picker, xlsx.full.min, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <div class="lowBox lowTopChart">
                <div class="titleLabel">
                    <div class="topfivBox">
                        <h1 class="deskTitle">저압 절감 보고서</h1>
                        <div class="fiveHigh">
                            <div>
                                <img src="./assets/img/fiveup.svg">전력타입
                            </div>
                            <div class="fiveHighDate">
                                <span id="lastContract">-</span>
                            </div>
                        </div>
                        <div class="fiveHigh">
                            <div>
                                <img src="./assets/img/fiveup.svg">기본요금단가
                            </div>
                            <div class="fiveHighDate">
                                <span id="lastContractCost">-</span>
                            </div>
                        </div>
                        <div class="fiveHigh">
                            <div>
                                <img src="./assets/img/fiveup.svg">최근 5개년 피크
                            </div>
                            <div class="fiveHighDate">
                                <span id="maxAbleWatt">-</span>kw / <span id="maxAbleDate">-</span>년
                            </div>
                        </div>
                    </div>
                    <div class="reportLabel">
                        <div class="labelBox">
                            <div class="labelSign"></div><span>누적 절감 요금</span>
                        </div>
                        <div class="labelBox">
                            <div class="labelSign"></div><span>저압 전력 요금</span>
                        </div>
                        <div class="labelBox">
                            <div class="labelSign"></div><span>고압 전력 요금</span>
                        </div>
                    </div>
                </div>
                <div class="chart1" id="chart1"></div>
                <div class="lowMoney" id="lowMoney">
                    <div class="lowMonyBox">
                        <span><i class="bi bi-graph-down-arrow"></i> 평균 절감률</span>
                        <p class="frugalAvg" id="frugalAvg">
                            <span class="frugalRatio" id="frugalRatio">-</span>
                            <input type="text" class="frugalInput" id="edit-frugalRatio" value="">%
                        </p>
                    </div>
                    <div class="lowMonyBox">
                        <span>일간 평균 절감액</span>
                        <p><span class="lowDay" id="avgFrugalDaily">-</span>원</p>
                    </div>
                    <div class="lowMonyBox">
                        <span>월간 평균 절감액</span>
                        <p><span class="lowMon" id="avgFrugal">-</span>원</p>
                    </div>
                    <div class="lowMonyBox">
                        <span>연간 평균 절감액</span>
                        <p><span class="lowYear" id="avgFrugalYear">-</span>원</p>
                    </div>
                </div>
                <div class="tableBtnBox business">
                    <button class="exlBtn disable" id="print">
                        <i class="bi bi-printer-fill"></i>제안서 A
                    </button>
                    <button class="exlBtn disable" id="print2">
                        <i class="bi bi-printer-fill"></i>제안서 B
                        <span class="disable factoring">(팩토링 선취)</span>
                    </button>
                    <button class="exlBtn disable" id="truth">
                        <i class="bi bi-bag-check-fill"></i>사업 타당성 검토
                    </button>
                    <button class="exlBtn disable" id="print3">
                        <i class="bi bi-printer-fill"></i>제안서 C
                        <span class="disable factoring">(팩토링 후취)</span>
                    </button>
                    <button class="exlBtn disable" id="truth2">
                        <i class="bi bi-bag-check-fill"></i>사업 타당성 검토
                    </button>
                </div>
            </div>
            <div class="lowBox lowBtmTable">
                <div class="tableInfoBox">
                    <div class="tableDateBox">
                        <label for="lowDateStart">기간</label>
                        <div class="lowDateInput">
                            <div class="lowInputStart">
                                <input type="month" class="lowDate" id="lowDateStart" value="2024-12">
                                <div>&#126;</div>
                            </div>
                            <input type="month" class="lowDate" id="lowDateEnd" value="2024-12">
                        </div>
                    </div>
                    <div class="tableBtnBox">
                        <button class="searchBtn" id="search">
                            <i class="bi bi-search"></i>조회
                        </button>
                        <button class="exlBtn" id="excel">
                            <i class="bi bi-file-earmark-arrow-down-fill"></i>엑셀로 저장
                        </button>
                    </div>
                </div>
                <div class="tableBodyBox">
                    <table id="deskTable">
                        <thead>
                            <tr>
                                <th rowspan="2">날짜</th>
                                <th rowspan="2">요금적용전력&#40;kW&#41;</th>
                                <th rowspan="2">사용전력량&#40;kWh&#41;</th>
                                <th colspan="3">전력 요금 &#40;고압&#41;</th>
                                <th colspan="3">전력 요금 &#40;저압&#41;</th>
                                <th rowspan="2">절감액</th>
                            </tr>
                            <tr>
                                <th>기본요금</th>
                                <th>전력량요금+a</th>
                                <th>소계</th>
                                <th>기본요금</th>
                                <th>전력량요금+a</th>
                                <th>소계</th>
                            </tr>
                        </thead>
                        <tbody id="itemList">
                            <tr>
                                <td colspan="10">데이터가 없습니다.</td>
                            </tr>
                        </tbody>
                        <tfoot id="itemFooter"></tfoot>
                    </table>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.lowTopChart{display:flex;position:relative;justify-content: space-between;width:100%;height:calc(50vh - 110px)}
.titleLabel{display:flex;flex-direction:column;justify-content:space-between;width:fit-content;height:100%;padding:20px 10px 20px 20px}
.topfivBox{display:flex;flex-direction:column;gap:5px}
.deskTitle{margin-bottom: 10px;padding:0;white-space:nowrap}
.fiveHigh img{margin-right: 3px}
.fiveHigh div:first-child{display: flex;gap:5px;padding-left: 5px;color:#c8b9ff;font-size: 0.8rem}
.fiveHighDate{padding:5px 10px;border-radius: 10px;background-color: #030305;color:#00ffff;width:100%;white-space:nowrap;font-size: 0.8rem;text-align: center}
.reportLabel{margin-top:5px}
.reportLabel .labelBox{display:flex;align-items:center;padding:0 5px;font-size:.8rem;white-space:nowrap}
.reportLabel .labelSign{width:15px;height:8px;margin-right:15px;border-radius: 10px;background-color: #b8faff}
.reportLabel .labelBox:first-child>.labelSign{width:8px;height: 15px;margin:0 18px 0 4px;background-color:#ad44ff}
.reportLabel .labelBox:nth-child(2)>.labelSign{background-color:#ffec7d}
.chart1{width:100%;height:100%;min-height:30vh;padding:20px 10px}
.lowMoney{display:flex;flex-direction:column;justify-content:space-between;width:15%;min-width:fit-content;padding:20px 20px 20px 20px;background-color:rgba(3,3,5,0.4)}
.lowMonyBox{display:flex;flex-direction:column;justify-content:center;width:100%;height:calc(( 50vh - 160px ) / 4);padding:10px;border-radius:10px;background-color:transparent;color:#b8faff;text-align:center;font-size:1rem;word-break:keep-all}
.lowMonyBox:hover{background-color:rgba(6,65,255,0.1);color:#00ffff}
.lowMonyBox:hover>p{color:#fdf800}
.lowMonyBox:last-child:hover>p{color:#ff7300}
.lowMonyBox:first-child{background-color:#b8faff;color:#0041ff;font-weight:bold}
.lowMonyBox:first-child i{font-weight:bold}
.lowMonyBox:first-child>p{color:#0041ff}
.lowMonyBox>p{margin:0;color:#ffec7d}
.lowMonyBox:last-child>p{color:#ff8600}
.lowMonyBox input[type="text"]{padding:0;background:none;border:none;color:#0041ff}
.frugalAvg{display:flex;justify-content:center;align-items:center}
.frugalInput{display:none;width:50px}
.editMode .frugalRatio{display:none}
.editMode .frugalInput{display:inline}
/* lobBtmTable */
.lowBtmTable{margin: 20px 0 10px}
.tableInfoBox{display:flex;flex-direction:row;gap:15px;width:100%;height:auto;margin-bottom:0;padding:15px 20px;background-color:rgba(0,0,29,0.6)}
.tableDateBox{display:flex;align-items:center;flex-direction:row;gap:15px;width:100%;white-space:nowrap}
.tableDateBox label{display:flex;align-items:center;width:auto;height:100%;font-size:1rem;color:#b8faff}
.tableDateBox .lowDateInput{display:flex;align-items:center;gap:15px;width:199%}
.tableDateBox .lowInputStart{display:flex;align-items:center;gap:15px;width:100%}
.tableDateBox .lowDate{overflow:hidden;width: 100%;min-width:170px;height: 40px;padding:0 15px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540;color:#eee;text-align:center;font-size:1rem;accent-color:white;color-scheme:dark}
.tableDateBox .lowDate:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.tableBtnBox{display:flex;flex-direction:row;gap:15px;white-space:nowrap}
.tableBtnBox.business{flex-direction:column;justify-content:center;padding:1rem}
.tableBtnBox button{width:auto;height:40px;padding: 5px 10px;border:1px solid #0041ff;background-color:#0041ff;color:#b8faff;font-size:1rem;font-weight:400;}
.tableBtnBox button i{margin-right: 10px}
.tableBtnBox.business button:nth-child(2),
.tableBtnBox.business button:nth-child(4){margin-top:.7rem}
.tableBtnBox .exlBtn{border:1px solid #00ffff;background-color:transparent;color:#00ffff}
.tableBtnBox button:hover{border:1px solid #b8faff;background-color:#3654eb;color:#eee}
.tableBodyBox{overflow:auto;height:calc(50vh - 100px);padding:0 10px}
.tableBodyBox::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.tableBodyBox::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid #b8faff}
.tableBodyBox::-webkit-scrollbar-track{border-radius:2px}
.tableBodyBox::-webkit-scrollbar-corner{background-color:transparent}
.tableBodyBox table{width:100%;min-width:900px;;height:auto;margin:0;border-top:3px solid rgba(238,238,238,0.2);border-bottom:3px solid rgba(255,255,255,0.1);text-align: center}
.tableBodyBox th{font-weight:400}
.tableBodyBox thead{position:sticky;top:0;z-index:2;background-color:rgba(0,0,29,0.6);backdrop-filter: blur(10px)}
.tableBodyBox thead th{height:40px;border-right:1px solid rgba(238,238,238,0.2);border-bottom:3px solid rgba(238,238,238,0.2)}
.tableBodyBox thead th:nth-child(3n){border-right:3px solid rgba(238,238,238,0.2);color:#b8faff}
.tableBodyBox thead th:last-child{color:#b8faff}
.tableBodyBox thead tr:first-child th{border-right:3px solid rgba(238,238,238,0.2)}
.tableBodyBox thead tr:first-child th:last-child{border-right:0;color:#ffec7d}
.tableBodyBox tbody tr{border-top:1px solid rgba(238,238,238,0.2)}
.tableBodyBox tbody tr:hover{background-color:rgba(217,217,217,.2);color:#b8faff}
.tableBodyBox tbody tr:hover td:nth-child(3n){color:#00ffff}
.tableBodyBox tbody tr:hover td:nth-child(10){color:#fdf800}
.tableBodyBox tbody td{position:relative;z-index:1;height:40px;border-right:1px solid rgba(238,238,238,0.2);white-space:nowrap}
.tableBodyBox tbody td.yyyymm{padding:0 1rem}
.tableBodyBox tbody td.change:before{content:'\21BB';position:absolute;left:0;color:#fff1ae}
.tableBodyBox tbody td.low:before{content:'\25CF';position:absolute;left:0;color:#ffec7d}
.tableBodyBox tbody td:nth-child(3n){border-right:3px solid rgba(238,238,238,0.2);color:#b8faff}
.tableBodyBox tbody td:nth-child(10){color:#ffec7d}
.tableBodyBox tbody td:last-child{border-right:0}
.tableBodyBox tfoot tr{border-top:3px solid rgba(238,238,238,0.2)}
.tableBodyBox tfoot tr:not(:first-child) th{border-right:3px solid rgba(238,238,238,0.3)}
.tableBodyBox tfoot td{height:40px;border-right:1px solid rgba(238,238,238,0.2);white-space:nowrap}
.tableBodyBox tfoot td:last-child{border-right:0}
.tableBodyBox tfoot .totalSum{background-color:rgba(255,255,255,0.1)}
.tableBodyBox tfoot .totalSum th{border-right:1px solid rgba(238,238,238,0.2)}
.tableBodyBox tfoot .totalSum td:nth-child(3n){border-right:3px solid rgba(238,238,238,0.2);color:#b8faff}
.tableBodyBox tfoot .totalSum td:nth-child(10){color:#ffec7d}
.tableBodyBox tfoot .totalYear{background-color:rgba(5,94,195,0.3);color:#00ffff}
.tableBodyBox tfoot .totalMonth{background-color:rgba(0,62,92,0.3);color:#ffed7d}

@media (max-width:800px){
    .lowTopChart{flex-direction:column;height:auto}
    .titleLabel{width:100%}
    .reportLabel{display:flex;justify-content:end;width:100%}
    .reportLabel .labelSign{margin:10px}
    .reportLabel .labelBox:first-child>.labelSign{margin:0 10px 0 0}
    .lowMoney{flex-direction:row;width:100%}
    .tableInfoBox{flex-direction:column}
    .tableBtnBox button{width:100%}
    .fiveHigh{display: flex;flex-direction: row;align-items: center;justify-content: end}
    .fiveHigh div:first-child{width:fit-content}
    .fiveHigh img{width:fit-content}
    .fiveHighDate{width:fit-content}
}
@media (max-width:530px){
    .reportLabel{flex-wrap:wrap}
    .lowMoney{flex-wrap:wrap}
    .lowMonyBox{width:50%;min-width:150px;height:auto;padding:10px}
    .lowDateInput{flex-wrap:wrap}
    .chart1{height:30vh}
}
@media (max-width:380px){
    .lowMonyBox{min-width:auto;padding:15px 0}
}
```

## 원본 JS 이벤트 핸들러

- `lowDateStart` → **change**
- `lowDateEnd` → **change**
- `lowDateStart` → **click**
- `excel` → **click**
- `print` → **click**
- `print2` → **click**
- `print3` → **click**
- `truth` → **click**
- `truth2` → **click**
- `frugalAvg` → **click**
- `edit-frugalRatio` → **keyup**
- `edit-frugalRatio` → **blur**
- `frugalAvg` → **DOMContentLoaded**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/report.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/report.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
