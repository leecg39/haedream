# fit.rfenms.com — Page Topology

기준: https://fit.rfenms.com · 수집일 2026-08-28 · 소스 미러 `docs/research/fit.rfenms.com/`

## 사이트 성격

- 정적 HTML + jQuery + 바닐라 JS (빌드 시스템 없음)
- 15개 페이지 전부 **동일한 셸**을 공유하고, `main` 안쪽만 페이지별로 다름
- 데이터는 전부 `https://watt.rfenms.com/api/*` 에서 fetch (base.js `_apiUrl`)
- 차트: amCharts4 (`core.js`/`charts.js`) + ECharts, 셀렉트: tom-select, 날짜: tui-date-picker

## 공통 셸 (전 페이지 동일)

```
body#dashboard                     ← 배경 lowbg.png, fixed, cover
  .mobileOverlay                   ← 모바일 메뉴 오버레이 (기본 hidden)
    .mobileBg                      ← rgba(0,0,0,0.4)
    .mobileNavbg                   ← 260px, backdrop-blur(4px)
  .container                       ← flex row, min-height 100vh
    .bdRight#leftnav               ← fixed, 200px, 98vh, blur(4px), radius 20px
      └ include/leftnav.html       ← 로고 + 14개 메뉴
    .contentsArea                  ← calc(100% - 200px), margin-left calc(200px + 1vh)
      .topBar#topBar               ← fixed, z-1999, bg #030305, radius 0 0 20px 20px
        └ include/top.html         ← 업체셀렉트 · 상태배지 · 시계 / 새로고침 · 환경설정 · 로그아웃
      main.contents#contentsArea   ← margin-top 80px, padding 1rem 2rem 1rem 1rem
        └ 페이지별 콘텐츠
```

`login.html`만 예외: `body.logBody` + `.loginArea > .loginBox`, 셸 없음.

## 페이지 목록

| # | 라우트 | 원본 | 타이틀 | main 클래스 | 주요 위젯 |
|---|--------|------|--------|-------------|-----------|
| 0 | `/fit/login` | login.html | 한국미래에너지 | (셸 없음) | 로그인 폼 |
| 1 | `/fit/stat` | stat.html | 통합관제 | `contents` | 카카오맵 · 랭킹차트 · 페이지네이션 |
| 2 | `/fit/firm` | firm.html | 업체관리 | `contents` | 데스크 테이블 · 모달 · 카카오맵 모달 |
| 3 | `/fit/research` | research.html | 한전데이터 수집 | `contents` | 수집 헤드 + 데이터 테이블 |
| 4 | `/fit/peak` | peak.html | 피크상태 | `peakGrid contents` | 피크게이지 · 실시간차트 · 상태/포인트/절감액 |
| 5 | `/fit/peak-panel` | peakPanel.html | 부하 상황판 | `contents` | 전광판형 부하 표시 (JS 전량 생성) |
| 6 | `/fit/peak-set` | peakSet.html | 피크 제어설정 | `contents` | 제어 설정 폼 |
| 7 | `/fit/peak-his` | peakHis.html | 피크 그래프 | `contents` | `#chart1` amCharts |
| 8 | `/fit/power-usage` | powerUsage.html | 전력 사용 보고서 | `contents` | 날짜피커 + 보고서 테이블 |
| 9 | `/fit/peak-usage` | peakUsage.html | 피크 15분 전력보고서 | `contents` | `#chart1` + 15분 단위 테이블 |
| 10 | `/fit/control-his` | controlHis.html | 피크제어이력 | `contents` | `#chart1` + 데스크 테이블 |
| 11 | `/fit/acp` | acp.html | 시스템에어컨 관리 | `contents` | 평면도 포인트 · 게이지 · 제어 모달 |
| 12 | `/fit/rate-plan` | ratePlan.html | 전기 요금 비교 | `contents` | 요금제 비교 표 |
| 13 | `/fit/reduce` | reduce.html | 저압 절감 분석 | `contents` | 도넛게이지 · 절감액 · 비교 박스 |
| 14 | `/fit/report` | report.html | 저압 절감 보고서 | `contents` | `#chart1` + 절감 금액 표 |

## 좌측 내비게이션

`include/leftnav.html` — 단일 `li.navLi.active#peak` 안에 `ul.d2` 14개 항목.
`stat` / `firm` / `research` 3개는 기본 `.disable`(숨김)이고 권한에 따라 해제됨:

- `#stat` → `vio.isGroup(fid)` 가 true일 때만 노출
- `#firm` → `localStorage.permit > 0` **AND** `fid === 1`
- `#research` → `localStorage.permit > 0`

클론에서는 데모 목적상 14개 전부 노출하되 권한 플래그를 prop으로 유지한다.

## z-index 레이어

| 레이어 | z-index |
|--------|---------|
| `.bdRight` (좌측 내비) | 2000 |
| `.topBar` | 1999 |
| `.bdRight` (≤1340px) | 1998 |
| `.leftNav` | 1031 |
| `.d2Nav` | 1050 |
| `.mobileOverlay` | 100 |

## 반응형 브레이크포인트

| 폭 | 변화 |
|----|------|
| **1340px** | 좌측 내비 `display:none` → 햄버거 노출, `.topBar` full-width, `.contentsArea` margin-left 0, `#contentsArea` margin-top 70px |
| 768px | `main.contents` padding 1rem, 업체 셀렉트 220px→160px |
| 480px 이하 | 페이지별 세부 조정 (각 CSS 참조) |

## 자산 배치

원본 상대경로를 그대로 유지하기 위해 `public/fit/assets/` 아래에 미러링:

```
public/fit/assets/css/   17개 (common + 페이지별 + lib 3개)
public/fit/assets/js/    참조용 (React로 대체, 번들 안 함)
public/fit/assets/img/   lowbg.png, loginbg.jpg, icons.png, 로고 5종
public/fit/assets/fonts/ Pretendard Variable, Open Sans 3종, bootstrap-icons
```

`common.css` 의 `url(../img/…)` / `url(../fonts/…)` 상대경로가 그대로 해석된다.
watt 클론의 `public/assets/` 와는 **전 파일이 다름** — 절대 공유하지 말 것.
