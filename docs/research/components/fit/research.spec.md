# FitResearchPage Specification

## Overview
- **Route:** `/fit/research`
- **Target file:** `src/app/(fit-app)/fit/research/page.tsx`
- **원본:** https://fit.rfenms.com/research.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/research.html` · JS `docs/research/fit.rfenms.com/assets/js/research.js`
- **`<title>`:** 한전데이터 수집
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/deskLib.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/research.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tom-select.complete.min, tui-date-picker, amcharts/core, amcharts/charts, amcharts/themes/dark, amcharts/themes/animated

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">한전데이터 수집</h1>
            <div class="researchHead" id="researchInfo">
                <span class="researchLabel">전력타입</span>
                <span class="researchInfoText" data-name="contract">없음</span>
                <span class="researchLabel">고객번호</span>
                <span class="researchInfoText" data-name="kepcoCyber">0000000000</span>
                <span class="researchLabel">한전비번</span>
                <span class="researchInfoText" data-name="kepcoPasswd">password</span>
                <span class="researchLabel">스케줄 상태</span>
                <span class="researchInfoText" data-name="kepcoStatus">스케줄 없음</span>
                <span class="researchInfoText" data-name="kepcoTime">업데이트정보 없음</span>
                <span class="researchAct" data-name="kepcoProgress" id="researchRequest">수집 요청</span>
            </div>
            <div class="researchNav">
                <span class="toggleAct active" id="researchCharges">월별 요금정보</span>
                <span class="toggleAct" id="researchQuarter">시간별 전력사용량 kW</span>
            </div>
            <div class="researchData" id="researchData">
                <span class="researchDataLabel">일자</span>
                <span class="researchDataLabel">검침일</span>
                <span class="researchDataLabel">요금적용전력</span>
                <span class="researchDataLabel">기본요금</span>
                <span class="researchDataLabel">전력량요금</span>
                <span class="researchDataLabel">청구요금</span>
                <span class="researchDataLabel">경부하전력량</span>
                <span class="researchDataLabel">중부하전력량</span>
                <span class="researchDataLabel">최대부하전력량</span>
                <span class="researchDataLabel">지상역률</span>
                <span class="researchDataLabel">진상역률</span>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.deskTitle{position:relative;margin:0 0 12px;padding:0 15px 10px 28px;font-size:1.25rem;letter-spacing:-0.02em}
.researchHead{display:flex;align-items:center;flex-wrap:wrap;gap:10px;min-height:72px;margin:0;padding:15px 20px;border:1px solid rgba(184, 250, 255, 0.12);border-radius:18px;background:linear-gradient(135deg, rgba(0, 0, 29, 0.88), rgba(12, 24, 48, 0.72));box-shadow:0 12px 34px rgba(0, 0, 0, 0.18)}
.researchLabel{color:#b8faff;font-size:0.9rem;white-space:nowrap;vertical-align:middle}
.researchInfoText{min-height:34px;padding:7px 12px;border:1px solid rgba(184, 250, 255, 0.14);border-radius:8px;background-color:#182431;color:#ffffff;font-size:0.92rem;text-align:center;white-space:nowrap}
.researchInfoText[data-name="kepcoStatus"]{color:#7dd3fc}
.researchInfoText[data-name="kepcoTime"]{color:#aab8c8}
.researchAct{display:inline-flex;justify-content:center;align-items:center;min-width:104px;min-height:38px;margin-left:auto;padding:7px 16px;border:1px solid rgba(110, 231, 183, 0.8);border-radius:8px;background-color:rgba(16, 185, 129, 0.16);color:#6ee7b7;font-size:0.92rem;text-align:center;cursor:pointer;transition:border-color 0.2s, background-color 0.2s, color 0.2s, transform 0.2s}
.researchAct:hover{border-color:#6ee7b7;background-color:rgba(16, 185, 129, 0.28);color:#d1fae5;transform:translateY(-1px)}
.researchAct.progress{background:linear-gradient(90deg, rgba(16, 185, 129, 0.18) 40%, rgba(110, 231, 183, 0.42) 50%, rgba(16, 185, 129, 0.18) 60%);background-size:280% 100%;animation:onprogress 1s infinite linear;cursor:wait}
@keyframes onprogress{0%{background-position:right}}
.researchNav{display:flex;gap:8px;margin:14px 0 0;padding:0 6px;border-bottom:1px solid rgba(184, 250, 255, 0.16)}
.toggleAct{position:relative;min-width:160px;padding:11px 18px;border:1px solid transparent;border-bottom:0;border-radius:9px 9px 0 0;background-color:rgba(24, 36, 49, 0.72);color:#9aa8b8;font-size:0.94rem;text-align:center;cursor:pointer;transition:background-color 0.2s, color 0.2s}
.toggleAct:hover{background-color:rgba(35, 63, 95, 0.82);color:#ffffff}
.toggleAct.active{border-color:rgba(0, 255, 255, 0.2);background-color:#173454;color:#b8faff}
.researchData{display:grid;gap:0;place-items:stretch;overflow:auto;width:100%;min-height:180px;max-height:calc(100vh - 300px);margin-top:0;border:1px solid rgba(184, 250, 255, 0.14);border-radius:0 0 14px 14px;background-color:rgba(4, 11, 24, 0.74);box-shadow:0 12px 28px rgba(0, 0, 0, 0.24);font-variant-numeric:tabular-nums}
.researchData::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19, 21, 24, 0.5)}
.researchData::-webkit-scrollbar-thumb{border:1px solid #00ffff;border-radius:3px;background-color:rgba(0, 255, 255, 0.45)}
.researchData::-webkit-scrollbar-track{border-radius:3px}
.researchData::-webkit-scrollbar-corner{background-color:transparent}
.researchData > span{display:flex;justify-content:flex-end;align-items:center;min-width:102px;min-height:40px;padding:8px 12px;border-right:1px solid rgba(184, 250, 255, 0.11);border-bottom:1px solid rgba(184, 250, 255, 0.11);color:#e8edf5;font-size:0.88rem;text-align:right;white-space:nowrap;transition:background-color 0.18s, color 0.18s}
.researchData > span:not(.researchDataLabel):hover{background-color:rgba(0, 255, 255, 0.09);color:#ffffff}
.researchDataLabel{position:sticky;top:0;z-index:2;justify-content:center!important;min-width:116px!important;background-color:rgba(17, 53, 91, 0.98);color:#b8faff!important;font-weight:500;text-align:center!important}
.researchDataLabel:first-child{left:0;z-index:3}
.researchDate{width:100%;min-width:110px;border:0;outline:0;background-color:transparent;color:#b8faff;font:inherit;text-align:center}
.researchDate::-webkit-calendar-picker-indicator{filter:invert(.8);cursor:pointer}
@media screen and (max-width:1200px){
    .researchAct{margin-left:0}
    .researchData{max-height:calc(100vh - 340px)}
}
@media screen and (max-width:768px){
    .deskTitle{padding-left:24px}
    .researchHead{align-items:stretch;gap:8px;padding:14px}
    .researchLabel{display:flex;align-items:center;flex:0 0 84px}
    .researchInfoText{flex:1 1 calc(100% - 92px);overflow:hidden;text-overflow:ellipsis}
    .researchAct{flex:1 1 100%;margin:4px 0 0}
    .researchNav{overflow-x:auto;padding:0}
    .toggleAct{flex:1 0 150px;min-width:150px;padding:10px 12px}
    .researchData{max-height:calc(100vh - 430px);border-radius:0 0 10px 10px}
    .researchData > span{min-width:92px;padding:7px 9px;font-size:0.84rem}
    .researchDataLabel{min-width:104px!important}
}
@media screen and (max-width:420px){
    .researchLabel{flex-basis:76px;font-size:0.84rem}
    .researchInfoText{flex-basis:calc(100% - 84px);font-size:0.84rem}
}
```

## 원본 JS 이벤트 핸들러

- (DOM 이벤트 핸들러 없음 — 렌더링 후 정적)

전체 로직은 `docs/research/fit.rfenms.com/assets/js/research.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/research.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
