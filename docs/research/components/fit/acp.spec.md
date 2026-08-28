# FitAcpPage Specification

## Overview
- **Route:** `/fit/acp`
- **Target file:** `src/app/(fit-app)/fit/acp/page.tsx`
- **원본:** https://fit.rfenms.com/acp.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/acp.html` · JS `docs/research/fit.rfenms.com/assets/js/acp.js`
- **`<title>`:** 시스템에어컨 관리
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/deskLib.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/acp.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <div class="kfeContent">
                <div class="kfeHead">
                    <span class="kfeHeadLabel">시스템에어컨 관리</span>
                    <span class="kfeHeadSub">
                        <span class="deskLabel">시스템에어컨</span>
                        <select class="eSelect" id="acpIdn">
                            <option value="0">설비 선택</option>
                        </select>
                    </span>
                </div>
                <div class="kfeBody">
                    <div class="frozen">
                        <div class="mapArea">
                            <div class="mapHead">
                                <span class="floorTitle" id="floorMapName"></span>
                            </div>
                            <div class="mapImageArea">
                                <img class="floorMapImage" id="floorMapImage" src="/assets/img/empty.png" alt="냉난방제어 도면"/>
                                <div class="mapPoints" id="floorMapPoints"></div>
                            </div>
                            <div class="mapDesk">
                                <span class="floorLabel" id="floorPlanName"></span>
                            </div>
                        </div>
                        <div class="deskArea">
                            <div class="inBody">
                                <span class="actConfig active" id="actConfig">설정 <i class="icon iconGear"></i></span>
                                <div>운전방식</div>
                                <div class="gaugeForm" id="acpPeakType">대기중</div>
                                <div class="tip" data-tip="목표 운전율 표시">희망운전율</div>
                                <div class="gaugeForm">
                                    <ul class="gaugeArea" id="acpRateHope">
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                    </ul>
                                    <span>0%</span>
                                </div>
                                <div class="tip" data-tip="ACP5는 우선순위 제어상태 일때만 표시됩니다.">현재운전율</div>
                                <div class="gaugeForm">
                                    <ul class="gaugeArea" id="acpRateCurrent">
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                    </ul>
                                    <span>0%</span>
                                </div>
                                <div class="tip" data-tip="미래에너지 서버와 ACP 서버 연결상태 표시">통신상태</div>
                                <div class="gaugeForm">
                                    <span class="statBad">나쁨</span>
                                    <ul class="gaugeArea" id="connStatGauge">
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                        <li class="gauge"></li>
                                    </ul>
                                    <span class="statGood">좋음</span>
                                </div>
                                <div>제어동작상태</div>
                                <div>
                                    <span class="disable tip"data-tip="피크제어 비활성 상태" data-name="정지" id="acpOperation">정지 (미제어)</span>
                                    <span class="tip" data-tip="피크제어가 진행중인 상태" data-name="운전">운전 (제어)</span>
                                </div>
                            </div>
                            <div class="deskTableBox lowBox">
                                <table class="desk" id="deskTable">
                                    <thead>
                                        <tr id="deskSort">
                                            <th>운전모드</th>
                                            <th>이름</th>
                                            <th>동작상태</th>
                                            <th>현재온도</th>
                                            <th>설정온도</th>
                                            <th>풍량</th>
                                        </tr>
                                    </thead>
                                    <tbody id="deskList">
                                        <tr>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
/*kfehead*/
.kfeHead{display:flex;align-items:center;gap:15px;width:100%;padding:0 15px 15px}
.kfeHeadLabel{margin:0;font-size:1.2rem;font-weight:500;white-space:nowrap}
.kfeHeadSub{overflow:hidden;width:100%;max-width:220px;min-width:170px;height:30px;padding:0 15px;border:1px solid #2c3540;border-radius:10px;background-color:#2c3540}
.kfeHeadSub:hover{border:1px solid #b8faff;background-color:rgba(6,65,255,0.1)}
.deskLabel{display:none}
.eSelect{width:100%;height:30px;border:0;background-color:transparent;color:#b8faff;font-size:1rem}
.eSelect option{background-color:#000}
.actConfig{display:flex;align-items:center;gap:5px;position:absolute;top:20px;right:2rem;color:white;cursor:pointer}
.actConfig:hover{color:#b8faff}
.iconGear{width:auto;height:auto;background:none}
.iconGear:before{content:'\f3e5';vertical-align:middle;font-family:'bootstrap-icons';font-style:normal}
/* kfeBody */
.kfeBody{background-color:rgba(3, 3, 5, 0.4);border-radius:20px}
.frozen{display:flex;gap:15px;padding:20px}
/*mapArea */
.mapArea{flex:0 0 50%;padding:20px;background-color:rgba(3, 3, 5, 0.4);border-radius:20px}
.mapHead{margin:1rem}
.floorTitle{color:#b4b4b4}
.mapImageArea{position:relative;background-color:rgba(3, 3, 5, 0.4);border-radius:20px}
.floorMapImage{width:100%;max-width:100%}
.mapPoints{position:absolute;top:0;left:0}
.mapDesk{margin:1rem;text-align:center}
.floorLabel{display:inline-block;padding:5px 20px;border-radius:1rem 0;background-color:rgba(1,87,155,.6);font-size:1.4rem;font-weight:600}
/* deskArea */
.deskArea{flex-grow:1;margin:0}
.inBody{display:grid;grid-template-columns:10rem 1fr;align-items:center;gap:1rem;flex-grow:1;position:relative;margin-bottom:15px;padding:20px;background-color:rgba(3, 3, 5, 0.4);border-radius:20px;color:#b8faff}
.gaugeForm{display:flex;gap:.4rem;align-items:center;color:#eee}
.gaugeArea{display:flex;gap:1px}
.gauge{list-style:none;width:.6rem;height:1.6rem;border-radius:.4rem;background-color:rgba(80,80,80,.6)}
.on{background-color:#afff7d}
.off{background-color:#ff005b}
.use{background-color:#0041ff}
.statBad{font-size:.9rem;color:#ff005b;font-weight:bold;text-align:center;white-space:nowrap}
.statGood{font-size:.9rem;color:#afff7d;text-align:center;white-space:nowrap}
/* deskTableBox */
.deskTableBox{overflow:auto;height:30rem;margin-top:15px}
.deskTableBox::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
.deskTableBox::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid #b8faff}
.deskTableBox::-webkit-scrollbar-track{border-radius:2px}
.deskTableBox::-webkit-scrollbar-corner{background-color:transparent}
.desk td{cursor:pointer}
.desk thead{position:sticky;top:0}
.desk thead th{height:40px;background-color:rgba(19,21,24,0.4);color:#00ffff}
.desk tbody td{height:40px;border-bottom:1px solid rgba(238,238,238,0.2)}
.desk tbody tr:hover td{background-color:rgba(217,217,217,.2);color:#fff}
/* modal */
.editTitle{margin:30px 0 10px;color:#fff;font-size:1.4rem;font-weight:600;text-align:center}
.gaugeForm .eInput{width:3rem;padding:.2rem;text-align:right}
.gaugeForm .eInput::-webkit-outer-spin-button,.gaugeForm .eInput::-webkit-inner-spin-button{-webkit-appearance:none}
.toggle{display:inline-block;position:relative;width:2.2rem;height:1.2rem;background-color:#2c3540;border-radius:.6rem;vertical-align:middle;cursor:pointer}
.toggle::before{content:"";position:absolute;top:.1rem;left:.1rem;width:1rem;height:1rem;background-color:#fff;border-radius:50%}
.toggle.active{background-color:#00ffff}
.toggle.active::before{left:auto;right:.1rem;background-color:#030305}
.eInput{width:100%;padding:.2rem 1rem;border:1px solid #5190a5;border-radius:5px;background-color:transparent;font-size:1rem}
.selectBox{padding:.2rem 1rem;border:1px solid #5190a5;border-radius:5px;background-color:transparent}
.eSelect{color:#eee}
.eSelect optgroup{background-color:#181818;color:#c8c8c8}
/* 기존데이터 */
.mapPoint{position:absolute;padding:2px;border:2px solid transparent;border-radius:.4rem;font-size:0;cursor:pointer}
.mapIcon{display:inline-block;width:.8rem;height:.8rem;border-radius:.2rem;background-color:#808080}
.mapStart .mapIcon{background-color:#4caf50}
.mapStop .mapIcon{background-color:#c2185b}
.mapRequest .mapIcon{background-color:#2196f3}
.mapFan .mapIcon{background-color:#43a047}
.mapPoint.active{border-color:#ffc107}
.mapPoint:hover{border-color:#ffc107}

.chips{display:inline-block;padding:.2rem 1rem;border-radius:.6rem;background-color:#808080;color:#fff}
.chipStart{background-color:#388e3c}
.chipStop{background-color:#c2185b}
.chipRequest{background-color:#2196f3}
.chipFan{background-color:#43a047}

.setArea{display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:center;padding:1rem 2rem;margin:1rem;border-radius:1rem;box-shadow:inset 3px 3px 3px 0 rgba(0,0,0,.4);background-color:rgba(0,0,0,.2)}
.setLabel{flex:0 0 50%;font-size:1.2rem}
.setItems{display:flex;;gap:1rem}
.setItemAct{display:inline-block;position:relative;width:8rem;padding:.6rem 0;background:linear-gradient(to bottom, #000, #303030);border-radius:1rem;color:#606060;font-weight:600;text-align:center;cursor:pointer}
.setItemAct:after{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;background-clip:padding-box;border:2px solid transparent;background-image:linear-gradient(to top, #000, #303030);line-height:200%;content:attr(data-alt)}
.setItemAct.active{background:linear-gradient(to bottom, #64b5f6, #1a237e);color:#fff}
.setItemAct.active:after{background-image:linear-gradient(to top, #64b5f6, #1a237e)}
.setItemAct:active{transform:scale(.96)}

.setAreaList{position:relative;padding:1rem 0}
.waitControlBox{display:flex;justify-content:center;align-items:center;position:absolute;top:0;left:0;width:100%;height:100%;border-radius:1rem;background-color:rgba(0,0,0,.6)}
.waitCircle{display:flex;justify-content:center;align-items:center;position:relative}
.waitCircleIcon{position:absolute;width:2rem;height:2rem;border:3px solid #8bc34a;border-radius:50%;border-top-color:transparent}
.waitCircleText{}
.waitText{margin-left:2rem;color:#8bc34a}

.menuName{vertical-align:middle}

.inArea{display:flex;flex-direction:column;box-shadow:0 0 .6em .4rem rgba(0,0,0,.4)}
.inHead{padding:.8rem 1rem .6rem;border-radius:.6rem .6rem 0 0;background-color:rgba(13,71,161,.4);font-size:1rem;text-shadow:2px 2px #000}

@media screen and (max-width:1330px){
    .deskArea .inBody{grid-template-columns:90px 1fr}
}
@media screen and (max-width:1170px){
    .frozen{flex-direction:column}
    .deskArea .inBody{grid-template-columns:90px 1fr 90px 1fr;padding:40px 20px}
}
@media screen and (max-width:910px){
    .deskArea .inBody{grid-template-columns:90px 1fr}
    .editTitle{margin:20px 0}
    .editForm{grid-template-columns:1fr 2fr}
    .editFormExtend{grid-column:auto}
    .eInput{width:100%;font-size:1rem}
    .eSelect{width:100%;font-size:1rem}
    .eInputFull{width:100%}
    .desk{min-width:auto}
    .deskTableBox{overflow:auto}
    .deskTableBox::-webkit-scrollbar{width:8px;height:8px;background-color:rgba(19,21,24,0.5)}
    .deskTableBox::-webkit-scrollbar-thumb{border-radius:2px;background:rgba(0,255,255,0.5);border:1px solid #b8faff}
    .deskTableBox::-webkit-scrollbar-track{border-radius:2px}
    .deskTableBox::-webkit-scrollbar-corner{background-color:transparent}

}
@media screen and (max-width:768px){
    .modalContent{height:calc(100vh - 200px)}
    .kfeHeadSub{max-width:100%}
}
@media screen and (max-width:560px){
    .modalContent .inBody{grid-template-columns:90px 1fr}
}
@media screen and (max-width:500px){
    .deskArea .inBody{grid-template-columns:1fr}
    .deskArea .gauge{width:calc(100vw / 20 - 10px)}
    .kfeHead{flex-direction:column;padding:0;text-align:start}
    .kfeHeadLabel{width:100%;padding-left:15px}
    .HeadLft{margin:0}
    .actConfig{padding:5px;right:20px}
    .modalContent .inBody{grid-template-columns:1fr}
}
@media screen and (max-width:360px){
    .HeadLft{flex-wrap:wrap;gap:0}
    .editTitle{font-size:1.2rem}
    .kfeHeadSub{max-width:100%}
    .modalContent .gauge{width:calc(100vw / 20 - 9px)}
}
```

## 원본 JS 이벤트 핸들러

- `modalActClose` → **click**
- `modal` → **click**
- `modalFanActClose` → **click**
- `modalFan` → **click**
- `actConfig` → **click**
- `acpStatPeak` → **click**
- `acpIdn` → **change**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/acp.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/acp.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
