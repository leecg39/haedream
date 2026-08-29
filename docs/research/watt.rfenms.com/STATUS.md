# SolarSimz — watt.rfenms.com 클론 현황

## 실행
```bash
npm run dev -- -p 3456
```
- React 로그인: http://localhost:3456/
- 허브: http://localhost:3456/hub
- 정적 페이지 예: http://localhost:3456/solar.html

## 데모 로그인
아무 아이디/비밀번호 (예: `admin` / `demo`)

## 완료된 것
| 항목 | 상태 |
|---|---|
| 페이지 41 + 로그인 | `public/*.html` 스모크 41/41 OK |
| 자산 | CSS/JS/fonts/img + monit 계통도 |
| 셸 | leftnav / top / widget / footer |
| API 목업 | tokens, stars, watt-mains, peak-stats, mains, widgets, navigations, peak-info |
| **실데이터 연동** | `src/lib/fixtures/*.json` — 라이브 admin 세션( fid 121 대산금속 ) 캡처본. mains 24필드 전체, widgets 35개 배치, members 1650개 업체 |
| React 로그인 | `/` |
| consulting | 원본 302 → 데모 플레이스홀더 |

## main.html 실데이터 클론 (2026-08-28)
- Firecrawl은 원본 서버 방화벽(ERR_TUNNEL_CONNECTION_FAILED)으로 접근 불가 → 인증된 브라우저 세션 + 직접 API 호출로 대체 수집
- `api/mains/121`(24필드), `api/widgets/121`, `api/navigations/121`, `api/peak-info/121`, 로그인 응답을 fixture로 저장
- `mockMains(fields)`는 실제 API처럼 `?fields=` 필터링 지원 (3초 폴링 대응)
- leftnav: 통합관제·업체관리 활성화 (라이브 admin 뷰 기준, authIdn=1)
- 검증: 로컬 34개 위젯 = 라이브 34개, 주요 수치 일치 (실시간 값은 캡처 시점 스냅샷)

## 스크린샷
`docs/design-references/watt.rfenms.com/clone-*.png`

## 남은 일
- ~~원본 Visual QA~~ (2026-08-29 완료): 관리자 10개 페이지를 라이브 원본과 대조 — widgetSet 위젯 ID/순서 매핑 교정(16~31 → 원본 번호 체계), SMP·REC 아이콘 마크업 반영. 나머지 9개 페이지는 구조 일치 확인
- ~~`contentsArea` disable 해제~~ (2026-08-29 검증): 41개 정적 페이지 전수 스윕 — 로드 후 `disable` 잔류 0건, `base.js` finally 와 페이지 데모 스크립트가 정상 해제
- ~~KPI 매핑~~ (2026-08-29 확인): 로컬 kpi.html 테이블 전 컬럼 렌더링 정상(NaN/undefined 없음), 콘솔 오류 없음
- ~~업체 MockDB → 실데이터 교체~~ (2026-08-29 완료): `data/firm-details.csv`(1,654건)를 `scripts/import-firm-csv.mjs`로 `src/lib/fit-mocks/firm-rows.json`에 변환 — React(/fit/firm)와 정적 EMS(firm.html → `/api/firm`)가 같은 JSON을 사용. kepcoNo 앞자리 0 보존(문자열화), mapGeo `POINT()`→`경도, 위도`, unix 시간→날짜 변환. 합성 생성기(buildFirms) 제거
- ~~peak.html 로딩 오버레이 잔류~~ (2026-08-29 수정): `mockPeakStats`가 peak.js 기대 스키마(peakPower.startTime/powerLimit, control, extend, firm[0~9])를 못 맞춰 `peakBase`가 중간에 죽고 `netAble(false)` 미호출이던 것을 목 보강으로 해소
