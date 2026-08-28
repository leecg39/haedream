/**
 * 피크 그래프(peakHis) 데모 데이터.
 *
 * 원본은 watt.rfenms.com API 에서 15분 단위 전력 데이터를 fetch 하지만
 * 클론은 네트워크 호출 없이 결정적(deterministic) 목 데이터를 사용한다.
 * 서버/클라이언트 렌더 결과가 항상 같아야 하므로 Date.now·Math.random 을 쓰지 않는다.
 */

export type PeakHisPoint = {
  /** 15분 구간 라벨 (예: "13:45") */
  readonly m15: string;
  /** 예측전력 kW */
  readonly pr: number;
  /** 목표전력 kW */
  readonly pl: number;
  /** 현재전력 kW */
  readonly np: number;
  /** 기준전력 kW */
  readonly op: number;
};

export type PeakHisSeries = {
  readonly date: string;
  readonly points: readonly PeakHisPoint[];
  /** 당일 최대 피크 kW */
  readonly maxPeak: number;
  /** 최대 피크가 발생한 15분 구간 */
  readonly maxPeakAt: string;
};

/** 하루 15분 구간 개수 */
export const PEAK_SLOT_COUNT = 96;

/** 목표전력 (kW) */
export const PEAK_TARGET_KW = 4200;

/** 기준전력 (kW) */
export const PEAK_BASE_KW = 4800;

/** Y축 최대값 (kW) */
export const PEAK_AXIS_MAX_KW = 6000;

/** Y축 눈금 (kW) */
export const PEAK_AXIS_TICKS: readonly number[] = [0, 1500, 3000, 4500, 6000];

/** 기록일 선택 가능 범위 */
export const PEAK_HIS_DATE_RANGE = {
  min: "2026-01-01",
  max: "2026-08-28",
  initial: "2026-08-28",
} as const;

/** 시간 셀렉트 초기값 (원본 select 의 value 기준) */
export const PEAK_HIS_INITIAL_TIME = "18:00";

/** 범례 — 원본 amCharts series 순서와 동일 */
export const PEAK_HIS_LEGENDS: readonly string[] = [
  "예측전력",
  "목표전력",
  "현재전력",
  "기준전력",
];

/** 시간대별 기준 부하 프로파일 (kW, 정시 기준 24개) */
const HOURLY_LOAD_KW: readonly number[] = [
  1820, 1680, 1590, 1540, 1520, 1610, 1980, 2540, 3180, 3760, 4120, 4310, 3980,
  4180, 4390, 4260, 3840, 3320, 2960, 2710, 2480, 2260, 2050, 1900,
];

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** 0 이상 정수 분을 "HH:MM" 으로 변환한다. 1440분은 "24:00" 이다. */
export const minutesToLabel = (minutes: number): string =>
  `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;

/** 원본 select 의 option 목록 (value = 구간 시작, text = 구간 종료) */
export const PEAK_TIME_OPTIONS: readonly { value: string; label: string }[] =
  Array.from({ length: PEAK_SLOT_COUNT }, (_unused, index) => ({
    value: minutesToLabel(index * 15),
    label: minutesToLabel((index + 1) * 15),
  }));

/** 날짜 문자열을 0.94~1.06 사이 부하 계수로 바꾼다. */
const dateFactor = (date: string): number => {
  const sum = [...date].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 0.94 + ((sum % 13) / 12) * 0.12;
};

/** 15분 구간마다 완만한 변동을 준다. */
const wobble = (slot: number, seed: number): number =>
  1 + Math.sin((slot + seed) / 5.5) * 0.022 + Math.sin((slot + seed) / 17) * 0.016;

const loadAtSlot = (slot: number): number => {
  const hour = Math.floor(slot / 4) % 24;
  const nextHour = (hour + 1) % 24;
  const ratio = (slot % 4) / 4;
  return HOURLY_LOAD_KW[hour] * (1 - ratio) + HOURLY_LOAD_KW[nextHour] * ratio;
};

const buildPoint = (slot: number, factor: number, seed: number): PeakHisPoint => {
  const current = loadAtSlot(slot) * factor * wobble(slot, seed);
  const forecast = current * 1.055 + 42;
  return {
    m15: minutesToLabel((slot + 1) * 15),
    pr: Math.round(forecast),
    pl: PEAK_TARGET_KW,
    np: Math.round(current),
    op: PEAK_BASE_KW,
  };
};

/**
 * 기록일에 해당하는 15분 단위 피크 데이터를 만든다.
 *
 * @param date "YYYY-MM-DD" 형식 기록일
 */
export const getPeakHisSeries = (date: string): PeakHisSeries => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`기록일 형식이 올바르지 않습니다: ${date}`);
  }

  const factor = dateFactor(date);
  const seed = date.charCodeAt(date.length - 1) % 7;
  const points = Array.from({ length: PEAK_SLOT_COUNT }, (_unused, slot) =>
    buildPoint(slot, factor, seed),
  );
  const peak = points.reduce((best, point) => (point.np > best.np ? point : best), points[0]);

  return { date, points, maxPeak: peak.np, maxPeakAt: peak.m15 };
};
