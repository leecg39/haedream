# FitPeakPage Specification

## Overview
- **Route:** `/fit/peak`
- **Target file:** `src/app/(fit-app)/fit/peak/page.tsx`
- **원본:** https://fit.rfenms.com/peak.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/peak.html` · JS `docs/research/fit.rfenms.com/assets/js/peak.js`
- **`<title>`:** 피크상태
- **`<main>` className:** `peakGrid contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/peak.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tui-date-picker, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, echarts.min, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <div class="topInfo">
                <h1 class="title">피크상태</h1>
                <div class="topInfoRt">
                    <div class="day">
                        검침일&nbsp;
                        <span class="blue" id="meterDate">-일</span>
                    </div>
                    <div class="dayCk">
                        <label>
                            <span>검침일 기준 적용</span>
                            <input type="checkbox" id="isMeterDate" role="switch" checked>
                        </label>
                    </div>
                    <div>
                        데이터정확도
                        <span class="blue" id="dataVerifyRate">-%</span>
                    </div>
                    <div class="dayCk">
                        <label>
                            <span>알림</span>
                            <input role="switch" type="checkbox" id="peakMediaAlarm">
                        </label>
                    </div>
                </div>
            </div>
            <div class="peakArea lowBox" id="peakBase">
                <div class="peakControlBar">
                    <div>
                        <i class="bi bi-exclamation-diamond"></i>
                        현재 부하 <span>0</span> 개
                    </div>
                    <div class="controlBar controlEnd">
                        <i class="bi bi-check-lg"></i> 부하 제어 완료
                    </div>
                    <div class="controlBar controlWait">
                        <i class="bi bi-three-dots"></i> 부하 제어 대기
                    </div>
                    <div class="controlBar controlIng">
                        <i class="bi bi-wrench-adjustable"></i> 부하 제어 중
                    </div>
                </div>
                <div class="peakContents">
                    <div class="nodePowerChart" id="chartPeak"></div>
                    <div class="nodeInfo">
                        <div class="peakTimeArea">
                            <div class="decotitle">실시간 피크 상태</div>
                            <div class="peakWattLimit">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208.99 104">
                                    <defs>
                                        <linearGradient id="linear-gradient" y1="52" x2="208.99" y2="52" gradientUnits="userSpaceOnUse">
                                            <stop offset="0" stop-color="#0041ff"/>
                                            <stop offset="0.49" stop-color="#eda024"/>
                                            <stop offset="1" stop-color="#ff005b"/>
                                        </linearGradient>
                                    </defs>
                                    <g id="Layer_2" data-name="Layer 2">
                                        <g id="Layer_1-2" data-name="Layer 1">
                                            <path class="cls-1" d="M23,104a81.49,81.49,0,0,1,163,0h23A104.5,104.5,0,0,0,0,104Z" fill="url(#linear-gradient)"/>
                                        </g>
                                    </g>
                                </svg>
                                <svg xmlns="http://www.w3.org/2000/svg" class="needle realTimePeakGauge" id="realTimePeakGauge" viewBox="0 0 42.01 104">
                                    <path id="needle-path" d="M24,72.36,21.89,1.24c-.23-1.65-1.55-1.65-1.78,0L18,72.36a10,10,0,1,0,6,0Z"></path>
                                </svg>
                                <div class="needlePer">
                                    <span class="realTimePeakRatio" id="realTimePeakRatio">0</span><sub>%</sub>
                                </div>
                            </div>
                            <div class="peakStatusArea" id="peakStatusArea">
                                <div class="statCheap">
                                    <span class="statClip blue" data-alt="안정"></span>
                                </div>
                                <hr>
                                <div class="statCheap">
                                    <span class="statClip" data-alt="근접"></span>
                                </div>
                                <hr>
                                <div class="statCheap">
                                    <span class="statClip" data-alt="초과"></span>
                                </div>
                            </div>
                            <div class="peakTimeLimit">
                                <div class="peakMeterLine">
                                    <span class="peakMeter"></span>
                                    <span class="peakMeterOn" id="peakMeterOn"></span>
                                </div>
                            </div>
                            <div class="peakTimeInfo">
                                <div class="peakTimeDigit">
                                    <span id="peakTimeDigit">00:00 /</span>
                                    <span>15:00</span>
                                </div>
                                <div class="peakTimeWatch">
                                    <span class="peakTimeInfoLabel">계기시간</span>
                                    <span id="peakAbleTime">00:00:00</span>
                                </div>
                                <span class="peakTimeDiffArea">
                                    <span class="peakTimeText">시간차</span>
                                    <span class="peakTimeText" id="peakTimeDiff">0</span>
                                    <span>초</span>
                                </span>
                            </div>
                        </div>
                        <div class="peakPointArea" id="peakPointArea">
                            <div class="peakPointBoxA pointBox">
                                <span class="peakPointLabel peakPointA">예측 전력</span>
                                <span class="peakPoint peakPointA">0</span>
                                <div class="decoDot"></div>
                            </div>
                            <div class="peakPointBoxB pointBox">
                                <span class="peakPointLabel peakPointB">목표 전력</span>
                                <span class="peakPoint peakPointB">0</span>
                                <div class="decoDot"></div>
                            </div>
                            <div class="peakPointBoxC pointBox">
                                <span class="peakPointLabel peakPointC">현재 전력</span>
                                <span class="peakPoint peakPointC">0</span>
                                <div class="decoDot"></div>
                            </div>
                            <div class="peakPointBoxD pointBox">
                                <span class="peakPointLabel peakPointD">기준 전력</span>
                                <span class="peakPoint peakPointD">0</span>
                                <div class="decoDot"></div>
                            </div>
                            <!-- <div class="peakPointBoxE">
                                <span class="peakPointLabel peakPointE disable">순간 전력</span>
                                <span class="peakPoint peakPointE disable">0</span>
                                <div class="decoDot"></div>
                            </div> -->
                        </div>
                    </div>
                </div>
            </div>
            <div class="liveUseArea lowBox">
                <h2>실시간 전력 사용 추이</h2>
                <div class="peakSort">
                    <h3>피크 현황</h3>
                    <ul>
                        <li>
                            <span>계약전력</span>
                            <p class="peakContract"><span id="peakContract">-</span> kW</p>
                        </li>
                        <li>
                            <span>100% 초과</span>
                            <p class="peakOver"><span id="peakOver">-</span> 회</p>
                        </li>
                        <li>
                            <span>90 ~ 100%</span>
                            <p class="peakNine"><span id="peakNine">-</span> 회</p>
                        </li>
                        <li>
                            <span>80 ~ 90%</span>
                            <p class="peakEight"><span id="peakEight">-</span> 회</p>
                        </li>
                    </ul>
                </div>
                <div class="liveUseContent">
                    <div class="liveUseChart">
                        <div class="useChartData active">
                            <div id="wattChart"></div>
                        </div>
                    </div>
                    <div class="liveUseTag">
                        <div class="liveUseLabel">
                            <div class="useSign">
                                <span>전력 사용량</span>
                                <div class="UseLabelBox">
                                    <div class="UseLabelSign"></div><span>최대부하</span>
                                </div>
                                <div class="UseLabelBox">
                                    <div class="UseLabelSign"></div><span>중부하</span>
                                </div>
                                <div class="UseLabelBox">
                                    <div class="UseLabelSign"></div><span>경부하</span>
                                </div>
                            </div>
                            <div class="billSign">
                                <span>전력 요금</span>
                                <div class="UseLabelBox">
                                    <div class="UseLabelSign"></div><span>산업용(을)고압</span>
                                </div>
                                <div class="UseLabelBox">
                                    <div class="UseLabelSign"></div><span>산업용(갑)저압</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="peakRight" id="results">
                <div class="goal lowBox">
                    <h2>목표 절감액 달성 현황</h2>
                    <ul class="goalAccordion" id="goalEffect">
                        <li class="item" data-type="hour">
                            <div class="mainItemBox">
                                <div class="goalMeterLine">
                                    <span class="goalMeter"></span>
                                    <span class="goalMeterOn"></span>
                                </div>
                                <svg class="goalCircle">
                                    <circle cx="40" cy="40" r="30" fill="transparent" stroke-width="13"/>
                                    <circle cx="40" cy="40" r="30" class="circleFront" stroke-dasharray="188.495" stroke-dashoffset="188.495"/>
                                    <text x="40" y="40" dominant-baseline="middle" text-anchor="middle" class="goalCircleText">0%</text>
                                </svg>
                                <div class="golaCirdleBg"></div>
                                <div class="goalBarTop">
                                    <b>1시간</b>
                                    <p>
                                        <span class="hourFrugal">0</span>원
                                    </p>
                                </div>
                                <div class="goalBarBtm">
                                    <b>목표 절감액 :</b>
                                    <p>
                                        <span class="hourFrugalGoal">0</span>원
                                    </p>
                                </div>
                            </div>
                            <div class="subTextBox">
                                <div>
                                    <b>사용전력</b>
                                    <p>
                                        <span class="hourWatt">0</span>kw
                                    </p>
                                </div>
                                <div>
                                    <b>저압 전력 요금</b>
                                    <p>
                                        <span class="hourLowBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>고압 전력 요금</b>
                                    <p>
                                        <span class="hourHighBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>저압 요금 절감률</b>
                                    <p>
                                        <i class="bi bi-caret-up-fill" aria-hidden="true"></i>
                                        <span class="hourRatio">0</span>%
                                    </p>
                                </div>
                            </div>
                        </li>
                        <li class="item" data-type="day">
                            <div class="mainItemBox">
                                <div class="goalMeterLine">
                                    <span class="goalMeter"></span>
                                    <span class="goalMeterOn"></span>
                                </div>
                                <svg class="goalCircle">
                                    <circle cx="40" cy="40" r="30" fill="transparent" stroke-width="13"/>
                                    <circle cx="40" cy="40" r="30" class="circleFront" stroke-dasharray="188.495" stroke-dashoffset="188.495"/>
                                    <text x="40" y="40" dominant-baseline="middle" text-anchor="middle" class="goalCircleText">0%</text>
                                </svg>
                                <div class="golaCirdleBg"></div>
                                <div class="goalBarTop">
                                    <b>오늘</b>
                                    <p>
                                        <span class="todayFrugal">0</span>원
                                    </p>
                                </div>
                                <div class="goalBarBtm">
                                    <b>목표 절감액 :</b>
                                    <p>
                                        <span class="todayFrugalGoal">0</span>원
                                    </p>
                                </div>
                            </div>
                            <div class="subTextBox">
                                <div>
                                    <b>사용전력</b>
                                    <p>
                                        <span class="todayWatt">0</span>kw
                                    </p>
                                </div>
                                <div>
                                    <b>저압 전력 요금</b>
                                    <p>
                                        <span class="todayLowBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>고압 전력 요금</b>
                                    <p>
                                        <span class="todayHighBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>저압 요금 절감률</b>
                                    <p>
                                        <i class="bi bi-caret-up-fill" aria-hidden="true"></i>
                                        <span class="todayRatio">0</span>%
                                    </p>
                                </div>
                            </div>
                        </li>
                        <li class="item" data-type="week">
                            <div class="mainItemBox">
                                <div class="goalMeterLine">
                                    <span class="goalMeter"></span>
                                    <span class="goalMeterOn"></span>
                                </div>
                                <svg class="goalCircle">
                                    <circle cx="40" cy="40" r="30" fill="transparent" stroke-width="13"/>
                                    <circle cx="40" cy="40" r="30" class="circleFront" stroke-dasharray="188.495" stroke-dashoffset="188.495"/>
                                    <text x="40" y="40" dominant-baseline="middle" text-anchor="middle" class="goalCircleText">0%</text>
                                </svg>
                                <div class="golaCirdleBg"></div>
                                <div class="goalBarTop">
                                    <b>이번 주</b>
                                    <p>
                                        <span class="weekFrugal">0</span>원
                                    </p>
                                </div>
                                <div class="goalBarBtm">
                                    <b>목표 절감액 :</b>
                                    <p>
                                        <span class="weekFrugalGoal">0</span>원
                                    </p>
                                </div>
                            </div>
                            <div class="subTextBox">
                                <div>
                                    <b>사용전력</b>
                                    <p>
                                        <span class="weekWatt">0</span>kw
                                    </p>
                                </div>
                                <div>
                                    <b>저압 전력 요금</b>
                                    <p>
                                        <span class="weekLowBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>고압 전력 요금</b>
                                    <p>
                                        <span class="weekHighBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>저압 요금 절감률</b>
                                    <p>
                                        <i class="bi bi-caret-up-fill" aria-hidden="true"></i>
                                        <span class="weekRatio">0</span>%
                                    </p>
                                </div>
                            </div>
                        </li>
                        <li class="item" data-type="month">
                            <div class="mainItemBox">
                                <div class="goalMeterLine">
                                    <span class="goalMeter"></span>
                                    <span class="goalMeterOn"></span>
                                </div>
                                <svg class="goalCircle">
                                    <circle cx="40" cy="40" r="30" fill="transparent"/>
                                    <circle cx="40" cy="40" r="30" class="circleFront" stroke-dasharray="188.495" stroke-dashoffset="188.495"/>
                                    <text x="40" y="40" dominant-baseline="middle" text-anchor="middle" class="goalCircleText">0%</text>
                                </svg>
                                <div class="golaCirdleBg"></div>
                                <div class="goalBarTop">
                                    <b>이번 달</b>
                                    <p>
                                        <span class="monthFrugal">0</span>원
                                    </p>
                                </div>
                                <div class="goalBarBtm">
                                    <b>목표 절감액 :</b>
                                    <p>
                                        <span class="monthFrugalGoal">0</span>원
                                    </p>
                                </div>
                            </div>
                            <div class="subTextBox">
                                <div>
                                    <b>사용전력</b>
                                    <p>
                                        <span class="monthWatt">0</span>kw
                                    </p>
                                </div>
                                <div>
                                    <b>저압 전력 요금</b>
                                    <p>
                                        <span class="monthLowBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>고압 전력 요금</b>
                                    <p>
                                        <span class="monthHighBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>저압 요금 절감률</b>
                                    <p>
                                        <i class="bi bi-caret-up-fill" aria-hidden="true"></i>
                                        <span class="monthRatio">0</span>%
                                    </p>    
                                </div>
                            </div>
                        </li>
                        <li class="item" data-type="year">
                            <div class="mainItemBox">
                                <div class="goalMeterLine">
                                    <span class="goalMeter"></span>
                                    <span class="goalMeterOn"></span>
                                </div>
                                <svg class="goalCircle">
                                    <circle cx="40" cy="40" r="30" fill="transparent" stroke-width="13"/>
                                    <circle cx="40" cy="40" r="30" class="circleFront" stroke-dasharray="188.495" stroke-dashoffset="188.495"/>
                                    <text x="40" y="40" dominant-baseline="middle" text-anchor="middle" class="goalCircleText">0%</text>
                                </svg>
                                <div class="golaCirdleBg"></div>
                                <div class="goalBarTop">
                                    <b>올해</b>
                                    <p>
                                        <span class="yearFrugal">0</span>원
                                    </p>
                                </div>
                                <div class="goalBarBtm">
                                    <b>목표 절감액 :</b>
                                    <p>
                                        <span class="yearFrugalGoal">0</span>원
                                    </p>
                                </div>
                            </div>
                            <div class="subTextBox">
                                <div>
                                    <b>사용전력</b>
                                    <p>
                                        <span class="yearWatt">0</span>kw
                                    </p>
                                </div>
                                <div>
                                    <b>저압 전력 요금</b>
                                    <p>
                                        <span class="yearLowBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>고압 전력 요금</b>
                                    <p>
                                        <span class="yearHighBill">0</span>원
                                    </p>
                                </div>
                                <div>
                                    <b>저압 요금 절감률</b>
                                    <p>
                                        <i class="bi bi-caret-up-fill" aria-hidden="true"></i>
                                        <span class="yearRatio">0</span>%
                                    </p>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="disMoney lowBox" id="disMoney">
                    <div>
                        <b>투자회수기간(ROI)</b>
                        <p>
                            <span class="frugalDays">-</span>일
                            &#40;<span class="investRatio">-</span>%&#41;
                        </p>
                    </div>
                    <div class="roiGoalLine">
                        <span class="roiGoal"></span>
                        <span class="roiGoalOn" id="roiGoalOn"></span>
                    </div>
                    <div>
                        <b>
                            <i class="bi bi-cursor-fill" aria-hidden="true"></i>투자금
                        </b>
                        <p>
                            <span class="investGold">-</span>원
                        </p>
                    </div>
                    <div>
                        <b>
                            <i class="bi bi-graph-down-arrow" aria-hidden="true"></i>누적 절감액
                        </b>
                        <p>
                            <i class="bi bi-arrow-up-short" aria-hidden="true"></i>
                            <span class="frugal">-</span>원
                        </p>
                    </div>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
h1{font-size:20px}
h2{margin:0;padding:0;font-size:16px}
main.contents{display:grid;gap:1vh;height:calc(100vh - 60px);grid-template-columns:repeat(16, 1fr);grid-template-rows:repeat(20, 1fr)}
.topInfo{grid-column:1/-1;grid-row:1/1;display:flex;flex-direction:row;justify-content:space-between;align-items:center;height:30px;padding:0 15px 0 15px}
.topInfo .title{padding:0;margin:0;font-weight:500}
.topInfo .topInfoRt{display:flex; flex-direction:row;align-items: center;gap:15px}
.topInfo .topInfoRt .blue{color:#00ffff}
.topInfo .topInfoRt div{font-size:1.25rem}
.topInfo .topInfoRt label{font-size:1.25rem;color:rgba(255, 255, 255, 0.9)}
.dayCk label{display:inline-flex;gap:0.5rem;align-items:center;margin:0;cursor:pointer}
.dayCk input[type="checkbox"]{position:relative;width:39px;height:21px;background-color:#2c3540;cursor:pointer;appearance:none;border-radius:1.25em}
.dayCk input[type="checkbox"]::before{position:absolute;top:3px;left:3px;width:15px;height:15px;background-color:#ffffff;transition:left 250ms linear;content:"";border-radius:50%}
.dayCk input[type="checkbox"]:checked{background-color:#00ffff}
.dayCk input[type="checkbox"]:checked::before{left:21px;background-color:#030305}

.liveUseArea{grid-column:1/12;grid-row:12/-1;padding:20px}
.liveUseArea h2{height:25px}
.lowBox:first-child{padding:0}
.peakLeft{grid-column:1/12;grid-row:2/11}
.peakArea.blue{border:1px solid #3654eb;box-shadow:rgba(54, 84, 235, 0.6) 0 0 30px}
.peakArea.orange{border:1px solid #ff8600;box-shadow:rgba(255, 134, 0, 0.6) 0 0 30px}
.peakArea.red{border:1px solid #ff005b;box-shadow:rgba(255, 0, 91, 0.6) 0 0 30px}
.peakRight{grid-column:12/-1;grid-row:2/-1;overflow:hidden}

/* peakArea */
.peakArea{grid-column:1/12;grid-row:2/12;display:flex;flex-direction:column;align-items:center;position:relative;height:auto;padding:0}
.peakArea .peakControlBar{display:flex;justify-content:space-between;align-items:center;width:100%;height:40px;padding:10px 20px;color:#eee}
.peakArea .controlBar{display:none}
.peakArea.blue .peakControlBar{background:linear-gradient(to right, rgba(18,20,183,0.7), rgba(41,141,255,0.7))}
.peakArea.orange .peakControlBar{background:linear-gradient(to right, rgba(255,119,0,0.7), rgba(255,204,0,0.7))}
.peakArea.red .peakControlBar{background:linear-gradient(to right, rgba(220,26,52,0.7), rgba(255,128,0,0.7))}
.peakArea.blue .controlEnd{display:block}
.peakArea.orange .controlWait{display:block}
.peakArea.red .controlIng{display:block}
.peakContents{display:flex;width:100%;height:calc(100% - 40px);padding:10px 20px 20px}
.nodePowerChart{width:100%;height:auto;min-height:100%;font-size:1rem;}
.nodePowerChart>img{width:100%;height:100%}
.nodeInfo{display:flex;justify-content:space-evenly;flex-direction:column;width:35%;height:100%;margin-left:15px}
.peakTimeArea{display:flex;flex-direction:column;justify-content:space-evenly;height:calc(180px + 20%)}
.peakWattLimit{position:relative;width:100%;max-width:235px;margin:0 auto}
.peakWattLimit img{width:100%;height:100%;object-fit:contain;object-position:center}
.statClip{display:inline-block;position:relative;width:100%;height:auto;border-radius:30px;background-color:#2c3540;font-weight:600;color:rgba(255, 255, 255, 0.7);text-align:center}
.statClip:after{display:flex;align-items:center;justify-content:center;height:100%;border-radius:inherit;background-clip:padding-box;font-size:0.875rem;line-height:1;content:attr(data-alt)}
.statClip.red{background:#ff005b;border:1px solid #b8faff;box-shadow:0 0 5px 2px #ff005b;color:#ffffff}
.statClip.orange{background:#eda024;border:1px solid #b8faff;box-shadow:0 0 5px 2px #eda024;color:#ffffff}
.statClip.blue{background:#0041ff;border:1px solid #b8faff;box-shadow:0 0 5px 2px #0041ff;color:#ffffff}
.statCheap{display:flex;align-items:center;justify-content:center;margin:10px 0;width:calc(30% - 20px);min-width:40px;text-align:center}
.needle{position:absolute;bottom:-12px;left:50%;z-index:10;width:42px;max-height:100%;transition:transform 1s;transform:translateX(-50%) rotate(-90deg);transform-origin:50% calc(100% - 21px);fill:#b8faff;will-change:transform}
.needlePer{display:flex;align-items:center;justify-content:center;position:absolute;bottom:-12px;left:calc(50% - 30px);z-index:30;width:40px;height:40px;font-family:"Open Sans", sans-serif;font-size:1.12rem;font-weight:bold;letter-spacing:-1px;text-shadow:1px 1px 2px rgba(0,0,0,0.3);transform:translateX(-50%)}
.needlePer sub{font-size:0.625rem}
.decotitle{display:none;width:100%;margin-bottom:5px;padding:5px 0;border-radius:10px;background-color:rgba(103,232,255,0.1);color:#b8faff;text-align:center;font-size:0.875rem}

/* 최대전력정보 */
.peakStatusArea{display:flex;justify-content:space-evenly;align-items:center}
.peakStatusArea hr{width:7%;margin:0;border-width:1px 0 0 0;border-style:dashed;color:#eee}
.peakStatusArea .statClip{width:100%;font-size:0.875rem;word-break:keep-all}
.peakStatusArea .statClip:after{line-height:30px}
.peakTimeInfo{display:flex;align-items:center;align-self:center;justify-content:space-between;width:100%;padding:0;color:#eee;font-size:1rem;text-align:center;letter-spacing:-0.5px}
.peakMeterLine{flex-grow:1;position:relative;height:13px}
.peakMeter{position:absolute;top:0;left:0;z-index:1;width:100%;height:100%;border-radius:20px;background-color:rgba(217, 217, 217, 0.3)}
.peakMeterOn{position:absolute;top:0;left:0;z-index:2;width:100%;max-width:100%;height:100%;border-radius:20px;background:linear-gradient(to right, #7b00ff,#4375ff, #00ffff, #ffffff)}
.peakPointArea{display:flex;justify-content:space-between;flex-wrap:wrap;width:100%;font-weight:bold}
.peakPointArea>div{display:flex;position:relative;justify-content:space-between;width:48%;margin-top:10px;padding:5px;line-height:1.2;font-size:1.25rem}
.peakPointArea .peakPointBoxA{border-bottom:3px solid #fdf800;color:#fdf800}
.peakPointArea .peakPointBoxB{border:0;border-bottom:3px solid #ff8600;border-style:dashed;color:#ff8600}
.peakPointArea .peakPointBoxC{border-bottom:3px solid #00ffff;color:#00ffff}
.peakPointArea .peakPointBoxD{border:0;border-bottom:3px solid #ad44ff;border-style:dashed;color:#ad44ff}
.peakPointLabel{word-break:keep-all}
.peakPointArea .peakPoint{display:flex;align-items:center;width:auto;min-width:50px;padding-left:10px;white-space:nowrap}
.peakPointArea>div>.decoDot{position:absolute;right:-1px;bottom:-4px;width:5px;height:5px;border-radius:50%;background-color:#ffffff}
.peakPointArea .peakPointBoxA .decoDot{box-shadow:rgba(255, 248, 0, 0.5) 0 0 4px 4px;background-color:#fdf800;animation:dotco 2s infinite}
.peakPointArea .peakPointBoxB .decoDot{box-shadow:rgba(255, 134, 0, 0.5) 0 0 4px 4px;background-color:#ff8600;animation:dotco 2s infinite}
.peakPointArea .peakPointBoxC .decoDot{box-shadow:rgba(0, 255, 255, 0.5) 0 0 4px 4px;background-color:#00ffff;animation:dotco 2s infinite}
.peakPointArea .peakPointBoxD .decoDot{box-shadow:rgba(173,68,255, 0.5) 0 0 4px 4px;background-color:#ad44ff;animation:dotco 2s infinite}
@keyframes dotco {
    0%{opacity:0}
    50%{opacity:1}
    100%{opacity:0}
}

/* liveUseArea */
.peakSort{display: flex;font-size:1.1rem; color:#b8faff}
.peakSort h3{display:flex;align-items:center;height:35px;margin:0;padding:0 20px;white-space:nowrap;font-size:1.2rem;}
.peakSort ul{display:flex;justify-content: space-around;width:100%;height:35px;padding:5px 15px;border-radius: 10px;background-color: #030305;}
.peakSort ul>li{display: flex;align-items:center;gap:15px;word-break: keep-all;text-align:center;}
.peakContract{color:#c8b9ff;}
.peakOver{color:#ff005b;}
.peakNine{color:#ff8600;}
.peakEight{color:#ffec7d;}
.liveUseContent{display:flex;flex-direction:row;width:100%;height:calc(100% - 65px);margin-top:15px}
.liveUseChart{position:relative;width:80%;font-size:1rem;}
.useChartData{display:flex;width:100%;height:auto;min-height:100%}
.useChartData>div:first-child{width:100%;height:auto;min-height:100%}
.useChartData img{width:100%;height:100%}
.liveUseTag{width:20%;min-width:150px;padding-left:15px}
/* .liveUseBtn li{display:flex;justify-content:center;width:100%;height:auto;margin:0 auto 1vh;padding:5px 15px;border-radius:5px;background-color:rgba(3, 3, 5, 0.4);color:#00ffff;font-size:14px;font-weight:500;cursor:pointer}
.liveUseBtn li:hover{background-color:#00ffff;color:#030305;font-weight:bold;transition-duration:0.6s}
.liveUseBtn i{margin:0 5px 0 10px}
.liveUseBtn span{display:block;text-align:center;width:100%;max-width:90px;font-weight:normal}
.liveUseBtn li.active{background-color:#00ffff;box-shadow:0 0 5px #00ffff;color:#030305;font-weight:bold} */
.liveUseLabel{display:flex;flex-direction:column;justify-content:space-around;height:100%}
.liveUseLabel>div{display:flex;flex-direction: column;gap:5px}
.liveUseLabel>div>span{color:#b8faff}
.liveUseLabel .UseLabelBox{display:flex;align-items:center;padding:0 5px;font-size:1rem;word-break:keep-all}
.useSign,.billSign>span{font-size:1rem;}
.useSign .UseLabelBox .UseLabelSign{width:8px;height:15px;margin-right:5px;border-radius:10px;background-color:#ff005b;}
.useSign .UseLabelBox:nth-child(3) .UseLabelSign{background-color:#ff8600;}
.useSign .UseLabelBox:nth-child(4) .UseLabelSign{background-color:#0041ff;}
.billSign .UseLabelBox .UseLabelSign{width:15px;height:3px;margin-right:5px;background-color: #00ffff;}
.billSign .UseLabelBox:last-child .UseLabelSign{background-color: #fdf800;}
/* goal */
.goal{height:72vh}
.goalCircleText{fill:#00ffff}
.goal.lowBox{padding:15px 0 0}
.goal h2{padding:0 15px 0;height:25px}
.goalAccordion li{border-bottom:2px solid rgba(3, 3, 5, 0.3)}
.goalAccordion li:last-child{border-bottom:0}
.mainItemBox{position:relative;width:100%;height:calc(12vh - 8px);cursor:pointer}
.goalMeterLine{position:relative;top:calc(50% - 6px);left:85px;width:calc(100% - 110px);height:12px}
.goalMeterLine .goalMeter{position:absolute;top:0;left:0;z-index:1;width:100%;height:100%;border-radius:20px;background-color:rgba(217, 217, 217, 0.3)}
.goalMeterLine .goalMeterOn{position:absolute;top:0;left:0;z-index:2;width:0;max-width:100%;height:100%;border-radius:10px;background:linear-gradient(to right, #0041ff, #0041ff,#0be7ff,#fff);box-shadow:5px 0 5px #b8faff;animation:shadowDecoW 2s infinite;transition:width 1s ease-in-out}
.goalMeterOn::before{content:'';display:block;position:relative;top:-4px;z-index:-1;width:calc(100% + 6px);height:calc(100% + 8px);border-radius:10px;background:linear-gradient(90deg,rgba(0,0,0,0.6),rgba(0,0,0,0.5),rgba(0,0,0,0.4),rgba(0,0,0,0.3),rgba(0,0,0,0.3),rgba(0,0,0,0.2),rgba(0,0,0,0.1),rgba(103,232,255,0.1),rgba(255,255,255,0.4),#fff,#fff)}
@keyframes shadowDecoW {
    0%{box-shadow:5px 0 6px 1px #b8faff}
    50%{box-shadow:0 0 2px 0 #b8faff}
    100%{box-shadow:5px 0 6px 1px #b8faff}
}
.golaCirdleBg{position:absolute;top:calc(6vh - 40px);left:20px;width:70px;height:70px;border-radius:50%;background-color:transparent}
@keyframes shadowdecoY {
    0%{box-shadow:0 0 11px 3px #ffec7d}
    50%{box-shadow:0 0 7px 1px #ffec7d}
    100%{box-shadow:0 0 11px 3px #ffec7d}
}
.mainItemBox .goalCircle{position:absolute;top:calc(6vh - 44px);left:15px;z-index:4}
.mainItemBox .goalCircle circle{stroke-width:13px;stroke:#465368}
.mainItemBox .goalCircle .circleFront{fill:transparent;stroke:#0041ff;transform:rotate(-90deg);transform-origin:40px 40px}
.gold .mainItemBox .goalCircle{stroke:#e3be41}
.gold .mainItemBox .goalCircle .circleFront{stroke:#e3be41}
.gold .mainItemBox b{color:#ffec7d}
.gold .mainItemBox p>span{color:#ffec7d}
.gold .mainItemBox .goalMeterOn{background:linear-gradient(to right, #e8d54c, #fddfa8,#fffcd9);box-shadow:0 0 15px 3px #ffec7d;animation:shadowdecoY 2s infinite}
.gold .mainItemBox .goalMeterOn::before{content:'';display:block;position:relative;top:-4px;z-index:0;width:calc(100% + 6px);height:calc(100% + 8px);border-radius:10px;background:transparent;box-shadow:0}
.gold .mainItemBox .golaCirdleBg{box-shadow:0 0 10px 3px #ffec7d;animation:shadowdecoY 2s infinite}
.goalBarTop{display:flex;justify-content:space-between;position:absolute;top:0px;left:95px;align-items:center;z-index:5;width:calc(100% - 130px);color:#b8faff;font-size:1.25rem}
.goalBarTop p{display:block;color:#eee}
.goalBarTop span{padding:0 5px;color:#b8faff;font-size:1.25rem}
.goalBarBtm{display:flex;align-items:center;position:absolute;right:35px;bottom:0.05vh;font-size:1rem}
.goalBarBtm span{margin:0 3px 0 5px}

.subTextBox{display:none;width:100%;height:calc(12vh - 6px);padding-top:4px;background-color:#030305}
.item:first-child .subTextBox{display:block}
.subTextBox>div{display:flex;justify-content:space-between;align-items:center;width:100%;height:calc(3vh - 3px);padding:0 30px 0 20px;color:#b8faff}
.subTextBox>div:first-child{color:#ffec7d}
.subTextBox>div:last-child{color:#00ffff}
.subTextBox b{font-size:1.125rem;font-weight:normal}
.subTextBox p{margin:0;font-size:1.125rem;line-height:1.1}
.subTextBox span{margin:0 5px;font-size:1.125rem}

/* disMoney */
.disMoney{display:flex;flex-direction:column;justify-content:center;margin-top:1vh;padding:0 20px;height:13vh}
.disMoney>div{display:flex;justify-content:space-between;align-items:center;padding-right:10px;color:#b8faff;font-size:1rem}
.disMoney i{margin-right:10px;font-size:0.875rem}
.disMoney p{margin:0}
.disMoney span{margin:0 5px}
.disMoney>div:first-child b {font-size:1.25rem;font-weight:500}
.disMoney>div:last-child p {color:#00ffff}

/* disMoney-ROI */
.roiGoalLine{position:relative;width:calc(100% - 10px);height:11px;margin:5px 0}
.roiGoalLine .roiGoal{position:absolute;top:0;left:0;z-index:1;width:100%;height:100%;border-radius:20px;background-color:rgba(217, 217, 217, 0.3)}
.roiGoalLine .roiGoalOn{position:absolute;top:0;left:0;z-index:2;max-width:100%;height:100%;border-radius:10px;background:linear-gradient(to right, #0041ff, #0041ff,#0be7ff,#fff);box-shadow:5px 0 5px #b8faff;animation:shadowDecoW 2s infinite}
.roiGoalOn::before{content:'';display:block;position:relative;top:-3px;z-index:-1;width:calc(100% + 6px);height:calc(100% + 6px);border-radius:10px;background:linear-gradient(90deg,rgba(0,0,0,0.6),rgba(0,0,0,0.5),rgba(0,0,0,0.4),rgba(0,0,0,0.3),rgba(0,0,0,0.3),rgba(0,0,0,0.2),rgba(0,0,0,0.1),rgba(103,232,255,0.1),rgba(255,255,255,0.4),#fff,#fff)}
.gold .roiGoalLine .roiGoalOn{background:linear-gradient(to right, #e8d54c, #fddfa8,#fffcd9);box-shadow:0 0 15px 3px #ffec7d;animation:shadowdecoY 2s infinite}
.gold .roiGoalLine .roiGoalOn::before{content:'';display:block;position:relative;top:-3px;z-index:0;width:calc(100% + 6px);height:calc(100% + 6px);border-radius:10px;background:transparent;box-shadow:0}

@media screen and (max-height:850px){
    html{font-size:12px}
    main.contents{height:auto}
    .goal{height:auto}
    .mainItemBox{height:90px;}
    .subTextBox{height:100px;}
    .subTextBox>div{height:23px;}
    .mainItemBox .goalCircle{top:5px;}
    .golaCirdleBg{top:9px}
    .disMoney{height:110px;}
    .subTextBox b{font-size:1rem}
}
@media screen and (max-height:900px){
    .subTextBox b{font-size:1rem}
}
@media screen and (max-width:1700px){
    .nodeInfo{flex-direction:row;gap:1rem}
    .peakTimeArea{justify-content:space-around;width:65%;height:100%}
    .peakPointArea{justify-content:center;align-content:space-around;width:35%;min-width:60px}
    .nodePowerChart{width:55%}
    .nodeInfo{width:45%}
    .peakTimeInfo{font-size:14px}
    .peakPointArea>div{flex-direction:column;width:100%;margin-top:0;gap:2px}
    .peakPointLabel{text-align:center}
    .peakPointArea .peakPoint{flex-direction:column;padding-left:0}
    .liveUseContent {margin-top:0}
    .decotitle{display:block}
}

@media screen and (max-width:1470px){
    .peakContents{min-width:300px}
    .peakPointArea>div{width:100%;padding:0}
    .peakSort{padding-bottom:1rem;}
}

@media screen and (max-width:1140px){
    .goalBarTop{font-size: 1.17rem;white-space:nowrap}
    .goalBarTop span{font-size:1.17rem;}
    .disMoney>div{font-size:1.17rem;}
}
@media screen and (max-width:1000px){
    main.contents{display:flex;flex-direction:column;height:auto}
    .topInfo{height:auto}
    .peakArea{height:auto}
    .goal{height:auto}
    .decotitle{display:none}
    .liveUseTag{height:260px;}
    .subTextBox b{font-size:1.125rem}
}


@media screen and (max-width:720px){
    .topInfo{flex-direction:column;padding:10px 0 5px}
    .topInfo .title{padding:0 15px 5px}
    .topInfo .topInfoRt{justify-content:space-between;align-items:center;flex-wrap:wrap;padding:10px 15px;border-radius:10px;background-color:rgba(0,0,0,0.5)}
    .peakArea{max-height:none}
    .peakContents{flex-direction:column;gap:15px;height:auto}
    .nodeInfo{width:100%;flex-direction:row;gap:15px;margin:0}
    .peakTimeArea{width:70%}
    .peakPointArea{width:38%}
    .liveUseChart{width:100%;margin:15px 0;}
    .liveUseContent{flex-direction:column}
    .liveUseTag{width:100%;height:auto;padding:0}
    .liveUseBtn{display:flex;flex-direction:row;gap:15px}
    .liveUseBtn li{flex-wrap:wrap;width:100%;height:auto;align-items:center;border:1px solid #00ffff}
    .liveUseBtn span{width:auto}
    .liveUseLabel{display:flex;flex-direction:column;height:auto;padding-top:10px}
    .liveUseLabel>div{flex-direction:row;}
    .peakSort{flex-direction: column;}
    .peakSort ul{flex-wrap:wrap;height:auto;}
    .peakSort ul>li{width:50%;height:30px;justify-content:space-around;}
    .nodePowerChart{width:100%;height:300px}
}

@media screen and (max-width:420px){
    h2{font-size:18px;padding:0 0 10px}
    .nodeInfo{flex-direction:column}
    .peakTimeArea, .peakPointArea{width:100%}
    .peakPointArea>div{padding:5px 0}
    .liveUseTag{flex-direction:column-reverse}
    .liveUseBtn{flex-wrap:wrap;gap:0}
    .liveUseBtn li{width:calc(50% - 15px)}
    .liveUseLabel{padding:5px 0 15px}
    .goal h2{padding-bottom:10px}
    .goalBarBtm{font-size:14px}
    .subTextBox b{font-size:14px}
    .disMoney>div{font-size: 14px;}
    .disMoney>div:first-child b{font-size:18px;}
    .roiGoalLine{margin:10px 0}
    .disMoney{padding:15px 20px;height:auto;}
    .peakSort ul>li{width:100%;}
}
```

## 원본 JS 이벤트 핸들러

- `peakMediaAlarm` → **change**
- `peakPointArea` → **click**
- `.mainItemBox` → **click**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/peak.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/peak.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="peakGrid contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="peakGrid contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
