/**
 * `/fit/peak-usage` (피크 15분 전력보고서) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/peak-usages/{fid}?date=YYYY-MM` 에서 15분 단위
 * 계량값을 받아 `일자 × 분단위(15/30/45/60) × 24시간` 매트릭스로 펼친다. 클론은 실제
 * API 를 호출하지 않고, 아래 결정적(deterministic) 생성기로 동일한 형태의 값을 만든다.
 *
 * 난수를 쓰지 않는 이유: 서버 렌더 결과와 클라이언트 렌더 결과가 달라지면 hydration 이
 * 깨지기 때문이다. 같은 (연월, 일, 시, 분단위) 입력에는 항상 같은 값이 나온다.
 *
 * 기준 수용가: 국내 산업용 고압 수용가, 계약전력 1,600kW.
 */

/** 15분 계량 구간. 원본 표의 `분단위` 행 레이블(`15:00`~`60:00`)과 1:1 대응한다. */
export type PeakUsageQuarter = 15 | 30 | 45 | 60;

/** 15분 단위 시간 슬롯 하나. 차트(가로축)와 누적 전력량 계산에 쓴다. */
export interface PeakUsageSlot {
  /** 구간 종료 시각 (`00:15`, `00:30`, … `24:00`) */
  readonly time: string;
  /** 해당 15분 구간의 사용 전력 = 최대수요 (kW) */
  readonly usageKw: number;
  /** 자정부터의 누적 전력량 (kWh) */
  readonly cumulativeKwh: number;
}

/** 표의 한 행 = 하루의 특정 분단위에 대한 24시간 최대수요. */
export interface PeakUsageQuarterRow {
  /** 원본과 동일한 행 레이블 (`15:00` / `30:00` / `45:00` / `60:00`) */
  readonly label: string;
  readonly quarter: PeakUsageQuarter;
  /** 0시~23시 최대수요 (kW), 길이 24 */
  readonly values: readonly number[];
  /** 계측 누락으로 한전 데이터를 대체 사용한 시(hour) 목록 → `.underline` */
  readonly kepcoHours: readonly number[];
}

/** 하루치 데이터. */
export interface PeakUsageDay {
  /** 일 (1~31) */
  readonly day: number;
  /** `YYYY-MM-DD` */
  readonly date: string;
  readonly quarters: readonly PeakUsageQuarterRow[];
  /** 그날의 최대 15분 전력 (kW) → `.wattMax` 강조 기준 */
  readonly maxKw: number;
  /** 96개 15분 슬롯 */
  readonly slots: readonly PeakUsageSlot[];
  /** 하루 총 사용 전력량 (kWh) */
  readonly totalKwh: number;
}

/** 한 달치 데이터. */
export interface PeakUsageMonth {
  /** `YYYY-MM` */
  readonly month: string;
  readonly days: readonly PeakUsageDay[];
}

/** 계약전력 (kW) */
export const PEAK_USAGE_CONTRACT_KW = 1600;

/** 원본 tui.DatePicker 의 `selectableRanges` 하한 (`2021-12-01`). */
export const PEAK_USAGE_MIN_MONTH = "2021-12";

/** 데모 기준 "오늘"이 속한 달. 실시간 `new Date()` 를 쓰면 hydration 이 깨진다. */
export const PEAK_USAGE_LATEST_MONTH = "2026-08";

/** 데모 기준 "오늘". 최신 달은 이 날짜까지만 계량값이 존재한다. */
export const PEAK_USAGE_LATEST_DAY = 28;

/** 원본 표의 분단위 행 순서. */
export const PEAK_USAGE_QUARTERS: readonly PeakUsageQuarter[] = [15, 30, 45, 60];

/** 시간대별 기준 부하 (kW). 경부하(심야) → 최대부하(주간) 곡선. */
const BASE_HOURLY: readonly number[] = [
  560, 541, 528, 522, 531, 566, 662, 834, 1082, 1288, 1381, 1408, 1124, 1186, 1352, 1401, 1329, 1183,
  978, 862, 761, 688, 629, 588,
];

/** 분단위별 미세 편차. 15분 계량 특성상 구간마다 조금씩 다르다. */
const QUARTER_FACTOR: readonly number[] = [0.975, 1.0, 1.021, 0.988];

/** 주말/공휴일 가동 축소 계수. */
const WEEKEND_FACTOR = 0.62;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * 결정적 의사난수 (0 이상 1 미만).
 * 선형 합동 생성기를 한 번 돌리고 상위 비트를 섞어 인접 seed 의 상관을 줄인다.
 */
function noise(seed: number): number {
  const mixed = (seed * 1103515245 + 12345) % 2147483648;
  const scrambled = (mixed ^ (mixed >>> 9)) >>> 0;
  return (scrambled % 10000) / 10000;
}

/** `YYYY-MM` 문자열을 파싱한다. 형식이 어긋나면 즉시 실패시킨다. */
function parseMonth(month: string): { readonly year: number; readonly monthIndex: number } {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`잘못된 조회 월 형식입니다: "${month}" (YYYY-MM 형식이어야 합니다)`);
  }
  const [year, monthNumber] = month.split("-").map(Number);
  return { year, monthIndex: monthNumber - 1 };
}

/** 해당 연월의 말일. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** 조회 월에서 실제 계량값이 존재하는 마지막 일자. */
export function lastDayOfMonth(month: string): number {
  const { year, monthIndex } = parseMonth(month);
  const total = daysInMonth(year, monthIndex);
  return month === PEAK_USAGE_LATEST_MONTH ? Math.min(PEAK_USAGE_LATEST_DAY, total) : total;
}

/** 주말이면 가동률을 낮춘다. */
function dayFactor(year: number, monthIndex: number, day: number): number {
  const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const drift = 0.96 + noise(year * 10000 + monthIndex * 100 + day) * 0.09;
  return (isWeekend ? WEEKEND_FACTOR : 1) * drift;
}

/** `HH:MM` 두 자리 패딩. */
function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/** 하루의 24 × 4 최대수요 매트릭스를 만든다. `matrix[quarterIndex][hour]`. */
function buildMatrix(year: number, monthIndex: number, day: number): readonly number[][] {
  const factor = dayFactor(year, monthIndex, day);
  return QUARTER_FACTOR.map((quarterFactor, quarterIndex) =>
    BASE_HOURLY.map((base, hour) => {
      const seed = ((year * 12 + monthIndex) * 32 + day) * 96 + hour * 4 + quarterIndex;
      const jitter = 0.955 + noise(seed) * 0.09;
      return Math.round(base * factor * quarterFactor * jitter);
    }),
  );
}

/** 계측 누락(한전 데이터 대체) 구간. 월 2~3회 정도만 발생하도록 한다. */
function kepcoHoursFor(day: number, quarterIndex: number): readonly number[] {
  if (day % 9 !== 4 || quarterIndex % 2 !== 0) {
    return [];
  }
  return [3 + quarterIndex, 4 + quarterIndex];
}

/** 매트릭스를 96개 15분 슬롯(사용 전력 + 누적 전력량)으로 펼친다. */
function buildSlots(matrix: readonly number[][]): readonly PeakUsageSlot[] {
  let cumulative = 0;
  const slots: PeakUsageSlot[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let quarterIndex = 0; quarterIndex < QUARTER_FACTOR.length; quarterIndex += 1) {
      const usageKw = matrix[quarterIndex][hour];
      const minute = (quarterIndex + 1) * 15;
      cumulative += usageKw / 4;
      slots.push({
        time: minute === 60 ? `${pad2(hour + 1)}:00` : `${pad2(hour)}:${pad2(minute)}`,
        usageKw,
        cumulativeKwh: Math.round(cumulative * 10) / 10,
      });
    }
  }
  return slots;
}

/** 하루치 데이터를 조립한다. */
function buildDay(year: number, monthIndex: number, day: number): PeakUsageDay {
  const matrix = buildMatrix(year, monthIndex, day);
  const slots = buildSlots(matrix);
  const quarters = PEAK_USAGE_QUARTERS.map((quarter, quarterIndex) => ({
    label: `${quarter}:00`,
    quarter,
    values: matrix[quarterIndex],
    kepcoHours: kepcoHoursFor(day, quarterIndex),
  }));
  const lastSlot = slots[slots.length - 1];
  return {
    day,
    date: `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`,
    quarters,
    maxKw: Math.max(...matrix.flat()),
    slots,
    totalKwh: lastSlot ? lastSlot.cumulativeKwh : 0,
  };
}

/**
 * 조회 월의 전체 데이터를 만든다.
 *
 * @param month `YYYY-MM`
 * @throws 형식이 잘못됐거나 생성에 실패한 경우
 */
export function buildPeakUsageMonth(month: string): PeakUsageMonth {
  try {
    const { year, monthIndex } = parseMonth(month);
    const last = lastDayOfMonth(month);
    const days = Array.from({ length: last }, (_, index) => buildDay(year, monthIndex, index + 1));
    return { month, days };
  } catch (error) {
    throw new Error(
      `피크 15분 전력 데모 데이터를 만들지 못했습니다 (${month}): ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`,
    );
  }
}

/** 원본 `vio.echoNumber` 대응 — 천 단위 구분 기호. 로캘 의존 없이 동일 결과를 낸다. */
export function formatKw(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 누적 전력량 표기 (소수 1자리 + 천 단위 구분). */
export function formatKwh(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const [whole, fraction = "0"] = rounded.toFixed(1).split(".");
  return `${formatKw(Number(whole))}.${fraction}`;
}
