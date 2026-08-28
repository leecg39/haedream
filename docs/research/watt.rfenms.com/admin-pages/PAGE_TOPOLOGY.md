# WATT 관리 화면 페이지 토폴로지

## 공통 셸

모든 대상 화면은 기존 `FitShell`과 같은 구조다.

1. 데스크톱: 좌측 200px 내비게이션, 상단 60px 바, 본문 `margin-left: 200px`.
2. 1000px 이하: 좌측 내비게이션을 숨기고 상단 햄버거로 260px 패널을 연다.
3. 본문: `main.contents#contentsArea`, `padding: 16px 32px`, 제목 22.4px/500.
4. 패널: `rgba(0,0,29,.4)`, 1px `rgba(255,255,255,.15)`, 32px 패딩.
5. 데이터 표: 헤더 `rgba(4,56,140,.4)`, 본문 행 1px `#042337`.

## 화면

| 원본 | 클론 경로 | 제목 | 유형 |
|---|---|---|---|
| `widgetSet.html` | `/fit/widget-set` | 대시보드 화면설정 | 설정 그룹 |
| `user.html` | `/fit/user` | 사용자관리 | CRUD 표 |
| `notify.html` | `/fit/notify` | 알람설정 | 인라인 편집 표 |
| `gateNode.html` | `/fit/gate-node` | 게이트웨이 관리 | CRUD 표 |
| `gateway.html` | `/fit/gateway` | 복합제어기 관리 | 실시간 CRUD 표 |
| `sequence.html` | `/fit/sequence` | 시퀀스 제어 | 제어 CRUD 표 |
| `gateRTU.html` | `/fit/gate-rtu` | RTU 관리 | CRUD 표 |
| `device.html` | `/fit/device` | 모드버스 계측 | 실시간 CRUD 표 |
| `net.html` | `/fit/net` | 실시간 데이터 | 원시 패킷 그리드 |
| `bad.html` | `/fit/bad` | 통신상태 불량 | 필터 결과 |

데이터는 인증 시점의 대산금속 화면을 재현한 데모 스냅샷이며 외부 API를 호출하지 않는다.
