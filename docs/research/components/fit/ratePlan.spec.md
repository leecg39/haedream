# FitRatePlanPage Specification

## Overview
- **Route:** `/fit/rate-plan`
- **Target file:** `src/app/(fit-app)/fit/rate-plan/page.tsx`
- **원본:** https://fit.rfenms.com/ratePlan.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/ratePlan.html` · JS `docs/research/fit.rfenms.com/assets/js/ratePlan.js`
- **`<title>`:** 전기 요금 비교
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/ratePlan.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: echarts.min, tui-date-picker, tom-select.complete.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <div class="topTitle">
                <h1 class="deskTitle">전기 요금 비교</h1>
            </div>
            <div class="deskTool">
                <label for="ratePlan1" class="deskLabel">요금제1</label>
                <select class="selectbox" id="ratePlan1">
                    <option value="">요금제 선택</option>
                    <option value="IEHAS1">산업용(을)고압A 선택I</option>
                    <option value="IEHAS2">산업용(을)고압A 선택II</option>
                    <option value="IEHAS3">산업용(을)고압A 선택III</option>
                    <option value="IEHBS1">산업용(을)고압B 선택I</option>
                    <option value="IEHBS2">산업용(을)고압B 선택II</option>
                    <option value="IEHBS3">산업용(을)고압B 선택III</option>
                    <option value="IEHCS1">산업용(을)고압C 선택I</option>
                    <option value="IEHCS2">산업용(을)고압C 선택II</option>
                    <option value="IEHCS3">산업용(을)고압C 선택III</option>
                    <option value="IGHAS1">산업용(갑)II고압A 선택I</option>
                    <option value="IGHAS2">산업용(갑)II고압A 선택II</option>
                    <option value="IGHBS1">산업용(갑)II고압B 선택I</option>
                    <option value="IGHBS2">산업용(갑)II고압B 선택II</option>
                    <option value="IGL1">산업용(갑)I 저압</option>
<!--                    <option value="EHAS2">일반용전력(을)-고압A-선택II</option>-->
<!--                    <option value="GL1">일반용전력(갑I)-저압</option>-->
                </select>
                <label for="ratePlan2" class="deskLabel">요금제2</label>
                <select class="selectbox" id="ratePlan2">
                    <option value="">요금제 선택</option>
                    <option value="IEHAS1">산업용(을)고압A 선택I</option>
                    <option value="IEHAS2">산업용(을)고압A 선택II</option>
                    <option value="IEHAS3">산업용(을)고압A 선택III</option>
                    <option value="IEHBS1">산업용(을)고압B 선택I</option>
                    <option value="IEHBS2">산업용(을)고압B 선택II</option>
                    <option value="IEHBS3">산업용(을)고압B 선택III</option>
                    <option value="IEHCS1">산업용(을)고압C 선택I</option>
                    <option value="IEHCS2">산업용(을)고압C 선택II</option>
                    <option value="IEHCS3">산업용(을)고압C 선택III</option>
                    <option value="IGHAS1">산업용(갑)II고압A 선택I</option>
                    <option value="IGHAS2">산업용(갑)II고압A 선택II</option>
                    <option value="IGHBS1">산업용(갑)II고압B 선택I</option>
                    <option value="IGHBS2">산업용(갑)II고압B 선택II</option>
                    <option value="IGL1">산업용(갑)I 저압</option>
<!--                    <option value="EHAS2">일반용전력(을)-고압A-선택II</option>-->
<!--                    <option value="GL1">일반용전력(갑I)-저압</option>-->
                </select>
            </div>
            <div class="sheetArea">
                <table class="sheet" id="planTable">
                    <thead>
                        <tr>
                            <th>계절</th>
                            <th>부하구분</th>
                            <th id="ratePlan1Name">요금제1</th>
                            <th id="ratePlan2Name">요금제2</th>
                            <th>절감액</th>
                            <th>절감률</th>
                        </tr>
                    </thead>
                    <tbody id="hoursList">
                        <tr>
                            <th rowspan="3">여름철</th>
                            <td>경부하</td>
                            <td data-cost="plan1CostLS">0</td>
                            <td data-cost="plan2CostLS">0</td>
                            <td data-cost="costLSGap">0</td>
                            <td data-cost="costLSRate">0</td>
                        </tr>
                        <tr>
                            <td>중부하</td>
                            <td data-cost="plan1CostMS">0</td>
                            <td data-cost="plan2CostMS">0</td>
                            <td data-cost="costMSGap">0</td>
                            <td data-cost="costMSRate">0</td>
                        </tr>
                        <tr>
                            <td>최대부하</td>
                            <td data-cost="plan1CostHS">0</td>
                            <td data-cost="plan2CostHS">0</td>
                            <td data-cost="costHSGap">0</td>
                            <td data-cost="costHSRate">0</td>
                        </tr>
                        <tr>
                            <th rowspan="3">봄·가을철</th>
                            <td>경부하</td>
                            <td data-cost="plan1CostLF">0</td>
                            <td data-cost="plan2CostLF">0</td>
                            <td data-cost="costLFGap">0</td>
                            <td data-cost="costLFRate">0</td>
                        </tr>
                        <tr>
                            <td>중부하</td>
                            <td data-cost="plan1CostMF">0</td>
                            <td data-cost="plan2CostMF">0</td>
                            <td data-cost="costMFGap">0</td>
                            <td data-cost="costMFRate">0</td>
                        </tr>
                        <tr>
                            <td>최대부하</td>
                            <td data-cost="plan1CostHF">0</td>
                            <td data-cost="plan2CostHF">0</td>
                            <td data-cost="costHFGap">0</td>
                            <td data-cost="costHFRate">0</td>
                        </tr>
                        <tr>
                            <th rowspan="3">겨울철</th>
                            <td>경부하</td>
                            <td data-cost="plan1CostLW">0</td>
                            <td data-cost="plan2CostLW">0</td>
                            <td data-cost="costLWGap">0</td>
                            <td data-cost="costLWRate">0</td>
                        </tr>
                        <tr>
                            <td>중부하</td>
                            <td data-cost="plan1CostMW">0</td>
                            <td data-cost="plan2CostMW">0</td>
                            <td data-cost="costMWGap">0</td>
                            <td data-cost="costMWRate">0</td>
                        </tr>
                        <tr>
                            <td>최대부하</td>
                            <td data-cost="plan1CostHW">0</td>
                            <td data-cost="plan2CostHW">0</td>
                            <td data-cost="costHWGap">0</td>
                            <td data-cost="costHWRate">0</td>
                        </tr>
                        <tr>
                            <th>평균</th>
                            <td></td>
                            <td data-cost="plan1Sum">0</td>
                            <td data-cost="plan2Sum">0</td>
                            <td data-cost="planFrugal">0</td>
                            <td data-cost="planFrugalRate">0</td>
                        </tr>
                    </tbody>
                </table>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

```css
.deskTool{display:flex;align-items:center;gap:15px;padding:15px 20px;background:linear-gradient(rgba(0, 0, 29, 0.6), rgba(0, 0, 29, 0.6)), rgba(3, 3, 5, 0.4);border-radius:20px 20px 0 0;text-align:center}
.deskLabel{color:#b8faff;white-space:nowrap}
.sheetArea{border-radius:0 0 20px 20px}
.sheet{table-layout:fixed;width:100%}
.sheet th{padding:.5rem 5px;border:1px solid rgba(238,238,238,0.2);background-color:transparent;color:#00ffff;font-size:0.98rem;font-weight:400;white-space:nowrap}
.sheet td{padding:.5rem 5px;border-bottom:1px solid rgba(238,238,238,0.2);border-right:1px solid rgba(238,238,238,0.2);color:#eee;font-size:0.98rem;text-align:center}
.mTBlock{display:flex;align-items:center;}
.selectbox option{background:linear-gradient(rgba(0, 0, 29, 0.6), rgba(0, 0, 29, 0.6)), rgba(3, 3, 5, 0.4)}
```

## 원본 JS 이벤트 핸들러

- `ratePlan1` → **change**
- `ratePlan2` → **change**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/ratePlan.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/rate-plan.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
