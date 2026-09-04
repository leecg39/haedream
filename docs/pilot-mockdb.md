# Package-A 파일럿 MockDB

필드팀이 확정한 파일럿 매핑(`gw-pilot-01`, `pt-pm-01`, `pt-din-01`)을
SQLite에 넣고, 화면은 `getReadings({ source })` 추상화를 통해 읽습니다.
DIN 계측점은 후보만 등록되어 있으며(`enabled: false`) 제조사·형번을 만들지 않습니다.

기존 `facilities` 테이블은 제어 설비 CRUD용이라 계측점과 필드가 맞지 않습니다.
게이트웨이에는 `rtu` / `lte` / `source` 컬럼을 추가하고, 계측점과 시간열은
`control_points` / `point_readings`로 확장했습니다.

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
| 게이트웨이 | `gw-pilot-01` | RTU `KFE`, LTE, `source=mock` |
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

`rtu` 경로는 스텁입니다. 프로토콜을 흉내 내지 않으며
`RTU_NOT_IMPLEMENTED`(HTTP 501)를 반환하거나 빈 목록을 줍니다.

```ts
import { getReadings } from "@/features/pilot/source";

const rows = getReadings({ source: "mock", pointId: "pt-pm-01" });
```

연결된 화면:

- `/api/mains/:fid`, `/api/watt-mains/:fid` — 기존 fixture에 `pilot` sidecar
- `/api/gateways` — `rtu`, `lte`, `source` 포함
- `/api/pilot`, `/api/pilot/readings` — 세션 권한 `facility:read`
- `/hub`, `/admin/facilities` — 파일럿 게이트웨이·계측점·최근 시간열

## 실제 RTU 전환 시 바꿀 것

화면을 다시 만들지 않습니다. collector/API만 교체합니다.

1. `src/features/pilot/source.ts`의 `createRtuProvider()`에 실제 수집 API를 연결합니다.
2. 수집기가 쓰는 행의 `source`를 `mock` → `rtu`로 바꿉니다.
3. 프로세스 환경에 `DATA_SOURCE=rtu`를 넣거나 API `?source=rtu`를 사용합니다.
4. KFE / Modbus / LTE 프레임을 이 저장소에서 구현하지 말고, 외부 collector가
   같은 `getReadings` 형태로 정규화한 뒤 넣습니다.
