# 대시보드 화면 명세

## 기준

- 페이지: `/main.html`
- 기준 이미지: `docs/design-references/watt.rfenms.com/main-reference-desktop-1920-full.png`
- 확인 뷰포트: 1920×900, 768×900, 390×844
- 글꼴: `"Pretendard Variable", Pretendard, -apple-system, "Apple SD Neo Gothic", sans-serif`
- 차트: ECharts

## DOM 계층

```text
body#dashboard.darkmode
├─ .mobileOverlay
│  ├─ .mobileBg
│  └─ .mobileNavbg
└─ .container
   ├─ #leftnav.bdRight
   │  └─ .leftNav
   │     ├─ .leftLogo
   │     └─ nav > ul.d1
   └─ .contentsArea
      ├─ #topBar.topBar
      │  └─ .topArea
      └─ #contentsArea.widgetArea.widget5
         └─ article#widget{n}.dashWidget
            ├─ .title
            └─ .contents
```

## 페이지 셸

- 배경: `#0e0d2c`에서 우측 `#00319b`로 향하는 45도 선형 그라데이션, fixed.
- 좌측 내비게이션:
  - 데스크톱 고정 폭 200px, 최소 높이 100vh, 배경 `#0e0d2c`.
  - 로고 영역 높이 60px.
  - 메뉴는 1px 반투명 구분선, 선택 메뉴 `#1d2054`, 선택 텍스트/아이콘 `#7ec8ff`.
- 상단 바:
  - 데스크톱 높이 60px, 좌측 오프셋 200px, 콘텐츠 폭 `calc(100% - 200px)`.
  - 고정 위치, z-index 1999, 좌우 패딩 35px.
  - 업체 선택, 상태 문구, 현재 시각, 설정/새로고침/도움말 버튼을 표시.
- 본문:
  - 데스크톱 좌측 여백 200px, 상단 여백 60px.
  - 모바일에서는 좌측 여백 제거, 상단 여백 70px.

## 위젯 그리드

- 기본: 5열 균등 그리드.
- 패딩 35px, 열 간격 24px, 행 간격 28px.
- 위젯은 API `/api/widgets/{fid}`의 `seq` 오름차순으로 배치하고 `isNot: "1"` 항목은 숨김.
- 현재 대산금속 fixture 기준 표시 위젯 수는 34개.

### 반응형

| CSS 뷰포트 | 열 수 | 셸 변화 |
|---|---:|---|
| 1721px 이상 | 5 | 좌측 내비게이션 표시 |
| 1501–1720px | 4 | 좌측 내비게이션 표시 |
| 1151–1500px | 3 | 좌측 내비게이션 표시 |
| 651–1150px | 2 | 1000px 이하에서 내비게이션 숨김, 상단 70px |
| 650px 이하 | 1 | 카드 폭을 본문 폭에 맞춤 |

- 768px 실측: 2열, 카드 폭 357px, 좌측 내비게이션 숨김.
- 390px 실측: 1열, 카드 폭 360px, 좌우 본문 패딩 15px.

## 위젯 카드

- 높이 440px, 패딩 18px.
- 배경 `rgba(124, 169, 243, 0.07)`.
- 테두리 `1px solid rgba(255, 255, 255, 0.2)`.
- 모서리 18px, 그림자 `5px 5px 20px rgba(0, 0, 0, 0.2)`.
- 내부 넘침 숨김, 숫자는 tabular-nums.
- 제목:
  - 높이 50px, 하단 여백 20px, 하단 패딩 10px.
  - 제목 20px/500, 흰색.
  - 구분선 `rgba(255,255,255,0.3)`.
- 상세 버튼:
  - 70px, 패딩 8px 10px, 13px, 반경 4px.
  - 기본 테두리 `rgba(255,255,255,0.3)`, hover 시 `rgba(255,255,255,0.5)` 및 흰색.
- 핵심 수치는 노랑, 상승은 빨강, 하락은 파랑, 보조 수치는 연한 하늘색으로 구분.
- 실시간 카드의 시간 진행 바는 보라→하늘색 이미지와 2초 점멸 애니메이션을 사용.
- 상태/환경 위젯은 파랑·초록·보라 그라데이션 배경으로 강조.

## 주요 상태와 상호작용

- `.wTab` 선택 시 그래프/표 보기를 전환하고 선택 탭을 `#2062bf`로 강조.
- `.wBtnMore`는 연결된 상세 페이지로 이동.
- 좌측 1차 메뉴는 선택/hover 배경과 텍스트 색을 변경하고 2차 메뉴를 펼침.
- 1000px 이하에서 햄버거 버튼을 표시:
  - 버튼 클릭 시 `.mobileIcon.active`, `.leftNav.mobileActive`, `.mobileOverlay.active`.
  - 우측 300px 오버레이 패널과 260px 내비게이션이 나타남.
  - 배경 클릭 또는 닫기 버튼으로 원상 복귀.
- 데이터 없음 상태는 카드 골격을 유지하고 안내 문구나 0 값을 표시.

## 데이터 계약

- `/api/widgets/{fid}`: 노출 여부와 순서.
- `/api/mains/{fid}`: 피크, 전력량, 요금, 설비, ESG, 가스 및 공정 데이터.
- `/api/stars/{fid}` 등: 차트 시계열.
- 인증 fixture의 업체 ID는 121이며, 업체명은 대산금속.

## 사용 에셋

- `/assets/img/logo.png`, `/assets/img/favicon.ico`
- `/assets/img/timebar.png`
- Pretendard 및 Open Sans 로컬 웹폰트
- Remix Icon 로컬 폰트
- ECharts, Select2, TUI Date Picker

## 확인 결과

- 1920px: 5열과 34개 위젯 전체 렌더링 확인.
- 768px: 2열 전환 및 햄버거 노출 확인.
- 390px: 1열 전환, 모바일 메뉴 열림/닫힘 클래스 확인.
- 참고 화면과 동일한 메뉴 구조, 카드 순서, 색상, 차트 유형, 강조 카드 구성을 사용.
- 실시간 시각과 시간대별 집계 값은 현재 시각에 따라 참고 이미지의 숫자와 달라질 수 있음.
