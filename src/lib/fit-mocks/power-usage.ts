/**
 * 전력 사용 보고서(powerUsage) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/power-usages/:fid` 에서 값을 받아
 * `vio.dataTrans / daysDataTrans / monthsDataTrans` 로 표를 그린다.
 * 클론은 네트워크 호출 없이 아래 결정적(deterministic) 생성기로 같은 형태의
 * 표 데이터를 만든다. 시드 기반이라 서버/클라이언트 렌더 결과가 항상 일치한다.
 */

export type PowerUsageDataType = "hours" | "days" | "months";

export interface PowerUsageCell {
  readonly value: string;
  readonly className?: string;
}

export interface PowerUsageHourRow {
  readonly label: string;
  readonly total: string;
  readonly average: string;
  readonly max: string;
  readonly maxTime: string;
  readonly peak: string;
  readonly peakTime: string;
  readonly hours: readonly PowerUsageCell[];
}

export interface PowerUsageLabeledRow {
  readonly label: string;
  readonly unit?: string;
  readonly cells: readonly string[];
}

export interface PowerUsageMonthRow {
  readonly label: string;
  readonly total: string;
  readonly average: string;
  readonly max: string;
  readonly cells: readonly string[];
}

export interface PowerUsageBoardInfo {
  readonly power: string;
  readonly powerDate: string;
  readonly peak: string;
  readonly peakDate: string;
}

/** 데모 기준월 (tui-date-picker `#inputMonth` 표시값, format `yyyy-MM`). */
export const POWER_USAGE_DEMO_MONTH = "2026-08";

const DEMO_YEAR = 2026;
const DEMO_MONTH_NO = 8;
const DEMO_MONTH_DAYS = 31;
const YEARS = [2022, 2023, 2024, 2025, 2026] as const;

/** 시간대별 부하 프로파일(0시~23시). 주간 조업 피크가 10시·15시에 오는 공장 패턴. */
const HOUR_PROFILE = [
  0.32, 0.3, 0.29, 0.28, 0.3, 0.36, 0.48, 0.62, 0.78, 0.92, 1.0, 0.96,
  0.72, 0.88, 0.98, 0.95, 0.86, 0.74, 0.63, 0.55, 0.48, 0.42, 0.38, 0.34,
] as const;

/** 월별 계절 계수(1월~12월). 냉방부하로 7·8월이 가장 높다. */
const MONTH_FACTOR = [
  0.94, 0.88, 0.86, 0.82, 0.87, 0.98, 1.14, 1.18, 1.0, 0.85, 0.88, 0.96,
] as const;

const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

/** `toLocaleString('ko-KR')` 대신 결정적 포맷을 쓴다(하이드레이션 불일치 방지). */
const formatNumber = (value: number): string =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const padTwo = (value: number): string => value.toString().padStart(2, "0");

const sum = (values: readonly number[]): number =>
  values.reduce((acc, value) => acc + value, 0);

const maxIndexOf = (values: readonly number[]): number =>
  values.reduce((best, value, index) => (value > values[best] ? index : best), 0);

const dayScale = (day: number, random: () => number): number => {
  const weekendFactor = day % 7 === 0 ? 0.46 : day % 7 === 6 ? 0.78 : 1;
  return (620 + random() * 190) * weekendFactor;
};

const buildHourValues = (day: number, random: () => number): readonly number[] => {
  const scale = dayScale(day, random);
  return HOUR_PROFILE.map((ratio) => Math.round(ratio * scale * (0.93 + random() * 0.14)));
};

const toHourCells = (values: readonly number[]): readonly PowerUsageCell[] => {
  const peakIndex = maxIndexOf(values);
  return values.map((value, index) => ({
    value: formatNumber(value),
    className: value === 0 ? "none" : index === peakIndex ? "wattMax" : undefined,
  }));
};

const buildHourRow = (day: number, random: () => number): PowerUsageHourRow => {
  const values = buildHourValues(day, random);
  const peakIndex = maxIndexOf(values);
  const total = sum(values);
  const peakWatt = Math.round(values[peakIndex] * (1.12 + random() * 0.1));
  return {
    label: `${DEMO_MONTH_NO}/${day}`,
    total: formatNumber(total),
    average: formatNumber(total / values.length),
    max: formatNumber(values[peakIndex]),
    maxTime: `${padTwo(peakIndex + 1)}:00`,
    peak: formatNumber(peakWatt),
    peakTime: `${padTwo(peakIndex + 1)}:${padTwo(10 + (day % 5) * 10)}`,
    hours: toHourCells(values),
  };
};

const HOUR_SOURCE: readonly (readonly number[])[] = (() => {
  const random = createRandom(20260801);
  return Array.from({ length: DEMO_MONTH_DAYS }, (_, index) =>
    buildHourValues(index + 1, random),
  );
})();

/** 일자별 표(`#hoursList`) 본문. */
export const POWER_USAGE_HOUR_ROWS: readonly PowerUsageHourRow[] = (() => {
  const random = createRandom(20260801);
  return Array.from({ length: DEMO_MONTH_DAYS }, (_, index) =>
    buildHourRow(index + 1, random),
  );
})();

/** 일자별 표 마지막 합계행(원본의 `계` 행). */
export const POWER_USAGE_HOUR_TOTAL: PowerUsageHourRow = (() => {
  const hourTotals = HOUR_PROFILE.map((_, hour) =>
    sum(HOUR_SOURCE.map((values) => values[hour])),
  );
  const dayTotals = HOUR_SOURCE.map((values) => sum(values));
  const peakIndex = maxIndexOf(hourTotals);
  const bestDay = maxIndexOf(dayTotals);
  return {
    label: "계",
    total: formatNumber(sum(dayTotals)),
    average: formatNumber(sum(dayTotals) / (DEMO_MONTH_DAYS * 24)),
    max: formatNumber(Math.max(...HOUR_SOURCE.map((values) => Math.max(...values)))),
    maxTime: `${padTwo(peakIndex + 1)}:00`,
    peak: formatNumber(Math.max(...HOUR_SOURCE[bestDay]) * 1.16),
    peakTime: `${padTwo(peakIndex + 1)}:40`,
    hours: hourTotals.map((value) => ({ value: formatNumber(value) })),
  };
})();

const monthDayCount = (month: number): number =>
  month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;

/** [월(1~12)][일(1~31)] 형태의 일단위 사용량. 값이 없는 날은 0. */
const DAY_SOURCE: readonly (readonly number[])[] = (() => {
  const random = createRandom(20220101);
  return MONTH_FACTOR.map((factor, monthIndex) =>
    Array.from({ length: 31 }, (_, dayIndex) => {
      const isFuture = monthIndex + 1 > DEMO_MONTH_NO;
      const isMissing = dayIndex + 1 > monthDayCount(monthIndex + 1);
      const base = 12_600 + random() * 3_400;
      const weekend = (dayIndex + monthIndex) % 7 === 0 ? 0.48 : 1;
      return isFuture || isMissing ? 0 : Math.round(base * factor * weekend);
    }),
  );
})();

const monthActiveDays = (monthIndex: number): number =>
  DAY_SOURCE[monthIndex].filter((value) => value > 0).length;

const monthTotal = (monthIndex: number): number => sum(DAY_SOURCE[monthIndex]);

const buildDaySummaryRow = (
  label: string,
  unit: string | undefined,
  pick: (monthIndex: number) => string,
): PowerUsageLabeledRow => ({
  label,
  unit,
  cells: DAY_SOURCE.map((_, monthIndex) => pick(monthIndex)),
});

const monthPeakDay = (monthIndex: number): number => maxIndexOf(DAY_SOURCE[monthIndex]) + 1;

/** 월별 표(`#daysList`) 상단 요약 5행. */
export const POWER_USAGE_DAY_SUMMARY_ROWS: readonly PowerUsageLabeledRow[] = [
  buildDaySummaryRow("전체 전력량", "kWh", (index) => formatNumber(monthTotal(index))),
  buildDaySummaryRow("평균 전력량", "kWh", (index) =>
    monthActiveDays(index) > 0 ? formatNumber(monthTotal(index) / monthActiveDays(index)) : "0",
  ),
  buildDaySummaryRow("최대 전력량", "kWh", (index) =>
    formatNumber(Math.max(...DAY_SOURCE[index])),
  ),
  buildDaySummaryRow("피크 전력", "kW", (index) =>
    formatNumber(Math.max(...DAY_SOURCE[index]) / 21),
  ),
  buildDaySummaryRow("피크 시간", undefined, (index) =>
    monthTotal(index) === 0 ? "" : `${index + 1}.${monthPeakDay(index)} 1${index % 5}:20`,
  ),
];

/** 월별 표(`#daysList`) 1일~31일 행. */
export const POWER_USAGE_DAY_ROWS: readonly PowerUsageLabeledRow[] = Array.from(
  { length: 31 },
  (_, dayIndex) => ({
    label: `${dayIndex + 1}일`,
    cells: DAY_SOURCE.map((values) =>
      values[dayIndex] === 0 ? "" : formatNumber(values[dayIndex]),
    ),
  }),
);

/** [연도][월(1~12)] 형태의 월단위 사용량. */
const MONTH_SOURCE: readonly (readonly number[])[] = (() => {
  const random = createRandom(20211201);
  return YEARS.map((year, yearIndex) =>
    MONTH_FACTOR.map((factor, monthIndex) => {
      const isFuture = year === DEMO_YEAR && monthIndex + 1 > DEMO_MONTH_NO;
      const growth = 1 + yearIndex * 0.045;
      return isFuture ? 0 : Math.round((372_000 + random() * 46_000) * factor * growth);
    }),
  );
})();

/** 연도별 표(`#monthsList`) 본문. */
export const POWER_USAGE_MONTH_ROWS: readonly PowerUsageMonthRow[] = YEARS.map(
  (year, yearIndex) => {
    const values = MONTH_SOURCE[yearIndex];
    const activeMonths = values.filter((value) => value > 0).length;
    const total = sum(values);
    return {
      label: `${year}년`,
      total: formatNumber(total),
      average: activeMonths > 0 ? formatNumber(total / activeMonths) : "0",
      max: formatNumber(Math.max(...values)),
      cells: values.map((value) => (value === 0 ? "" : formatNumber(value))),
    };
  },
);

const HOURS_BOARD_INFO: PowerUsageBoardInfo = (() => {
  const bestDay = maxIndexOf(HOUR_SOURCE.map((values) => Math.max(...values)));
  const bestHour = maxIndexOf(HOUR_SOURCE[bestDay]);
  return {
    power: formatNumber(HOUR_SOURCE[bestDay][bestHour]),
    powerDate: `${padTwo(DEMO_MONTH_NO)}.${bestDay + 1} ${padTwo(bestHour + 1)}:00`,
    peak: formatNumber(HOUR_SOURCE[bestDay][bestHour] * 1.16),
    peakDate: `${padTwo(DEMO_MONTH_NO)}.${bestDay + 1} ${padTwo(bestHour + 1)}:40`,
  };
})();

const DAYS_BOARD_INFO: PowerUsageBoardInfo = (() => {
  const monthMaxes = DAY_SOURCE.map((values) => Math.max(...values));
  const bestMonth = maxIndexOf(monthMaxes);
  const bestDay = monthPeakDay(bestMonth);
  return {
    power: formatNumber(monthMaxes[bestMonth]),
    powerDate: `${padTwo(bestMonth + 1)}.${bestDay}`,
    peak: formatNumber(monthMaxes[bestMonth] / 21),
    peakDate: `${padTwo(bestMonth + 1)}.${bestDay} 15:20`,
  };
})();

/** `#boardInfoPanel` 표시값. 원본은 `months` 구분에서 패널을 감춘다. */
export const getPowerUsageBoardInfo = (
  dataType: PowerUsageDataType,
): PowerUsageBoardInfo | null => {
  if (dataType === "hours") {
    return HOURS_BOARD_INFO;
  }
  if (dataType === "days") {
    return DAYS_BOARD_INFO;
  }
  return null;
};
