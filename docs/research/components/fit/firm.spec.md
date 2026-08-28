# FitFirmPage Specification

## Overview
- **Route:** `/fit/firm`
- **Target file:** `src/app/(fit-app)/fit/firm/page.tsx`
- **원본:** https://fit.rfenms.com/firm.html
- **원본 소스:** `docs/research/fit.rfenms.com/pages/firm.html` · JS `docs/research/fit.rfenms.com/assets/js/firm.js`
- **`<title>`:** 업체관리
- **`<main>` className:** `contents` · id `contentsArea`
- **Interaction model:** click / hover / timer 기반. **scroll-driven 요소 없음** (사이트 전역 확인 완료)

## 로드해야 할 스타일시트

공통 `common.css` 는 root layout 이 이미 로드한다. 이 페이지는 추가로:

- `<link rel="stylesheet" href="/fit/assets/css/tom-select.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/tui-date-picker.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/deskLib.css" precedence="default" />`
- `<link rel="stylesheet" href="/fit/assets/css/firm.css" precedence="default" />`

원본이 쓰는 JS 라이브러리: tom-select.complete.min, tui-date-picker, xlsx.full.min

## 원본 `<main>` 마크업 (그대로 JSX 변환할 것)

아래는 원본 HTML 에서 추출한 `<main>` 내부 전문이다. **클래스명·id·텍스트를 하나도 바꾸지 말 것.**
CSS 가 이 클래스명에 정확히 의존하므로 이름을 바꾸면 스타일이 전부 깨진다.

```html

            <h1 class="deskTitle">업체관리</h1>
            <div class="sheetArea">
                <div class="deskStat">
                    <div class="deskLimit">
                        <span class="deskLabel" id="deskLimit">1 - 5 / 5</span>
                    </div>
                    <div class="deskTool" id="deskTool">
                        <span class="deskAct act" data-act="add">추가</span>
                        <span class="deskAct act" data-act="excel">엑셀</span>
                        <span class="deskAct act" data-act="print">프린트</span>
                        <a href="power.html" target="_blank" class="deskAct act" id="chargeLink">요금표</a>
                        <a href="research.html" target="_blank" class="deskAct act" id="researchLink">한전수집</a>
                    </div>
                    <div class="deskPages">
                        <select class="eSelect serviceType" id="serviceType" style="width:auto;height:40px">
                            <option value="0">서비스상태 선택</option>
                            <option value="1">EMS</option>
                            <option value="2">피크</option>
                            <option value="3">저압 완료</option>
                            <option value="11">EMS 준비</option>
                            <option value="12">피크 준비</option>
                            <option value="13">저압 준비</option>
                            <option value="21">EMS 제안</option>
                            <option value="22">피크 제안</option>
                            <option value="23">저압 제안</option>
                        </select>
                        <span class="deskSearch">
                            <input class="deskInput" id="deskInput" maxlength="16"/>
                            <i class="icon iconSearch"></i>
                        </span>
                    </div>
                </div>
                <div class="deskArea">
                    <table class="desk disable" id="deskTable">
                        <thead>
                            <tr id="deskSort">
                                <th class="sort" data-sort="fid">ID</th>
                                <th class="sort" data-sort="firmName">이름</th>
                                <th class="sort" data-sort="contract">전력타입</th>
                                <th class="sort" data-sort="kepcoNo">한전고객번호</th>
                                <th>EOI</th>
                                <th>PCT</th>
                                <th>최근전력</th>
                                <th>목표전력</th>
                                <th>운전모드</th>
                                <th>제어방식</th>
                                <th>활성</th>
                                <th>서비스</th>
                                <th data-sort="registTime">메모</th>
                            </tr>
                        </thead>
                        <tbody id="deskList">
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
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                    <table class="desk disable" id="lowDeskTable">
                        <thead>
                            <tr id="lowDeskSort">
                                <th class="sort" data-sort="fid">ID</th>
                                <th class="sort" data-sort="firmName">이름</th>
                                <th class="sort" data-sort="registTime">업체등록일</th>
                                <th class="sort" data-sort="contract">전력타입</th>
                                <th class="sort" data-sort="kepcoNo">한전고객번호</th>
                                <th class="sort" data-sort="frugal">연간절감금액</th>
                                <th>적용전력</th>
                                <th>최근 5개년 피크</th>
                                <th>1차/2차 구분</th>
                                <th>서비스</th>
                                <th>메모</th>
                            </tr>
                        </thead>
                        <tbody id="lowDeskList">
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
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="deskStat">
                    <div class="deskLimit">
                        <span class="deskLabel" id="deskStat">1 - 5 / 5</span>
                    </div>
                    <div class="deskPages" id="deskPages">
                        <span class="deskPage act">prev</span>
                        <span class="deskPage act active">1</span>
                        <span class="deskPage act">next</span>
                    </div>
                </div>
            </div>
```

## 이 페이지 전용 CSS (원문 그대로 — 값 추정 금지)

이 페이지는 전용 CSS 가 없고 `common.css` 만 사용한다.

## 원본 JS 이벤트 핸들러

- `kakaoMapSearch` → **keyup**
- `kakaoMapSearch` → **change**
- `deskInput` → **keyup**
- `modalActClose` → **click**
- `modal` → **click**
- `serviceType` → **change**
- `edit-contract` → **focus**

전체 로직은 `docs/research/fit.rfenms.com/assets/js/firm.js` 참조.

## 데이터

원본은 `https://watt.rfenms.com/api/*` 에서 fetch 한다. 클론은 **데모용 목 데이터**를 쓴다.
목 데이터는 이 페이지 컴포넌트 파일 안이 아니라 `src/lib/fit-mocks/firm.ts` 에 분리한다.

## 초기 표시 게이트

원본 `<main>` 은 `class="contents disable"` 로 시작해 API 응답 후 `disable` 이 제거된다.
클론은 목 데이터를 즉시 쓰므로 **`disable` 클래스를 붙이지 않는다**(`className="contents"`).

## Responsive Behavior

- **>1340px:** 좌측 내비 고정 200px, `.contentsArea` margin-left `calc(200px + 1vh)`
- **≤1340px:** 좌측 내비 숨김 + 햄버거, `.topBar` full width, `#contentsArea` margin-top 70px
- **≤768px:** `main.contents` padding 1rem
- 이 페이지 전용 미디어쿼리는 위 CSS 블록 안에 포함되어 있다 — 그대로 적용된다
