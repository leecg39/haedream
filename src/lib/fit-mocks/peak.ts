/**
 * `/fit/peak` (피크상태) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/*` 를 폴링하지만 클론은 실제 API 를 호출하지
 * 않는다. 아래 값들은 국내 산업용 고압 수용가(계약전력 1,600kW) 기준의 현실적인
 * 예시 값이다. 모든 객체는 `as const` 로 동결해 변형(mutation)을 막는다.
 */

/** 피크 상태 색상 토큰. 원본 JS 가 `.peakArea` 에 붙이는 상태 클래스와 동일하다. */
export type PeakLevel = "blue" | "orange" | "red";

export interface PeakHeaderInfo {
  readonly meterDate: string;
  readonly dataVerifyRate: string;
  readonly meterDateApplied: boolean;
  readonly alarmEnabled: boolean;
}

export interface PeakRealtimeInfo {
  readonly level: PeakLevel;
  readonly loadCount: number;
  /** 실시간 피크율(%) — 게이지 바늘 각도와 `#realTimePeakRatio` 에 쓰인다. */
  readonly ratio: number;
  /** 15분 계량 주기 경과 표시 (`00:00 /` 형식) */
  readonly timeDigit: string;
  /** 계기시간 */
  readonly ableTime: string;
  /** 시간차(초) */
  readonly timeDiff: number;
  /** `#peakMeterOn` 게이지 폭(%) */
  readonly timeProgress: number;
}

export interface PeakPointValue {
  readonly label: string;
  readonly value: string;
}

export interface PeakSortInfo {
  readonly contract: string;
  readonly over: string;
  readonly nine: string;
  readonly eight: string;
}

export interface GoalItem {
  readonly type: "hour" | "day" | "week" | "month" | "year";
  /** 원본 span 클래스 접두사 (`hourFrugal`, `todayWatt` 등) */
  readonly prefix: string;
  readonly title: string;
  readonly frugal: string;
  readonly frugalGoal: string;
  readonly watt: string;
  readonly lowBill: string;
  readonly highBill: string;
  readonly ratio: string;
  /** 목표 달성률(%) — 원형 게이지 및 막대 게이지 폭 */
  readonly achieved: number;
}

export interface RoiInfo {
  readonly frugalDays: string;
  readonly investRatio: number;
  readonly investGold: string;
  readonly frugal: string;
}

export const PEAK_HEADER: PeakHeaderInfo = {
  meterDate: "15일",
  dataVerifyRate: "99.7%",
  meterDateApplied: true,
  alarmEnabled: false,
} as const;

export const PEAK_REALTIME: PeakRealtimeInfo = {
  level: "blue",
  loadCount: 4,
  ratio: 74.8,
  timeDigit: "07:12 /",
  ableTime: "13:24:36",
  timeDiff: 2,
  timeProgress: 48,
} as const;

/** 예측/목표/현재/기준 전력 (kW) */
export const PEAK_POINTS: readonly PeakPointValue[] = [
  { label: "예측 전력", value: "1,248" },
  { label: "목표 전력", value: "1,500" },
  { label: "현재 전력", value: "1,196" },
  { label: "기준 전력", value: "1,600" },
] as const;

export const PEAK_SORT: PeakSortInfo = {
  contract: "1,600",
  over: "2",
  nine: "7",
  eight: "15",
} as const;

export const PEAK_GOALS: readonly GoalItem[] = [
  {
    type: "hour",
    prefix: "hour",
    title: "1시간",
    frugal: "12,480",
    frugalGoal: "15,000",
    watt: "1,196",
    lowBill: "214,300",
    highBill: "201,820",
    ratio: "5.8",
    achieved: 83,
  },
  {
    type: "day",
    prefix: "today",
    title: "오늘",
    frugal: "268,400",
    frugalGoal: "320,000",
    watt: "27,840",
    lowBill: "4,982,600",
    highBill: "4,714,200",
    ratio: "5.4",
    achieved: 84,
  },
  {
    type: "week",
    prefix: "week",
    title: "이번 주",
    frugal: "1,742,900",
    frugalGoal: "2,240,000",
    watt: "189,300",
    lowBill: "33,120,500",
    highBill: "31,377,600",
    ratio: "5.3",
    achieved: 78,
  },
  {
    type: "month",
    prefix: "month",
    title: "이번 달",
    frugal: "7,912,400",
    frugalGoal: "7,680,000",
    watt: "812,600",
    lowBill: "142,480,000",
    highBill: "134,567,600",
    ratio: "5.6",
    achieved: 103,
  },
  {
    type: "year",
    prefix: "year",
    title: "올해",
    frugal: "68,340,500",
    frugalGoal: "92,160,000",
    watt: "9,468,200",
    lowBill: "1,662,340,000",
    highBill: "1,593,999,500",
    ratio: "4.1",
    achieved: 74,
  },
] as const;

export const PEAK_ROI: RoiInfo = {
  frugalDays: "412",
  investRatio: 63,
  investGold: "108,000,000",
  frugal: "68,340,500",
} as const;

/** 실시간 피크 추이 차트(#chartPeak) 데모 시계열. 0~100 스케일. */
export const PEAK_TREND: readonly number[] = [
  38, 41, 46, 44, 52, 58, 55, 61, 67, 64, 71, 76, 73, 78, 82, 79, 75, 72, 68, 70, 74, 77, 73, 69,
] as const;

/** 실시간 전력 사용 추이(#wattChart) 데모 시간대별 사용량. */
export interface WattBar {
  /** 시간 라벨 */
  readonly hour: string;
  /** 사용량 0~100 스케일 */
  readonly value: number;
  /** 부하대 구분 */
  readonly band: "max" | "mid" | "low";
}

export const WATT_BARS: readonly WattBar[] = [
  { hour: "00", value: 32, band: "low" },
  { hour: "01", value: 28, band: "low" },
  { hour: "02", value: 26, band: "low" },
  { hour: "03", value: 27, band: "low" },
  { hour: "04", value: 30, band: "low" },
  { hour: "05", value: 35, band: "low" },
  { hour: "06", value: 44, band: "low" },
  { hour: "07", value: 52, band: "low" },
  { hour: "08", value: 68, band: "mid" },
  { hour: "09", value: 79, band: "mid" },
  { hour: "10", value: 88, band: "max" },
  { hour: "11", value: 94, band: "max" },
  { hour: "12", value: 71, band: "mid" },
  { hour: "13", value: 86, band: "max" },
  { hour: "14", value: 92, band: "max" },
  { hour: "15", value: 89, band: "max" },
  { hour: "16", value: 81, band: "mid" },
  { hour: "17", value: 76, band: "mid" },
  { hour: "18", value: 66, band: "mid" },
  { hour: "19", value: 58, band: "mid" },
  { hour: "20", value: 51, band: "mid" },
  { hour: "21", value: 45, band: "mid" },
  { hour: "22", value: 39, band: "low" },
  { hour: "23", value: 34, band: "low" },
] as const;

/** 산업용(을)고압 / 산업용(갑)저압 요금 라인. 0~100 스케일. */
export const BILL_HIGH_LINE: readonly number[] = [
  22, 20, 19, 19, 21, 24, 30, 36, 47, 55, 62, 66, 50, 60, 65, 63, 57, 53, 46, 41, 36, 32, 27, 24,
] as const;

export const BILL_LOW_LINE: readonly number[] = [
  27, 25, 24, 24, 26, 30, 37, 44, 57, 66, 74, 79, 60, 72, 78, 75, 68, 63, 55, 49, 43, 38, 33, 29,
] as const;
