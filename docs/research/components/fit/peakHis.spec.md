# FitPeakHisPage Specification

## Overview
- **Route:** `/fit/peak-his`
- **Target file:** `src/app/(fit-app)/fit/peak-his/page.tsx`
- **원본:** https://fit.rfenms.com/peakHis.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/peakHis.html` · JS `docs/research/fit.rfenms.com/assets/js/peakHis.js`
- **`<title>`:** 피크 그래프
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/peakHis.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">피크 그래프</h1>
            <div class="peakChart">
                <div class="deskTool">
                    <div class="mTBlock">
                        <span class="deskLabel">기록일</span>
                        <div class="datePicker">
                            <div class="tui-datepicker-input tui-datetime-input tui-has-focus">
                                <input type="text" class="inputDate" id="sDate" aria-label="Date-Time" readonly>
                                <i class="bi bi-calendar"></i>
                            </div>
                            <div id="wrapper"></div>
                        </div>
                        <span class="mNext"></span>
                    </div>
                    <div class="mTBlock">
                        <span class="deskLabel">시간</span>
                        <select class="select" id="sTime">
                            <option value="00:00">00:15</option>
                            <option value="00:15">00:30</option>
                            <option value="00:30">00:45</option>
                            <option value="00:45">01:00</option>
                            <option value="01:00">01:15</option>
                            <option value="01:15">01:30</option>
                            <option value="01:30">01:45</option>
                            <option value="01:45">02:00</option>
                            <option value="02:00">02:15</option>
                            <option value="02:15">02:30</option>
                            <option value="02:30">02:45</option>
                            <option value="02:45">03:00</option>
                            <option value="03:00">03:15</option>
                            <option value="03:15">03:30</option>
                            <option value="03:30">03:45</option>
                            <option value="03:45">04:00</option>
                            <option value="04:00">04:15</option>
                            <option value="04:15">04:30</option>
                            <option value="04:30">04:45</option>
                            <option value="04:45">05:00</option>
                            <option value="05:00">05:15</option>
                            <option value="05:15">05:30</option>
                            <option value="05:30">05:45</option>
                            <option value="05:45">06:00</option>
                            <option value="06:00">06:15</option>
                            <option value="06:15">06:30</option>
                            <option value="06:30">06:45</option>
                            <option value="06:45">07:00</option>
                            <option value="07:00">07:15</option>
                            <option value="07:15">07:30</option>
                            <option value="07:30">07:45</option>
                            <option value="07:45">08:00</option>
                            <option value="08:00">08:15</option>
                            <option value="08:15">08:30</option>
                            <option value="08:30">08:45</option>
                            <option value="08:45">09:00</option>
                            <option value="09:00">09:15</option>
                            <option value="09:15">09:30</option>
                            <option value="09:30">09:45</option>
                            <option value="09:45">10:00</option>
                            <option value="10:00">10:15</option>
                            <option value="10:15">10:30</option>
                            <option value="10:30">10:45</option>
                            <option value="10:45">11:00</option>
                            <option value="11:00">11:15</option>
                            <option value="11:15">11:30</option>
                            <option value="11:30">11:45</option>
                            <option value="11:45">12:00</option>
                            <option value="12:00">12:15</option>
                            <option value="12:15">12:30</option>
                            <option value="12:30">12:45</option>
                            <option value="12:45">13:00</option>
                            <option value="13:00">13:15</option>
                            <option value="13:15">13:30</option>
                            <option value="13:30">13:45</option>
                            <option value="13:45">14:00</option>
                            <option value="14:00">14:15</option>
                            <option value="14:15">14:30</option>
                            <option value="14:30">14:45</option>
                            <option value="14:45">15:00</option>
                            <option value="15:00">15:15</option>
                            <option value="15:15">15:30</option>
                            <option value="15:30">15:45</option>
                            <option value="15:45">16:00</option>
                            <option value="16:00">16:15</option>
                            <option value="16:15">16:30</option>
                            <option value="16:30">16:45</option>
                            <option value="16:45">17:00</option>
                            <option value="17:00">17:15</option>
                            <option value="17:15">17:30</option>
                            <option value="17:30">17:45</option>
                            <option value="17:45">18:00</option>
                            <option value="18:00">18:15</option>
                            <option value="18:15">18:30</option>
                            <option value="18:30">18:45</option>
                            <option value="18:45">19:00</option>
                            <option value="19:00">19:15</option>
                            <option value="19:15">19:30</option>
                            <option value="19:30">19:45</option>
                            <option value="19:45">20:00</option>
                            <option value="20:00">20:15</option>
                            <option value="20:15">20:30</option>
                            <option value="20:30">20:45</option>
                            <option value="20:45">21:00</option>
                            <option value="21:00">21:15</option>
                            <option value="21:15">21:30</option>
                            <option value="21:30">21:45</option>
                            <option value="21:45">22:00</option>
                            <option value="22:00">22:15</option>
                            <option value="22:15">22:30</option>
                            <option value="22:30">22:45</option>
                            <option value="22:45">23:00</option>
                            <option value="23:00">23:15</option>
                            <option value="23:15">23:30</option>
                            <option value="23:30">23:45</option>
                            <option value="23:45">24:00</option>
                        </select>
                        <span class="act actIcon" id="act">
                            <i class="bi bi-search"></i>조회
                        </span>
                    </div>
                </div>
                <div class="chart1" id="chart1"></div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.peakChart{overflow:hidden;width:100%;margin:0;padding:0;background-color:rgba(3, 3, 5, 0.4);border:2px solid rgba(0, 0, 0, 0.1);border-radius:20px;box-shadow:rgba(0, 0, 0, 0.15) 0 0 120px inset}
.deskTool{display:flex;align-items:center;gap:15px;flex-direction:row;width:100%;padding:15px 20px;background-color:rgba(0,0,29,0.6);text-align:center}
.chartSerachBtn{width:inherit;display:flex;gap:15px}
.mTBlock{display:flex;align-items:center}
.deskTool .datePicker, .select{overflow:hidden;width:100%;height:40px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540;margin-left:15px;padding:0 15px}
.deskTool .datePicker:hover, .select:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.deskTool .select{padding:8px 23px;font-size:1rem}
.deskTool .tui-datepicker-input{border:0}
.deskTool .inputDate{height:100%;border-radius:10px;font-size:1rem;text-align:start}
.deskTool .inputDate::-webkit-calendar-picker-indicator{filter:invert(.8)}
.deskLabel{color:#b8faff;white-space:nowrap}
/*.select{width:100%;min-width:100px;height:100%;border:0;background-color:transparent;font-size:1rem}*/
.select option{width:100%;background-color:#000;font-size:1rem}
.chartLableBox{display:flex;justify-content:space-around;gap:15px;width:60%}
.chartLable{display:flex;align-items:center;gap:10px;line-height:1.2}
.chartLable hr{width:30px}
.chartLable:nth-child(1)>hr{border:2px solid #ffec7d}
.chartLable:nth-child(2)>hr{border:2px dashed #ff8600}
.chartLable:nth-child(3)>hr{border:2px solid #00ffff}
.chartLable:nth-child(4)>hr{border:2px dashed #ad44ff}
.chart1{height:calc(100vh - 280px);margin:20px}

@media (max-width:1470px){
    .chartLableBox{width:100%}
    .chart1{height:calc(100vh - 320px);margin:15px}
}

@media (max-width:1180px){
    .deskTool{flex-wrap:wrap}
    .chartSerachBtn{justify-content:space-between}
    .chartLableBox{justify-content:center}
    .mTBlock{justify-content:end}
    .datePicker,
    .select{width:calc(100% - 80px)}
}

@media (max-width:768px){
    .deskArea{overflow:auto;margin:1rem 0}
    .mTBlock{flex-wrap:wrap;flex-basis:100%}
    .deskLabel{width:60px;margin:0;text-align:start}
    .chartSerachBtn{flex-wrap:wrap}
    .select{padding:.2rem .4rem;font-size:1rem}
    .inputDate{padding:.2rem .4rem;font-size:1rem}
    .peakChart{padding:0}
    .chart1{height:50vh}
}
@media (max-width:480px){
    .peakChart{margin-top:10px}
}
```

## 원본 JS 이벤트 핸들러

- `act` → **click**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/peakHis.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/peak-his.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
