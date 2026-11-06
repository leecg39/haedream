# 파일럿 MockDB

필드팀이 확정한 파일럿 매핑(`gw-pilot-01`, `pt-pm-01`, `pt-din-01`)을
SQLite에 넣고, 화면은 `getReadings({ source })` 추상화를 통해 읽습니다.
DIN 계측점은 후보만 등록되어 있으며(`enabled: false`) 제조사·형번을 만들지 않습니다.

기존 `facilities` 테이블은 제어 설비 CRUD용이라 계측점과 필드가 맞지 않습니다.
게이트웨이에는 `rtu` / `lte` / `source` 컬럼을 추가하고, 계측점과 시간열은
`control_points` / `point_readings`로 확장했습니다.

## 라벨 규칙

시드·UI·태그·이 문서의 표시 이름은 중립 파일럿 라벨만 사용합니다.

- 게이트웨이: `gw-pilot-01`
- 계측점: `PANEL_PM`, `DIN_TBD`
- 데이터 출처: `source=mock` (이후 실측 전환 시 `rtu`)

`rtu=KFE`와 `lte`는 필드 매핑의 하드웨어 속성으로 행에만 저장합니다.
화면 제목이나 태그로 쓰지 않습니다.

다음을 MockDB 통합·데이터 소스·시드 라벨로 쓰지 않습니다.

- 공공/민간 에너지 관리 포털이나 프로그램 명칭
- 한전 고객 포털 연동
- KEEP+ / EnMS 포인트
- 가공한 절감률·절감액·성과 수치

실측 포털 연동은 동의와 공식 안내 확인 전까지 범위 밖입니다.
가짜 포털 API를 만들지 않습니다.

## 현장 확정 시드

- `pt-din-01`는 후보만 등록합니다. `enabled`는 항상 `false`이며 시간열을 넣지 않습니다.
- 시간열 필드는 시간당 `kWh`, `kW`, `V`, `A`만 허용합니다.
- 절감·요금제·원가·청구 필드는 시드와 `point_readings`에 추가하지 않습니다.

## 시드

```shell
npm run db:setup:demo
```

이미 마이그레이션된 DB에 파일럿 행만 다시 넣으려면:

```shell
npm run db:seed:pilot
```

두 명령 모두 재실행할 수 있습니다. 게이트웨이·계측점은 upsert이고,
`source=mock` 시간열은 지운 뒤 최근 48시간을 다시 채웁니다.

시드 결과:

| 구분 | id | 비고 |
|---|---|---|
| 게이트웨이 | `gw-pilot-01` | `source=mock`, 하드웨어 속성만 행에 보관 |
| 계측점 | `pt-pm-01` | tag `PANEL_PM`, 활성 |
| 계측점 | `pt-din-01` | tag `DIN_TBD`, 후보(비활성), 시간열 없음 |
| 시간열 | `pt-pm-01` 시간당 | `kWh`, `kW`, `V`, `A`, `source=mock` |

데모 계정은 기존과 같습니다: `admin` / `operator` / `viewer`, 비밀번호 `demo`.

## `source` 전환

기본값은 `mock`입니다. UI는 데이터 소스 구현을 직접 고르지 않고
`getReadings({ source })` / `getPilotDashboardSnapshot({ source })`만 호출합니다.

우선순위:

1. 함수 인자 `source`
2. 환경 변수 `DATA_SOURCE` (`mock` | `rtu`)
3. 매핑 기본값 `mock`

허용 값은 `mock`과 `rtu`뿐입니다. `rtu` 경로는 스텁이며 프로토콜을
흉내 내지 않고 `RTU_NOT_IMPLEMENTED`(HTTP 501)를 반환합니다.

```ts
import { getReadings } from "@/features/pilot/source";

const rows = getReadings({ source: "mock", pointId: "pt-pm-01" });
```

연결된 화면:

- `/api/mains/:fid`, `/api/watt-mains/:fid` — 기존 fixture에 `pilot` sidecar
- `/api/gateways` — `rtu`, `lte`, `source` 포함
- `/api/pilot`, `/api/pilot/readings` — 세션 권한 `facility:read`
- `/hub`, `/admin/facilities` — `gw-pilot-01` / `PANEL_PM` / `DIN_TBD` / `source=mock`

## 실제 RTU 전환 시 바꿀 것

화면을 다시 만들지 않습니다. collector/API만 교체합니다.

1. `src/features/pilot/source.ts`의 `createRtuProvider()`에 현장 collector API를 연결합니다.
2. **같은 변경에서** `tests/pilot-mockdb.test.ts`의 스텁 단언
   (`RTU_NOT_IMPLEMENTED` / `source=rtu`→501)을 collector 계약(또는 mocked-RTU)
   테스트로 교체합니다. provider만 구현하고 단언을 남기면 스위트가 깨집니다.
   (스텁 유지 중에는 이 단언 때문에 `npm test`가 통과합니다. 런타임 501과
   테스트 실패를 혼동하지 마세요.)
3. 수집기가 쓰는 행의 `source`를 `mock` → `rtu`로 바꿉니다.
4. 프로세스 환경에 `DATA_SOURCE=rtu`를 넣거나 API `?source=rtu`를 사용합니다.
5. `/hub`의 `RTU_NOT_IMPLEMENTED` 폴백이 실측 성공 경로와 맞는지 확인합니다.
6. 버스 프레임과 외부 포털 연동은 이 저장소에서 구현하지 않습니다.
   collector가 같은 `getReadings` 형태로 정규화한 뒤 넣습니다.

절차·검수 체크리스트는 [`docs/pilot-connect-and-test.md`](./pilot-connect-and-test.md)를 따릅니다.

## 패키지 A 운영 기록

- UI: `/admin/pilot`
- 알람: `GET/POST /api/pilot/alarms`, `POST /api/pilot/alarms/:id/ack` (`alarm:ack` = admin/operator)
- 검수: `GET/POST /api/pilot/inspections` (고정 5항)
- 일일 확인: `GET/PUT /api/pilot/daily-confirmations`
- 매핑·BOM: `GET /api/pilot/bom`

Mock 시드는 미확인 `DISCONNECT`/`ALARM` 샘플을 넣습니다. 포털·요금·절감 필드는 없습니다.
