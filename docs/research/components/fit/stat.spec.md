# FitStatPage Specification

## Overview
- **Route:** `/fit/stat`
- **Target file:** `src/app/(fit-app)/fit/stat/page.tsx`
- **원본:** https://fit.rfenms.com/stat.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/stat.html` · JS `docs/research/fit.rfenms.com/assets/js/stat.js`
- **`<title>`:** 통합관제
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/stat.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tom-select.complete.min, tui-date-picker, echarts.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <div class="widget firmData">
                <div class="listFilter">
                    <div class="selectIcon">
                        <i class="bi bi-justify-left"></i>
                        <select id="orderBy">
                            <option value="">정렬 보기</option>
                            <option value="firmNameDESC">업체명 내림차순</option>
                            <option value="firmNameASC">업체명 오름차순</option>
                            <option value="thisPowerDESC">실시간 전력 내림차순</option>
                            <option value="thisPowerASC">실시간 전력 오름차순</option>
                            <option value="frugalRatioDESC">절감률 내림차순</option>
                            <option value="frugalRatioASC">절감률 오름차순</option>
                            <option value="frugalMonthDESC">절감금액 내림차순</option>
                            <option value="frugalMonthASC">절감금액 오름차순</option>
                        </select>
                    </div>
                    <div class="listStatus">
                        <span class="statusIcon"></span> 제안
                        <span class="statusIcon good"></span> 정상
                        <span class="statusIcon emergency"></span> 통신불량
                        <span class="statusIcon warning"></span> 피크발생
                    </div>
                </div>
                <div class="listCover">
                    <div class="list">
                        <ul class="listHeader">
                            <li class="headerRow">
                                <div class="column"></div>
                                <div class="column firmName">업체명</div>
                                <div class="column">계약전력<br>(kW)</div>
                                <div class="column">실시간 전력<br>(kW)</div>
                                <div class="column">절감률<br>(%/월별)</div>
                                <div class="column">절감금액<br>(원/월별)</div>
                            </li>
                        </ul>
                        <ul class="listBody" id="firmList">
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                            <li class="dataRow">
                                <span></span>
                                <span class="firmName">-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                                <span>-</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="pagination" id="deskPages"></div>
            </div>
            <div class="rightsection">
                <div class="widget until">
                    <div class="title">참여 업체 수</div>
                    <div class="untilData">
                        <span class="label">
                            제안
                        </span>
                        <div>
                            <span class="value countNumber" id="preCount">-</span>
                            <span class="unit">개</span>
                        </div>
                    </div>
                    <div class="untilData">
                        <span class="label">
                            설치
                        </span>
                        <div>
                            <span class="value countNumber" id="frugalCount">-</span>
                            <span class="unit">개</span>
                        </div>
                    </div>
                    <div class="title">총 누적 절감 금액</div>
                    <div class="untilData">
                        <span class="label">
                            제안
                        </span>
                        <div>
                            <span class="value countNumber" id="preTotal">-</span>
                            <span class="unit">원</span>
                        </div>
                    </div>
                    <div class="untilData">
                        <span class="label">
                            설치
                        </span>
                        <div>
                            <span class="value countNumber" id="frugalTotal">-</span>
                            <span class="unit">원</span>
                        </div>
                    </div>
                    <hr>                    
                    <div class="upday">
                        <i class="bi bi-flag-fill"></i>
                        <span id="updateTime">-</span> 업데이트
                        <span>
                            [D+<span id="elapsedTime">0</span>, <span id="startDate">0000.00.00</span> ~ ]
                        </span>
                    </div>
                </div>
                <div class="widget ranking">
                    <div class="rankingTop">
                        <div class="title">절감금액 랭킹 TOP 5</div>
                        <div class="rankingFilter">
                            <input type="hidden" id="topStartDate" value="">
                            <input type="hidden" id="topEndDate" value="">
                            <select id="rankingFilter">
                                <option value="today">오늘</option>
                                <option value="week">이번주</option>
                                <option value="month">이번달</option>
                                <option value="year">올해</option>
                            </select>
                        </div>
                    </div>
                    <div class="rankingChart" id="rankingChart"></div>
                </div>
                <div class="widget csBox" >
                    <div class="title">알림</div>
                    <div class="cs" id="cs">
                    </div>
                </div>
            </div>
            <div class="map" id="map"></div>
            <div class="peakDetailWrap disable" id="peakDetailWrap">
                <div class="peakDetail">
                    <div class="kfeContent peakDetailData">
                        <div class="peakFirmNameHeader">
                            <div class="peakDetailFirmName" onclick="vio.changeFirm()"></div>
                            <div class="overlayCloseButton" onclick="vio.closeOverlay()" title="닫기"><i class="bi bi-x-lg"></i></div>
                        </div>
                        <div class="peakDetailHead">
                            <div class="peakDetailColumn"></div>
                            <div class="peakDetailColumn peakDetailToday">오늘</div>
                            <div class="peakDetailColumn peakDetailWeek">이번주</div>
                            <div class="peakDetailColumn peakDetailMonth">이번달</div>
                            <div class="peakDetailColumn peakDetailYear">올해</div>
                        </div>
                        <div class="peakDetailContent">
                            <div class="peakDetailRow">
                                <div class="peakDetailLabel">
                                    사용 전력<span class="peakDetailUnit">(kW)</span>
                                </div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                            </div>
                            <div class="peakDetailRow">
                                <div class="peakDetailLabel">
                                    절감률<span class="peakDetailUnit">(%)</span>
                                </div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                            </div>
                            <div class="peakDetailRow">
                                <div class="peakDetailLabel">
                                    절감금액<span class="peakDetailUnit">(만원)</span>
                                </div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                                <div class="peakDetailRowValue"></div>
                            </div>
                        </div>
                        <div class="peakDetailFirmInfo">
                            <div class="peakDetailInfoItem">
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemLabel">총 절감금액</div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemLabel">계약전력</div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemLabel">검침일</div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                            </div>
                            <div class="peakDetailInfoItem">
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemIcon">
                                        <svg>
                                            <use href="/assets/img/icons.svg#icon-person"></use>
                                        </svg>
                                    </div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemIcon">
                                        <svg>
                                            <use href="/assets/img/icons.svg#icon-contact"></use>
                                        </svg>
                                    </div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                                <div class="peakDetailItemWrap">
                                    <div class="peakDetailItemIcon">
                                        <svg>
                                            <use href="/assets/img/icons.svg#icon-address"></use>
                                        </svg>
                                    </div>
                                    <div class="peakDetailItemValue"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
html{font-size:15px}
select{border:none;outline:none;font-size:1rem;text-align:start}
option{background-color:#0e0d2c}

.contentsArea{height:100vh}
#contentsArea{display:flex;flex-direction:row;justify-content:space-between;height:calc(100% - 60px)}
.widget{padding:15px 20px;overflow:hidden;background:rgba( 3, 3, 5, 0.5 );box-shadow:0 8px 32px 0 rgba( 0,0,0, 0.25) inset;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border-radius:20px}

.firmData{display:flex;flex-direction:column;z-index:2;width:28vw;min-width:390px;height:calc(100vh - 60px - 2rem)}
.rightsection{display:flex;flex-direction:column;z-index:2;height:100%;overflow:hidden;gap:1vh}
.listFilter{display:flex;justify-content:space-between;align-items:center;padding:0 10px}
.selectIcon{display:flex;align-items:center}
.listCover{width:100%;height:calc(100% - 80px);overflow:hidden}
.list{height:100%;overflow-x:auto;border-radius:20px;background-color:rgba(3,3,5,0.3);backdrop-filter:blur(10px)}
.pagination{width:100%}
.until{display:flex;flex-direction:column;justify-content:space-between;align-items:center;width:18vw;min-width:250px;height:32vh;min-height:240px}
.ranking{width:18vw;min-width:250px;height:33vh}
.csBox{width:18vw;min-width:250px;height:calc(33vh - 60px - 2rem)}
.cs{display:flex;flex-direction:column;width:100%;height:calc(100% - 35px);margin-top:5px;overflow-y:scroll}
.cs::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.cs::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid rgb(184, 250, 255,0.5)}
.cs::-webkit-scrollbar-track{border-radius:2px}
.cs::-webkit-scrollbar-corner{background-color:transparent}
.title{width:100%;text-align:start;font-size:1.125rem;white-space:nowrap}
hr{width:100%;margin:0;border:0;border-top:1px solid rgba(238, 238, 238, 0.2)}

/* map */
.map{position:absolute;width:100%;height:100%;top:0;left:0;z-index:1}

/* 업체상세정보 */
.peakDetailWrap{position:absolute;top:-265px;right:-220px}
.peakDetail{z-index:2;padding:0.2rem 0.3rem;width:450px;background:rgb(0 0 0 / 80%);border-radius:10px}
.peakDetailData{position:relative;padding:0;font-size:11px}
.peakFirmNameHeader{display:flex;justify-content:space-between;align-items:center;padding:0.4rem 1rem 0 1rem}
.peakDetailFirmName{color:white;text-align:left;font-size:1.5rem;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}
.peakDetailHead{display:grid;grid-template-columns:20% 19% 19% 19% 19%;gap:1%;align-items:center;padding:0 1rem;height:10%}
.peakDetailColumn{border-radius:2px;text-align:center;font-size:1rem;color:#8fd0e9}
.peakDetailContent{margin:0 1rem;padding-bottom:0.3rem;height:75%;border-top:1px solid #dcdcdcb2}
.peakDetailRow{display:grid;grid-template-columns:20% 19% 19% 19% 19%;gap:1%;align-items:center;height:16.6666%}
.peakDetailRow:nth-child(odd){padding-top:3px}
.peakDetailRow:last-child{border-bottom:1px solid #dcdcdcb2}
.peakDetailLabel{color:#a4dcff;font-size:1rem}
.peakDetailUnit{color:#9fa0a0;font-size:0.7rem}
.peakDetailRowValue{text-align:center}
.peakDetailFirmInfo{display:flex;flex-direction:column;gap:0.2rem;justify-content:center;padding:0.5rem 1rem;height:20%;background-color:#00000026;border-radius:0 0 10px 10px}
.peakDetailInfoItem{display:flex;flex-direction:row;align-items:center;gap:0.6rem}
.peakDetailItemWrap{display:flex;flex-direction:row;align-items:center;gap:0.2rem;font-size:0.8rem;overflow:hidden}
.peakDetailItemLabel{overflow:hidden;padding:0.1rem 0.2rem;background-color:#4b4b4b;border-radius:4px;color:#fff;text-align:center;text-overflow:ellipsis;white-space:nowrap}
.peakDetailItemValue{color:#dcdcdc;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}
.peakDetailItemIcon svg{display:block;width:1rem;height:1rem}
.overlayCloseButton{cursor:pointer;font-size:1.1rem}


/* 리스트 필터 */
.listStatus{display:flex;gap:5px;align-items:center;height:50px;color:#c9c0ba;font-size:13px;white-space:nowrap}
.listStatus .statusIcon:first-child{margin-left:10px}

/* 리스트 */
.statusIcon{display:inline-block;width:10px;height:10px;margin-left:3px;border-radius:5px;background-color:#76ff03}
.good{background-color:#ffff81}
.warning{background-color:#ffa403}
.emergency{background-color:#ff0000}
/* .list table{display:none;table-layout:fixed;width:100%;border-collapse:collapse}
.list thead{background:#171d3b;border-top:1px solid #343b4f;border-bottom:1px solid #343b4f}
.list th{line-height:1;padding:5px;color:#aeb9e1;font-size:13px;font-weight:400;box-sizing:border-box}
.list td{padding:15px 5px;box-sizing:border-box;text-align:center} */
.list .headerRow{display:grid;grid-template-columns:8% 25% 14% 16% 16% 21%;justify-content:center;align-items:center;min-width:420px;height:80px;padding:0 10px;;line-height:1;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(10px);font-size:1rem;text-align:center;word-break:keep-all}
.list .headerRow .column{text-align:center}
.list .headerRow .column:nth-child(2){color:#b8faff}
.list .headerRow .column:nth-child(5){color:#00ffff}
.list .headerRow .column:last-child{color:#ffec7d}
.list .listBody{display:flex;flex-direction:column;justify-content:space-between;height:calc(100% - 84px)}
.list .dataRow{display:grid;grid-template-columns:8% 25% 14% 16% 16% 21%;justify-content:center;align-items:center;min-width:420px;padding:0 15px;line-height:1;border:1px solid transparent;font-size:1rem;text-align:center;cursor:pointer}
.list .dataRow.active{background-color:#26ccff33;border-top:1px solid #00d6ff;border-right:1px solid #00d6ff;border-bottom:1px solid #00d6ff;border-left:1px solid #00d6ff}
.list .dataRow > span{display:inline-block;padding:7px}
.list .dataRow span:nth-child(2){color:#b8faff}
.list .dataRow span:nth-child(5){color:#00ffff}
.list .dataRow span:last-child{color:#ffec7d}
.list .firmName{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
.list .column{padding:5px}
.firmList{cursor:pointer}
.firmList tr.active{background-color:#26ccff33;border-left:1px solid #00d6ff;border-right:1px solid #00d6ff}
.firmList tr.active td{border-top:1px solid #00d6ff;border-bottom:1px solid #00d6ff}
.pagination{display:flex;gap:20px;justify-content:center;font-size:0.875rem;color:rgb(238, 238, 238,0.4)}
.pagination .deskPage{cursor:pointer;color:#eee}
.pagination .active{font-weight:bold;text-decoration:underline;cursor:pointer;color:#eee}

/* 총 누적 */
.untilData{display:flex;justify-content:space-between;align-items:center;position:relative;width:100%}
.untilData .label{line-height:1.2;font-size:1rem;color:#b8faff}
.untilData .value{color:#ad44ff;font-size:1.25rem;font-weight:600}
.untilData:nth-child(3n) .value{color:#00ffff}
.untilDate{display:flex;gap:10px;justify-content:center;align-items:center;text-align:center}
.title:nth-child(2){padding-top:40px}
.upday{display:flex;justify-content:start;gap:5px;width:100%;padding-top: 2px;line-height: 1;font-size:0.875rem;word-break:keep-all;flex-wrap: wrap;}
#updateTime{white-space:nowrap;}
.timeStart{white-space:nowrap;;}

/* 절감금액 랭킹 TOP 5 */
.rankingTop{display:flex;justify-content:space-between;align-items:center}
.ranking .rankingChart{width:100%;height:calc(100% - 40px)}

/* 알람 */
.alarmCategory,
.alarmTitle{display:flex;justify-content:space-between;align-items:center;padding-bottom:5px}
.alarmTitle .title{font-size:0.875rem;font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.alarmItem{width:100%;color:#eee}
.alarmItem i{margin-left:30px}
.alarmItem .date{color:#c6c6c6;font-size:0.875rem}
.alarmCategory{color:#00ffff;word-break:keep-all}

@media screen and (max-width:1075px){
    html{font-size:14px}
    #contentsArea{flex-direction:column-reverse;gap:1rem;height:auto}
    .map{position:relative; height:calc(60vh - 60px - 1rem)}
    .firmData{width:100%;min-width:0}
    .rightsection{flex-direction:row;justify-content:space-between;height:auto}
    .until, .ranking, .csBox{width:calc(33.3vw - 2rem);height:380px}
    .upday{padding-top: 0px;}

}

@media screen and (max-width:810px){
    .rightsection{flex-direction:column}
    .until, .ranking, .csBox{width:100%;height:360px}
}
```

## 원본 JS 이벤트 핸들러

- `orderBy` → **change**
- `orderBy` → **keydown**
- `firmList` → **click**
- `rankingFilter` → **change**
- `rankingFilter` → **keydown**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/stat.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/stat.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
