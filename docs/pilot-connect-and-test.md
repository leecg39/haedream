# 파일럿 연결·테스트 정리 (패키지 A)

> 화면=`haedream`(SolarSimz) · 하부=현장 RTU · K-FEMS portal은 비교 기준만  
> 고객안 v0.2 · MockDB PR #1 `main@3c3b7f8` · 2026-09-06

관련: [`docs/pilot-mockdb.md`](./pilot-mockdb.md)

---

## 1. 포지션

| 구분 | 역할 |
|---|---|
| haedream | 구독형 화면·마스터 |
| 현장 RTU·계기·LTE | 하부 스택·검수 |
| K-FEMS 포털 | 바닥 경쟁재(비교만). 포털 API 연동 없음 |

금지: 무료·KEEP+/EnMS 가점·단가·절감률 단정, 파워플래너/한전 오인 라벨, 가짜 포털 API

## 2. 현장 매핑·시드

| 구분 | id / tag | 상태 |
|---|---|---|
| 게이트웨이 | `gw-pilot-01` | `source=mock`, HW 속성만 행 보관(KFE RTU·LTE) |
| 계측점 | `pt-pm-01` / `PANEL_PM` | 활성 |
| 계측점 | `pt-din-01` / `DIN_TBD` | 비활성(`enabled: false`), 시간열 없음 |
| 시간열 | `pt-pm-01` 시간당 | kWh/kW/V/A만 · 절감·요금 필드 없음 |

명판 확인: KFE RTU(RS-485 A/B) · LTE · Panel Power Meter · DIN(형번 미확정) · 함내 어댑터·접지

## 3. 연결은 두 층

### Mock 층 (지금 테스트 통과 = 정상)

함체와 안 붙인 채 통과가 의도된 상태입니다.

검증 순서:

```shell
npm install
npm run db:setup:demo
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

(스크립트명은 `package.json` 참고)

잠금: 시드 형태, `pt-din-01` 비활성, readings 4필드, 금지 라벨 거부, `getReadings({ source })`  
화면: `/hub`, `/admin/facilities`, `/api/pilot`, `/api/pilot/readings` (`source=mock`)  
계정: `admin` / `operator` / `viewer`, 비밀번호 `demo`

### 실RTU 층 (테스트 안 깨게)

버스·프로토콜 프레임은 이 저장소에 넣지 않습니다.

1. collector가 kWh/kW/V/A로 정규화
2. `createRtuProvider()`만 연결 (`src/features/pilot/source.ts`)
3. 같은 변경에서 스텁 단언 교체 — `tests/pilot-mockdb.test.ts`의
   `getReadings({ source: "rtu" })` → `RTU_NOT_IMPLEMENTED`,
   `/api/pilot/readings?source=rtu` → 501 기대를
   collector 계약(또는 mocked-RTU) 테스트로 바꾼다.
   provider만 연결하고 단언을 남기면 스위트가 깨진다.
4. DB 행 `source`: `mock` → `rtu`
5. `DATA_SOURCE=rtu` 또는 query `source=rtu`
6. `/hub`의 `RTU_NOT_IMPLEMENTED` 폴백 UI가 실측 성공 경로와 맞는지 확인

지금(스텁 유지): `rtu`는 501을 **의도적으로** 반환한다. `npm test`는 그 501을
단언하므로 스텁만으로는 깨지지 않는다. 런타임에서 수집기 없이 `source=rtu`를
쓰면 API·화면만 501/폴백이다(테스트 실패와 혼동하지 말 것).
컷오버 후: 위 1–3을 한 PR/커밋으로 끝내야 `source=rtu` 성공 경로와 스위트가
함께 맞는다. 허용 `source`는 `mock` | `rtu`만. 포털성 alias는 422.

## 4. 현장 검수 체크리스트 (사람)

- [ ] RTU `485_A` / `485_B` 통신 LED
- [ ] LTE 등록·신호·데이터 송출 (안테나·SIM)
- [ ] 전력계 전압·CT 극성·적산값
- [ ] 게이트웨이↔설비 ID · 관제점 태그 일치 (`gw-pilot-01` ↔ `PANEL_PM`)
- [ ] 끊김·알람 수신 (`operator`)

성공기준(패키지 A): 태그 일치 · 일일 데이터(또는 Mock 48h) · operator 알람 · 위 검수 완료

## 5. 테스트 통과 ≠ 포털 연결

| 하면 됨 | 하지 말 것 |
|---|---|
| Mock 시드 + 금지 라벨 거부로 CI/로컬 잠금 | `portal.kfems.kr` / 파워플래너 mock·스텁 |
| `source` mock↔rtu 추상화만 검증 | 테스트 통과를 포털·한전 연동으로 오인 |
| 실연동은 동의·해당 연도 공고 확인 후 별도 범위 | 출처 없는 단가·가점·절감률 기입 |

## 6. 사람 확정 남은 것

1. 관제점 수·수집 태그
2. DIN 형번·용도 · SIM/안테나
3. 파일럿 기간·담당
4. B(원단위)·C(M&V) 언급 여부 — C는 검증 방법 확정 전 절감 문구 금지

## 7. 참고

- 저장소: https://github.com/leecg39/haedream
- MockDB 문서: `docs/pilot-mockdb.md`
- 고객안: 파일럿 제안서 v0.2 (요금·절감률·가점 미기재)
