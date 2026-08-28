# FitPeakSetPage Specification

## Overview
- **Route:** `/fit/peak-set`
- **Target file:** `src/app/(fit-app)/fit/peak-set/page.tsx`
- **원본:** https://fit.rfenms.com/peakSet.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/peakSet.html` · JS `docs/research/fit.rfenms.com/assets/js/peakSet.js`
- **`<title>`:** 피크 제어설정
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/peakSet.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tui-date-picker, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">피크 제어설정</h1>
            <div class="sheetArea">
                <table class="sheet">
                    <thead>
                        <tr>
                            <th></th>
                            <th>입력범위(단위)</th>
                            <th>현재값</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th>목표전력</th>
                            <td>1~100000(kW)</td>
                            <td><input class="input" id="powerLimit" type="number" step="1" min="1" max="65000" /></td>
                        </tr>
                        <tr>
                            <th>PCT 비율</th>
                            <td>1~65000</td>
                            <td><input class="input" id="pct_ratio" type="number" step="1" min="1" max="65000" /></td>
                        </tr>
                        <tr>
                            <th>펄스정수</th>
                            <td>1~65000</td>
                            <td><input class="input" id="pulse_num" type="number" step="1" min="1" max="65000" /></td>
                        </tr>
                        <tr>
                            <th>운전모드</th>
                            <td>수동/자동</td>
                            <td>
                                <select class="select" id="peakRunMode">
                                    <option value="0">수동</option>
                                    <option value="1">자동</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>제어 On Delay</th>
                            <td>1~900(second)</td>
                            <td><input class="input" id="peakOnDelay" type="number" step="1" min="1" max="900" /></td>
                        </tr>
                        <tr>
                            <th>제어 Off Delay</th>
                            <td>1~900(second)</td>
                            <td><input class="input" id="peakOffDelay" type="number" step="1" min="1" max="900" /></td>
                        </tr>
                        <tr>
                            <th>안전 퍼센트</th>
                            <td>0~50(%)</td>
                            <td><input class="input" id="peakSafe" type="number" step="1" min="0" max="50" /></td>
                        </tr>
                        <tr>
                            <th>초기제어금지</th>
                            <td>1~900(second)</td>
                            <td><input class="input" id="peakFirstDelay" type="number" step="1" min="1" max="900" /></td>
                        </tr>
                        <tr>
                            <th>알람유지시간</th>
                            <td>0~900(second)</td>
                            <td><input class="input" id="peakAlarmTime" type="number" step="1" min="0" max="900" /></td>
                        </tr>
                        <tr>
                            <th>제어방식</th>
                            <td>우선제어/순차제어</td>
                            <td>
                                <select class="select" id="peakControlMode">
                                    <option value="0">우선</option>
                                    <option value="1">순차</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="actArea">
                    <span class="act" id="actSave">설정 저장</span>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.titleArea{display:flex;flex-direction:row;justify-content:space-between}
.actArea{position:absolute;top:1rem;right:2rem;text-align:right}
.sheetArea{width:100%;height:auto;max-height:calc(100vh - 150px);overflow:auto}
.sheet{width:100%;height:100%;margin:0;border-collapse:separate;border-radius:20px;text-align:center}
.sheet thead{position:sticky;top:0;width:100%;height:50px;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(5px)}
.sheet thead th{color:#00ffff;font-weight:400}
.sheet tbody tr th{width:30%;min-width:200px;padding-left:20px;background-color:rgba(0,0,0,0.1);color:#b8faff;font-weight:400}
.sheet td{padding:.6rem .2rem;font-size:1rem;font-weight:400}
.sheet tbody tr td{padding:14px 20px 14px 40px}
.sheet tbody tr:hover{background-color:rgba(238,238,238,0.2)}
.sheet tbody tr td:last-child{width:calc(50vw - 240px)}
.sheet tbody tr:first-child td{padding-top:20px}
.sheet tbody tr:last-child td{padding-bottom:20px}
.input,
.select{width:100%;min-width:200px;height:35px;padding:.2rem 1rem;border:1px solid #00ffff;border-radius:5px;background-color:#2C3540;font-size:1rem}
.input:hover,
.select:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.select{width:100%;font-size:1rem}
option{background-color:#2C3540;font-size:1rem}
.sheetEm{color:inherit;font-style:italic}
.sheetSub{color:inherit;font-size:.74rem;font-style:italic}

@media (max-width:768px){
    .deskArea{overflow:auto;margin:1rem 0}
    .input{font-size:1rem}
    .select{font-size:1rem}
}
@media (max-width:670px){
    .sheetArea{overflow:auto}
    .sheet{min-width:500px}
    tbody tr td{padding:15px 10px}
}
@media (max-width:480px){
    .sheetArea{width:100%;margin:15px 0 1rem 0}
    .actArea{height:40px}
}
```

## 원본 JS 이벤트 핸들러

- `actSave` → **click**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/peakSet.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/peak-set.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
