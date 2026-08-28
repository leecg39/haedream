# fit.rfenms.com — Behaviors

출처: `assets/js/base.js` (공통) + 페이지별 JS. 전부 소스 확인값이며 추정 없음.

## 1. 모바일 메뉴 토글 — click

**트리거:** `.topArea .mobileIcon` 클릭 (base.js `_mobileMenuClickHandler`)

한 번의 클릭에서 6개 요소가 동시에 토글된다:

| 요소 | 토글 클래스 | 효과 |
|------|-------------|------|
| `.topArea .mobileIcon` | `active` | 햄버거 → X (line 회전) |
| `.mobileOverlay` | `active` | `visibility:hidden;opacity:0` → `visible;opacity:1` |
| `.mobileNavbg` | `active` | 260px 패널 노출 |
| `.leftNav` | `mobileActive` | `display:none` → `display:block`, 우측 250px 고정 |
| `.topRightArea` | `mobileActive` | `ul.topBtn` display:block, z-1031 |
| `.bdRight` | `active` | `visibility:hidden` → `visible` |

**트랜지션:** `.mobileOverlay { transition: all 0.2s }`, `.mobileIcon .line{,::before,::after} { transition: all 0.2s }`

**1340px 초과에서는 `.mobileIcon` 이 `visibility:hidden;opacity:0;position:absolute` 라 클릭 불가.**

## 2. 좌측 내비 활성 항목 — click

`.leftNav .navLi` 클릭 시 기존 `.navLi.active` 를 해제하고 자신을 토글.
현재 메뉴는 1개(`#peak`)뿐이라 실질적으로 항상 열려 있다.

`li.active .d2Nav { display:block; max-height:100vh }` — 비활성 시 `overflow:hidden`.

## 3. 환경설정 드롭다운 — hover + click

**트리거:** `.tb-set` 에 `mouseenter` **또는** `click` → `.tbSetNav { display:block }`
**해제:** `.tb-set` `mouseleave` → `display:none`. 단 `.tbSetNav` 자체에 `mouseenter` 하면 다시 표시(마우스가 메뉴로 이동해도 안 닫힘).

JS가 인라인 `style.display` 를 직접 조작한다. CSS 트랜지션 없음 — 즉시 표시/숨김.

## 4. 내비 링크 상태

| 상태 | color | text-shadow |
|------|-------|-------------|
| 기본 | `#c6c6c6` | 없음 |
| hover (비활성) | `#97b1ff` | `2px 2px 0 rgba(0,65,255,.4)` 4방향 |
| active (`a.active`) | `#00ffff` | `4px 4px 0 rgba(0,65,255,.4)` 4방향 |

`li:hover:not(.active)` 에서 `background-color:transparent`, `.d2Nav li a:hover` 는 `background-color:rgba(3,3,5,0.6)`.

**전환:** `ul.d1 li { transition: all 0.2s }`

## 5. 콘텐츠 표시 게이트 — 데이터 로드 후

전 페이지의 `main` 이 `class="contents disable"` 로 시작한다.
`.disable { display:none !important }` 이므로 **초기 렌더에서 본문이 숨겨져 있다가**
API 응답 후 JS가 `disable` 을 제거해 노출된다. 좌측 `nav#navigation` 도 동일.

클론에서는 로딩 상태 → 데이터 준비 완료 전환으로 재현한다.

## 6. 실시간 시계 — timer

`#ymd`(날짜) / `#dtime`(시각) 을 타이머로 갱신. `.num` 클래스에
`font-family:"Open Sans"; font-variant-numeric:tabular-nums` 가 걸려 숫자 폭이 고정된다.

`main.contents` 자체에도 `font-variant-numeric: tabular-nums` 가 적용되어 있어
표/게이지의 숫자가 갱신돼도 폭이 흔들리지 않는다. **클론에서 반드시 유지할 것.**

## 7. 상단 상태 배지 — 4개 중 1개만 노출

`#currentStatus` 의 `li` 4개가 전부 `.disable` 로 시작하고, 피크 상태에 따라 하나만 해제된다.

| 클래스 | 문구 | 배경 |
|--------|------|------|
| `.badbad` | 주의요함 — 이번주는 피크관리에 각별한 관심이 필요합니다! | `#ce1616` |
| `.bad` | 관심필요 — 이번주 피크 횟수가 평균을 초과하였습니다. | (그라디언트, 원본 오타로 미적용) |
| `.normal` | 보통 — 이번주 피크현황이 안정적입니다. | `linear-gradient(0.25turn,#0041ff,#00ffff)` |
| `.good` | 좋아요! — 이번주 에너지 사용이 원활합니다. | `linear-gradient(0.25turn,#00ff77,#0041ff)` |

폭: `calc(100vw - 920px - 6vh)`, `min-width:280px`, `height:30px`, `border-radius:20px`, `color:#030305`, `font-size:14px`, `font-weight:bold`.

> `.bad` 는 원본이 `background-color: linear-gradient(...)` 로 잘못 써서 실제로는 배경이 적용되지 않는다. 클론에서도 원본 동작을 그대로 재현한다.

## 8. 새로고침 / 로그아웃

- `.tb-refresh a` → `onclick="location.reload(true)"`
- `.tb-logout#appLogout` → 토큰 삭제 후 login.html 이동

## 9. 스크롤 관련

**스무스 스크롤 라이브러리 없음.** Lenis / Locomotive 미사용, `scroll-snap` 없음,
`animation-timeline` 없음, IntersectionObserver 기반 진입 애니메이션 없음.
`.leftNav nav` 만 `overflow-y:auto` + 스크롤바 숨김(`scrollbar-width:none`, `::-webkit-scrollbar{display:none}`).

→ **이 사이트의 인터랙션 모델은 전부 click / hover / timer 기반이며 scroll-driven 요소가 없다.**

## 10. 페이지별 추가 인터랙션

| 페이지 | 인터랙션 |
|--------|----------|
| login | 아이디저장 체크박스(localStorage), 로그인 실패 시 `.toastArea` 토스트(red) |
| firm | 행 클릭 → `#modal` 상세, 지도 버튼 → `#kakaoMapModal` |
| acp | 평면도 포인트 클릭 → `#modal` / `#modalFan` 제어 팝업 |
| peak | 검침일 기준 스위치(`#isMeterDate`), 알림 스위치(`#peakMediaAlarm`) |
| powerUsage / peakUsage / peakHis / controlHis / report | tui-date-picker 기간 선택 → 재조회, XLSX 내보내기 |
| stat | 페이지네이션(`#deskPages`), 카카오맵 마커 클릭 → `#peakDetailWrap` |
