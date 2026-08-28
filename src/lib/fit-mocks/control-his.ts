/**
 * `/fit/control-his` (피크제어이력) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/control-historys/*` 에서 fetch 하지만 클론은
 * 실제 API 를 호출하지 않는다. 아래 값들은 국내 산업용 고압 수용가(목표전력 1,550㎾)
 * 기준의 현실적인 예시 값이다. 모든 배열/객체는 readonly 로 선언해 변형을 막는다.
 */

/** 차트/표가 기준으로 삼는 조회 월. 원본 tui-date-picker 의 `yyyy-MM` 포맷과 동일. */
export const CONTROL_HIS_MONTH = "2026-08" as const;

/** 조회 월의 마지막 표시 일자. 원본은 당월이면 오늘 날짜까지만 그린다. */
export const CONTROL_HIS_LAST_DAY = 28 as const;

/** 한 페이지에 표시할 행 수. 원본 `paging.dbListLimit` 에 해당한다. */
export const CONTROL_HIS_PAGE_SIZE = 10 as const;

export interface ControlFacility {
  readonly cid: number;
  readonly controlName: string;
}

/** `#facList` 셀렉트 항목. 원본 `cf=base` 응답의 `control[]` 과 같은 형태다. */
export const CONTROL_HIS_FACILITIES: readonly ControlFacility[] = [
  { cid: 101, controlName: "1호기 터보냉동기" },
  { cid: 102, controlName: "2호기 터보냉동기" },
  { cid: 201, controlName: "공조기 AHU-1" },
  { cid: 202, controlName: "공조기 AHU-2" },
  { cid: 301, controlName: "냉각탑 송풍팬" },
  { cid: 401, controlName: "공기압축기 A동" },
];

/** 원시 제어 이력 레코드. 표시 문자열은 아래 빌더가 파생시킨다. */
export interface ControlHisRecord {
  readonly id: string;
  readonly cid: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** 제어 지속 시간(초) */
  readonly durationSec: number;
  /** 제어 시작 시점의 예측전력(㎾) */
  readonly predictKw: number;
  /** 목표전력(㎾) */
  readonly limitKw: number;
  /** 절감액(만원) */
  readonly goldManwon: number;
}

export const CONTROL_HIS_RECORDS: readonly ControlHisRecord[] = [
  { id: "h01", cid: 101, day: 3, hour: 11, minute: 12, second: 8, durationSec: 315, predictKw: 1592, limitKw: 1550, goldManwon: 1.2 },
  { id: "h02", cid: 201, day: 3, hour: 14, minute: 6, second: 41, durationSec: 180, predictKw: 1571, limitKw: 1550, goldManwon: 0.7 },
  { id: "h03", cid: 102, day: 5, hour: 10, minute: 48, second: 12, durationSec: 462, predictKw: 1618, limitKw: 1550, goldManwon: 1.8 },
  { id: "h04", cid: 301, day: 5, hour: 15, minute: 22, second: 30, durationSec: 240, predictKw: 1566, limitKw: 1550, goldManwon: 0.9 },
  { id: "h05", cid: 401, day: 6, hour: 13, minute: 55, second: 3, durationSec: 96, predictKw: 1558, limitKw: 1550, goldManwon: 0.4 },
  { id: "h06", cid: 101, day: 7, hour: 11, minute: 30, second: 55, durationSec: 528, predictKw: 1634, limitKw: 1550, goldManwon: 2.1 },
  { id: "h07", cid: 202, day: 7, hour: 16, minute: 2, second: 17, durationSec: 135, predictKw: 1563, limitKw: 1550, goldManwon: 0.5 },
  { id: "h08", cid: 102, day: 10, hour: 9, minute: 41, second: 26, durationSec: 372, predictKw: 1601, limitKw: 1550, goldManwon: 1.5 },
  { id: "h09", cid: 101, day: 10, hour: 14, minute: 18, second: 49, durationSec: 645, predictKw: 1657, limitKw: 1550, goldManwon: 2.6 },
  { id: "h10", cid: 301, day: 11, hour: 13, minute: 7, second: 2, durationSec: 210, predictKw: 1574, limitKw: 1550, goldManwon: 0.8 },
  { id: "h11", cid: 201, day: 12, hour: 11, minute: 44, second: 38, durationSec: 288, predictKw: 1586, limitKw: 1550, goldManwon: 1.1 },
  { id: "h12", cid: 401, day: 12, hour: 15, minute: 51, second: 14, durationSec: 156, predictKw: 1567, limitKw: 1550, goldManwon: 0.6 },
  { id: "h13", cid: 102, day: 13, hour: 14, minute: 25, second: 57, durationSec: 705, predictKw: 1672, limitKw: 1550, goldManwon: 2.9 },
  { id: "h14", cid: 101, day: 14, hour: 10, minute: 33, second: 20, durationSec: 402, predictKw: 1609, limitKw: 1550, goldManwon: 1.6 },
  { id: "h15", cid: 202, day: 17, hour: 12, minute: 9, second: 45, durationSec: 174, predictKw: 1569, limitKw: 1550, goldManwon: 0.7 },
  { id: "h16", cid: 301, day: 18, hour: 14, minute: 47, second: 11, durationSec: 333, predictKw: 1595, limitKw: 1550, goldManwon: 1.3 },
  { id: "h17", cid: 101, day: 18, hour: 16, minute: 20, second: 6, durationSec: 258, predictKw: 1581, limitKw: 1550, goldManwon: 1.0 },
  { id: "h18", cid: 102, day: 19, hour: 11, minute: 2, second: 33, durationSec: 486, predictKw: 1623, limitKw: 1550, goldManwon: 1.9 },
  { id: "h19", cid: 401, day: 20, hour: 13, minute: 38, second: 52, durationSec: 129, predictKw: 1561, limitKw: 1550, goldManwon: 0.5 },
  { id: "h20", cid: 201, day: 21, hour: 15, minute: 14, second: 27, durationSec: 297, predictKw: 1588, limitKw: 1550, goldManwon: 1.2 },
  { id: "h21", cid: 101, day: 24, hour: 10, minute: 56, second: 4, durationSec: 561, predictKw: 1641, limitKw: 1550, goldManwon: 2.2 },
  { id: "h22", cid: 102, day: 24, hour: 14, minute: 31, second: 39, durationSec: 828, predictKw: 1694, limitKw: 1550, goldManwon: 3.4 },
  { id: "h23", cid: 301, day: 25, hour: 12, minute: 47, second: 18, durationSec: 195, predictKw: 1572, limitKw: 1550, goldManwon: 0.8 },
  { id: "h24", cid: 202, day: 26, hour: 14, minute: 5, second: 50, durationSec: 366, predictKw: 1604, limitKw: 1550, goldManwon: 1.5 },
  { id: "h25", cid: 401, day: 27, hour: 11, minute: 19, second: 23, durationSec: 243, predictKw: 1579, limitKw: 1550, goldManwon: 0.9 },
  { id: "h26", cid: 101, day: 27, hour: 15, minute: 40, second: 9, durationSec: 519, predictKw: 1631, limitKw: 1550, goldManwon: 2.1 },
  { id: "h27", cid: 102, day: 28, hour: 10, minute: 27, second: 36, durationSec: 288, predictKw: 1587, limitKw: 1550, goldManwon: 1.1 },
  { id: "h28", cid: 201, day: 28, hour: 14, minute: 52, second: 15, durationSec: 141, predictKw: 1564, limitKw: 1550, goldManwon: 0.6 },
];

const FACILITY_NAME_BY_CID: ReadonlyMap<number, string> = new Map(
  CONTROL_HIS_FACILITIES.map((facility) => [facility.cid, facility.controlName]),
);

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

/** `1,592` 형태의 천단위 구분. 원본 `vio.echoNumber` 와 동일한 표기다. */
const echoNumber = (value: number): string => value.toLocaleString("ko-KR");

/** 원본 `vio.echoDate('m.d h:i:s', ...)` 표기 — `08.27 15:40:09`. */
const echoClock = (day: number, hour: number, minute: number, second: number): string => {
  const month = CONTROL_HIS_MONTH.slice(5, 7);
  return `${month}.${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
};

/** 원본 `vio.dataTrans` 의 제어시간 표기 로직을 그대로 옮긴 것. */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}초`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  }
  if (seconds < 86400) {
    const rest = seconds % 3600;
    return `${Math.floor(seconds / 3600)}시간 ${Math.floor(rest / 60)}분 ${seconds % 60}초`;
  }
  return `${Math.ceil(seconds / 86400)}일`;
};

/** 표에 그대로 꽂히는 표시용 행. */
export interface ControlHisDisplayRow {
  readonly id: string;
  readonly cid: number;
  readonly day: number;
  readonly hour: number;
  readonly facilityName: string;
  readonly startText: string;
  readonly endText: string;
  readonly predictText: string;
  readonly limitText: string;
  readonly durationText: string;
  readonly goldText: string;
}

const toDisplayRow = (record: ControlHisRecord): ControlHisDisplayRow => {
  const endSeconds = record.second + record.durationSec;
  const endMinuteTotal = record.minute + Math.floor(endSeconds / 60);
  const endHour = (record.hour + Math.floor(endMinuteTotal / 60)) % 24;

  return {
    id: record.id,
    cid: record.cid,
    day: record.day,
    hour: record.hour,
    facilityName: FACILITY_NAME_BY_CID.get(record.cid) ?? "-",
    startText: echoClock(record.day, record.hour, record.minute, record.second),
    endText: echoClock(record.day, endHour, endMinuteTotal % 60, endSeconds % 60),
    predictText: echoNumber(record.predictKw),
    limitText: echoNumber(record.limitKw),
    durationText: formatDuration(record.durationSec),
    goldText: record.goldManwon.toFixed(1),
  };
};

export const CONTROL_HIS_ROWS: readonly ControlHisDisplayRow[] =
  CONTROL_HIS_RECORDS.map(toDisplayRow);

/** amCharts 히트맵 셀 하나. `days` 는 `MM-DD`, `hour` 는 0~23. */
export interface ControlHeatCell {
  readonly days: string;
  readonly hour: number;
  readonly value: number;
}

/** 일자·시각별 제어 횟수를 집계한다. 원본 차트의 `chart.data` 와 같은 구조다. */
export const buildHeatCells = (
  records: readonly ControlHisRecord[],
): readonly ControlHeatCell[] => {
  const month = CONTROL_HIS_MONTH.slice(5, 7);
  const counted = records.reduce<Readonly<Record<string, number>>>(
    (acc, record) => {
      const key = `${month}-${pad(record.day)}|${record.hour}`;
      return { ...acc, [key]: (acc[key] ?? 0) + 1 };
    },
    {},
  );

  return Object.entries(counted).map(([key, value]) => {
    const [days, hour] = key.split("|");
    return { days, hour: Number(hour), value };
  });
};

export const CONTROL_HIS_HEAT_CELLS: readonly ControlHeatCell[] =
  buildHeatCells(CONTROL_HIS_RECORDS);

/** `.tableCaption` 요약값. 원본은 `cf=chart` 응답에서 받아 포맷한다. */
export interface ControlHisSummary {
  readonly energyTime: string;
  readonly energyGold: string;
  readonly energyGoldMax: string;
}

/** 원본 절감액 표기 로직. 입력 단위는 천원이다. */
const formatGold = (thousandWon: number): string => {
  if (thousandWon > 1000) {
    return `${Math.floor(thousandWon / 100) / 10}백만원`;
  }
  if (thousandWon > 10) {
    return `${Math.floor(thousandWon / 10)}만원`;
  }
  return `${thousandWon}천원`;
};

/** 원본 `getChartData` 의 총 제어시간 표기 로직. */
const formatEnergyTime = (seconds: number): string => {
  const hours = seconds > 3600 ? `${Math.floor(seconds / 3600)}시간 ` : "";
  const minutes = seconds > 60 ? `${Math.floor((seconds % 3600) / 60)}분 ` : "";
  return `${hours}${minutes}${Math.floor(seconds % 60)}초`;
};

export const buildSummary = (
  records: readonly ControlHisRecord[],
): ControlHisSummary => {
  const totalSeconds = records.reduce((sum, record) => sum + record.durationSec, 0);
  const totalGold = records.reduce((sum, record) => sum + record.goldManwon * 10, 0);
  const maxGold = records.reduce(
    (max, record) => Math.max(max, record.goldManwon * 10),
    0,
  );

  return {
    energyTime: formatEnergyTime(totalSeconds),
    energyGold: formatGold(Math.round(totalGold)),
    energyGoldMax: formatGold(Math.round(maxGold)),
  };
};

export const CONTROL_HIS_SUMMARY: ControlHisSummary = buildSummary(CONTROL_HIS_RECORDS);
