/**
 * 저압 절감 분석(/fit/reduce) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/reduces/{fid}` 를 POST 로 조회하지만
 * 클론은 네트워크 없이 결정론적(deterministic) 목 데이터를 생성한다.
 * 서버 렌더와 클라이언트 렌더가 동일한 값을 내야 하므로 난수 대신
 * 정수 해시 기반 의사난수를 쓴다(Math.random / Date.now 사용 금지).
 */

export type ReduceDataType = "hours" | "days" | "months";

export type ReduceQuery = {
  readonly dataType: ReduceDataType;
  readonly sDate: string;
  readonly isBaseCost: boolean;
  readonly isCheckDay: boolean;
};

export type ReduceRow = {
  readonly seq: string;
  readonly watt: number;
  readonly high: number;
  readonly low: number;
  readonly frugal: number;
  readonly frugalRate: number;
  readonly last: number;
  readonly isMax: boolean;
};

/** 저압 전력 요금 위젯(#low) */
export type ReduceLowSummary = {
  readonly billTotal: number;
  readonly wattTotal: number;
  readonly billMax: number;
  readonly avgWatt: number;
  readonly avgLow: number;
};

/** 저압 절감 금액 위젯(#frugal) */
export type ReduceFrugalSummary = {
  readonly goal: number;
  readonly frugalTotal: number;
  readonly frugalAvg: number;
  readonly ratioAvg: number;
  readonly goalRatio: number;
};

/** 직전 동일 기간 대비 위젯(#compare) — 부호 있는 증감값 */
export type ReduceCompareSummary = {
  readonly billTotal: number;
  readonly wattTotal: number;
  readonly billMax: number;
  readonly avgWatt: number;
  readonly avgLow: number;
};

export type ReduceDataset = {
  readonly rows: readonly ReduceRow[];
  readonly low: ReduceLowSummary;
  readonly frugal: ReduceFrugalSummary;
  readonly compare: ReduceCompareSummary;
};

/** 데모 기준일. 원본은 오늘 날짜를 쓰지만 클론은 고정값으로 하이드레이션을 맞춘다. */
export const REDUCE_DEMO_DATE = "2026-08-28";

export const REDUCE_INITIAL_QUERY: ReduceQuery = {
  dataType: "hours",
  sDate: REDUCE_DEMO_DATE,
  isBaseCost: false,
  isCheckDay: true,
};

/** 원본 `dataType` 셀렉트 옵션 */
export const REDUCE_DATA_TYPES: readonly { readonly value: ReduceDataType; readonly label: string }[] = [
  { value: "hours", label: "시간별" },
  { value: "days", label: "일자별" },
  { value: "months", label: "월별" },
];

type UnitPair = { readonly high: number; readonly low: number };

/** 시간대별 부하 계수 (00시~23시) */
const HOUR_SHAPE: readonly number[] = [
  0.42, 0.38, 0.35, 0.34, 0.36, 0.44, 0.58, 0.72, 0.88, 0.96, 1.0, 0.98, 0.86, 0.94, 1.0, 0.97, 0.92,
  0.84, 0.76, 0.68, 0.6, 0.54, 0.5, 0.46,
];

/** 시간대별 단가(원/kWh). 경부하 / 중간부하 / 최대부하 */
const OFF_PEAK: UnitPair = { high: 105.5, low: 88.3 };
const MID_PEAK: UnitPair = { high: 138.7, low: 118.6 };
const ON_PEAK: UnitPair = { high: 191.4, low: 165.2 };
const ON_PEAK_HOURS: readonly number[] = [12, 19, 20, 21];
const OFF_PEAK_HOURS: readonly number[] = [23, 0, 1, 2, 3, 4, 5, 6, 7, 8];

/** 일자별·월별 집계 평균 단가 */
const FLAT_UNITS: UnitPair = { high: 141.2, low: 119.8 };

/** 기본요금 포함 시 행마다 더해지는 금액(계약전력 300kW 기준 데모값) */
const BASE_COST: Record<ReduceDataType, UnitPair> = {
  hours: { high: 3467, low: 2567 },
  days: { high: 83_200, low: 61_600 },
  months: { high: 2_496_000, low: 1_848_000 },
};

/** 유형별 기준 사용전력량(kWh) */
const BASE_WATT: Record<ReduceDataType, number> = {
  hours: 412,
  days: 9_860,
  months: 298_400,
};

/** 유형별 목표 절감 금액(원) */
const GOAL_AMOUNT: Record<ReduceDataType, number> = {
  hours: 1_150_000,
  days: 34_000_000,
  months: 410_000_000,
};

const MONTH_SHAPE: readonly number[] = [
  1.08, 1.02, 0.94, 0.86, 0.9, 1.04, 1.18, 1.24, 1.06, 0.88, 0.92, 1.06,
];

const hash = (seed: number, index: number): number => {
  const mixed = Math.imul(seed ^ (index + 0x9e3779b9), 0x85ebca6b);
  const folded = (mixed ^ (mixed >>> 13)) >>> 0;
  return folded / 0x1_0000_0000;
};

const seedOf = (query: ReduceQuery): number => {
  const key = `${query.dataType}|${query.sDate}|${query.isBaseCost ? 1 : 0}|${query.isCheckDay ? 1 : 0}`;
  return [...key].reduce((acc, ch) => (Math.imul(acc, 31) + ch.charCodeAt(0)) | 0, 7);
};

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

const daysInMonth = (year: number, month: number): number => new Date(year, month, 0).getDate();

const parseYearMonth = (sDate: string): { readonly year: number; readonly month: number } => {
  const [rawYear, rawMonth] = sDate.split("-");
  const year = Number.parseInt(rawYear ?? "", 10);
  const month = Number.parseInt(rawMonth ?? "", 10);
  if (!Number.isFinite(year)) {
    throw new Error(`저압 절감 분석: 조회 기준일 형식이 올바르지 않습니다 (${sDate})`);
  }
  return { year, month: Number.isFinite(month) ? month : 1 };
};

const buildLabels = (query: ReduceQuery): readonly string[] => {
  if (query.dataType === "hours") {
    return Array.from({ length: 24 }, (_, i) => pad2(i));
  }
  if (query.dataType === "months") {
    return Array.from({ length: 12 }, (_, i) => pad2(i + 1));
  }
  const { year, month } = parseYearMonth(query.sDate);
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => pad2(i + 1));
};

const unitsFor = (dataType: ReduceDataType, index: number): UnitPair => {
  if (dataType !== "hours") {
    return FLAT_UNITS;
  }
  if (ON_PEAK_HOURS.includes(index)) {
    return ON_PEAK;
  }
  return OFF_PEAK_HOURS.includes(index) ? OFF_PEAK : MID_PEAK;
};

const shapeFor = (dataType: ReduceDataType, index: number, total: number): number => {
  if (dataType === "hours") {
    return HOUR_SHAPE[index] ?? 1;
  }
  if (dataType === "months") {
    return MONTH_SHAPE[index] ?? 1;
  }
  const weekend = index % 7 === 5 || index % 7 === 6;
  const drift = 1 + (index / Math.max(total - 1, 1)) * 0.12;
  return (weekend ? 0.68 : 1) * drift;
};

type RawRow = {
  readonly seq: string;
  readonly watt: number;
  readonly high: number;
  readonly low: number;
  readonly frugal: number;
  readonly frugalRate: number;
};

const buildRawRows = (labels: readonly string[], query: ReduceQuery, seed: number): readonly RawRow[] =>
  labels.map((seq, index) => {
    const jitter = 0.88 + hash(seed, index) * 0.24;
    const watt = Math.round(BASE_WATT[query.dataType] * shapeFor(query.dataType, index, labels.length) * jitter);
    const units = unitsFor(query.dataType, index);
    const base = query.isBaseCost ? BASE_COST[query.dataType] : { high: 0, low: 0 };
    const high = Math.round(watt * units.high + base.high);
    const low = Math.round(watt * units.low + base.low);
    const frugal = high - low;
    const frugalRate = high > 0 ? Math.round((frugal / high) * 1000) / 10 : 0;
    return { seq, watt, high, low, frugal, frugalRate };
  });

type Totals = {
  readonly billTotal: number;
  readonly wattTotal: number;
  readonly billMax: number;
  readonly avgWatt: number;
  readonly avgLow: number;
  readonly frugalTotal: number;
  readonly frugalAvg: number;
  readonly ratioAvg: number;
};

const sumOf = (rows: readonly RawRow[], pick: (row: RawRow) => number): number =>
  rows.reduce((acc, row) => acc + pick(row), 0);

const summarize = (rows: readonly RawRow[]): Totals => {
  const count = Math.max(rows.length, 1);
  const billTotal = sumOf(rows, (row) => row.low);
  const wattTotal = sumOf(rows, (row) => row.watt);
  const frugalTotal = sumOf(rows, (row) => row.frugal);
  const highTotal = sumOf(rows, (row) => row.high);
  return {
    billTotal,
    wattTotal,
    billMax: rows.reduce((acc, row) => Math.max(acc, row.low), 0),
    avgWatt: Math.round(wattTotal / count),
    avgLow: Math.round(billTotal / count),
    frugalTotal,
    frugalAvg: Math.round(frugalTotal / count),
    ratioAvg: highTotal > 0 ? Math.round((frugalTotal / highTotal) * 1000) / 10 : 0,
  };
};

const toCompare = (current: Totals, previous: Totals): ReduceCompareSummary => ({
  billTotal: current.billTotal - previous.billTotal,
  wattTotal: current.wattTotal - previous.wattTotal,
  billMax: current.billMax - previous.billMax,
  avgWatt: current.frugalAvg - previous.frugalAvg,
  avgLow: Math.round((current.ratioAvg - previous.ratioAvg) * 10) / 10,
});

const toFrugal = (totals: Totals, dataType: ReduceDataType): ReduceFrugalSummary => {
  const goal = GOAL_AMOUNT[dataType];
  const ratio = goal > 0 ? Math.round((totals.frugalTotal / goal) * 100) : 0;
  return {
    goal,
    frugalTotal: totals.frugalTotal,
    frugalAvg: totals.frugalAvg,
    ratioAvg: totals.ratioAvg,
    goalRatio: Math.min(Math.max(ratio, 0), 100),
  };
};

/**
 * 조회 조건에 대응하는 데모 데이터셋을 만든다.
 * 같은 조건이면 항상 같은 값을 돌려주므로 SSR/CSR 결과가 일치한다.
 */
export const buildReduceDataset = (query: ReduceQuery): ReduceDataset => {
  try {
    const labels = buildLabels(query);
    const seed = seedOf(query);
    const current = buildRawRows(labels, query, seed);
    const previous = buildRawRows(labels, query, (seed ^ 0x5bf03635) | 0);
    const maxWatt = current.reduce((acc, row) => Math.max(acc, row.watt), 0);
    const totals = summarize(current);

    return {
      rows: current.map((row, index) => ({
        ...row,
        last: previous[index]?.low ?? 0,
        isMax: maxWatt > 0 && row.watt === maxWatt,
      })),
      low: {
        billTotal: totals.billTotal,
        wattTotal: totals.wattTotal,
        billMax: totals.billMax,
        avgWatt: totals.avgWatt,
        avgLow: totals.avgLow,
      },
      frugal: toFrugal(totals, query.dataType),
      compare: toCompare(totals, summarize(previous)),
    };
  } catch (error) {
    throw new Error(
      `저압 절감 분석 데모 데이터를 만들지 못했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    );
  }
};

/** 조회 유형에 맞춰 날짜 입력 표시 형식을 바꾼다(원본 tui.DatePicker.setDateFormat 대응). */
export const formatReduceDate = (sDate: string, dataType: ReduceDataType): string => {
  const [year = "", month = "", day = ""] = REDUCE_DEMO_DATE.split("-");
  const source = sDate.length > 0 ? sDate : REDUCE_DEMO_DATE;
  const parts = source.split("-");
  const safeYear = parts[0] ?? year;
  const safeMonth = parts[1] ?? month;
  const safeDay = parts[2] ?? day;

  if (dataType === "months") {
    return safeYear;
  }
  if (dataType === "days") {
    return `${safeYear}-${safeMonth}`;
  }
  return `${safeYear}-${safeMonth}-${safeDay}`;
};
