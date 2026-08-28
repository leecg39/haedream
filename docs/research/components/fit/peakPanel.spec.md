# FitPeakPanelPage Specification

## Overview
- **Route:** `/fit/peak-panel`
- **Target file:** `src/app/(fit-app)/fit/peak-panel/page.tsx`
- **원본:** https://fit.rfenms.com/peakPanel.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/peakPanel.html` · JS `docs/research/fit.rfenms.com/assets/js/peakPanel.js`
- **`<title>`:** 부하 상황판
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/peakPanel.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tom-select.complete.min, tui-date-picker, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">부하 상황판</h1>
            <div class="sheetArea">
                <table class="sheet">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>부하이름</th>
                            <th>상태</th>
                            <th>우선순위</th>
                            <th>온도(℃)</th>
                            <th>습도(%)</th>
                            <th>입력(V)</th>
                            <th>출력(V)</th>
                            <th>입력(mA)</th>
                            <th>출력(mA)</th>
                        </tr>
                    </thead>
                    <tbody id="itemList">
                        <tr>
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
.sheetArea{width:100%;height:auto;max-height:calc(100vh - 150px);overflow:auto;margin:0;border:2px solid rgba(0, 0, 0, 0.1);border-radius:20px;background-color:rgba(3, 3, 5, 0.4);box-shadow:rgba(0, 0, 0, 0.15) 0px 0px 120px inset}
.sheet{width:100%;height:100%;margin:0;border-collapse:collapse;border-spacing:2px;border-radius:20px;text-align:center}
.sheet thead{width:100%;height:50px;background-color:rgba(0,0,29,0.6);backdrop-filter:blur(10px);;color:#00ffff}
.sheet thead th{font-weight:400}
.sheet td{height:50px;text-align:center;font-weight:normal}
.sheet tr>th:first-child,td:first-child{padding-left:20px}
.sheet tr>th:last-child.td:last-child{padding-right:20px}
.sheet tbody>tr:last-child td{padding-bottom:20px}
.sheet tbody tr:hover{background-color:rgba(217,217,217,0.2)}
.sheet thead{position:sticky;top:0;z-index:10}

/*기존데이터 */
.sheetEm{color:inherit;font-style:italic}
.sheetSub{color:inherit;font-size:.74rem;font-style:italic}

.panelStat{display:block;text-align:center}
.panelBar{display:inline-block;position:relative;width:38px;height:21px;border-radius:24px;background-color:rgba(255,255,255,0.5);vertical-align:middle}
.panelBar::before{position:absolute;content:"";bottom:3px;left:3px;width:15px;height:15px;border-radius:50%;background-color:#fff;vertical-align:middle;cursor:pointer}
.active .panelBar::before{right:3px;left:auto}
.active .panelBar{background-color:#359af9}
.waiting .panelBar::before{bottom:2px;width:1rem;height:1rem;border:.3rem solid #03a9f4;border-radius:50%;background-image:none;-webkit-animation:rotate 2s infinite linear;border-top-color:transparent}

@media (max-width:768px){
    .sheetArea{width:100%;overflow-x:auto}
    .sheet{min-width:900px}
}

@media (max-width:480px){
    .sheetArea{overflow:auto;margin:10px 0 1rem 0}
    .sheet{margin:0}
    .sheet th{min-width:6rem}
    .panelStat{min-width:10rem}
}

/*기존데이터 */
```

## 원본 JS 이벤트 핸들러

- (DOM 이벤트 핸들러 없음 — 렌더링 후 정적)

전체 로직은 `docs/research/fit.rfenms.com/assets/js/peakPanel.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/peak-panel.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
