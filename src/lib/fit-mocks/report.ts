/**
 * 저압 절감 보고서(`/fit/report`) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/*` 에서 fetch 하지만, 클론은 실제 API 를 호출하지
 * 않는다. 여기 값은 모두 데모용이며 계산 로직(합계·절감률)만 원본 report.js 와 동일하다.
 */

/** 원본 API 가 내려주는 월별 원시 행. 파생값(고압/저압 소계, 절감액)은 계산으로 구한다. */
export type ReportMonthlyRow = {
  /** `YYYYMM` */
  readonly yyyymm: string;
  /** 요금적용전력 (kW) */
  readonly powerAble: number;
  /** 사용전력량 (kWh) */
  readonly usePower: number;
  /** 경부하 사용량 (kWh) */
  readonly lloadUsekwh: number;
  /** 중부하 사용량 (kWh) */
  readonly mloadUsekwh: number;
  /** 최대부하 사용량 (kWh) */
  readonly maxloadUsekwh: number;
  /** 고압 기본요금 (원) */
  readonly highBill: number;
  /** 고압 전력량요금+a (원) */
  readonly highUseBill: number;
  /** 저압 기본요금 (원) */
  readonly lowBill: number;
  /** 저압 전력량요금+a (원) */
  readonly lowUseBill: number;
};

/** 파생값이 채워진 행. */
export type ReportComputedRow = ReportMonthlyRow & {
  /** 고압 소계 */
  readonly high: number;
  /** 저압 소계 */
  readonly low: number;
  /** 월 절감액 */
  readonly frugal: number;
  /** 누적 절감액 */
  readonly accFrugal: number;
};

export type ReportTotals = {
  readonly powerAble: number;
  readonly usePower: number;
  readonly lloadUsekwh: number;
  readonly mloadUsekwh: number;
  readonly maxloadUsekwh: number;
  readonly highBill: number;
  readonly highUseBill: number;
  readonly highSum: number;
  readonly lowBill: number;
  readonly lowUseBill: number;
  readonly lowSum: number;
  readonly frugal: number;
  /** 절감률 (%) */
  readonly rate: number;
  /** 월 평균 절감액 */
  readonly avgFrugal: number;
  /** 일 평균 절감액 */
  readonly avgFrugalDaily: number;
  readonly monthCount: number;
};

/** 상단 요약(전력타입·기본요금단가·최근 5개년 피크). */
export const REPORT_SUMMARY = {
  /** 전력타입 */
  lastContract: "고압A 선택Ⅱ",
  /** 기본요금단가 */
  lastContractCost: "8,320원/kW",
  /** 최근 5개년 피크 (kW) */
  maxAbleWatt: "128",
  /** 최근 5개년 피크 연도 */
  maxAbleDate: "2021",
} as const;

/** 저압 전환 시점(`YYYYMM`). 이 달은 `change`, 이후는 `low` 표시를 받는다. */
export const REPORT_FRUGAL_YM = 202405;

/** 조회 기간 기본값. */
export const REPORT_DEFAULT_PERIOD = {
  start: "2024-01",
  end: "2024-12",
} as const;

/** 월별 원시 데이터 (오름차순). */
export const REPORT_MONTHLY_ROWS: readonly ReportMonthlyRow[] = [
  {
    yyyymm: "202401",
    powerAble: 118,
    usePower: 38420,
    lloadUsekwh: 14980,
    mloadUsekwh: 15310,
    maxloadUsekwh: 8130,
    highBill: 981760,
    highUseBill: 4726660,
    lowBill: 726880,
    lowUseBill: 4572980,
  },
  {
    yyyymm: "202402",
    powerAble: 115,
    usePower: 35180,
    lloadUsekwh: 13720,
    mloadUsekwh: 14060,
    maxloadUsekwh: 7400,
    highBill: 956800,
    highUseBill: 4327140,
    lowBill: 708400,
    lowUseBill: 4186420,
  },
  {
    yyyymm: "202403",
    powerAble: 109,
    usePower: 32640,
    lloadUsekwh: 12930,
    mloadUsekwh: 12880,
    maxloadUsekwh: 6830,
    highBill: 906880,
    highUseBill: 3949440,
    lowBill: 671440,
    lowUseBill: 3819880,
  },
  {
    yyyymm: "202404",
    powerAble: 104,
    usePower: 30510,
    lloadUsekwh: 12210,
    mloadUsekwh: 11950,
    maxloadUsekwh: 6350,
    highBill: 865280,
    highUseBill: 3661200,
    lowBill: 640640,
    lowUseBill: 3538000,
  },
  {
    yyyymm: "202405",
    powerAble: 101,
    usePower: 31860,
    lloadUsekwh: 12440,
    mloadUsekwh: 12610,
    maxloadUsekwh: 6810,
    highBill: 840320,
    highUseBill: 3843830,
    lowBill: 622160,
    lowUseBill: 3716120,
  },
  {
    yyyymm: "202406",
    powerAble: 112,
    usePower: 36940,
    lloadUsekwh: 13980,
    mloadUsekwh: 14620,
    maxloadUsekwh: 8340,
    highBill: 931840,
    highUseBill: 4546310,
    lowBill: 689920,
    lowUseBill: 4396860,
  },
  {
    yyyymm: "202407",
    powerAble: 126,
    usePower: 44780,
    lloadUsekwh: 16240,
    mloadUsekwh: 17930,
    maxloadUsekwh: 10610,
    highBill: 1048320,
    highUseBill: 5642280,
    lowBill: 776160,
    lowUseBill: 5449640,
  },
  {
    yyyymm: "202408",
    powerAble: 128,
    usePower: 46320,
    lloadUsekwh: 16610,
    mloadUsekwh: 18540,
    maxloadUsekwh: 11170,
    highBill: 1064960,
    highUseBill: 5871420,
    lowBill: 788480,
    lowUseBill: 5670960,
  },
  {
    yyyymm: "202409",
    powerAble: 117,
    usePower: 39860,
    lloadUsekwh: 15080,
    mloadUsekwh: 15840,
    maxloadUsekwh: 8940,
    highBill: 973440,
    highUseBill: 4922610,
    lowBill: 720720,
    lowUseBill: 4756820,
  },
  {
    yyyymm: "202410",
    powerAble: 106,
    usePower: 33120,
    lloadUsekwh: 13040,
    mloadUsekwh: 13160,
    maxloadUsekwh: 6920,
    highBill: 881920,
    highUseBill: 4008520,
    lowBill: 652960,
    lowUseBill: 3875040,
  },
  {
    yyyymm: "202411",
    powerAble: 113,
    usePower: 36270,
    lloadUsekwh: 14120,
    mloadUsekwh: 14490,
    maxloadUsekwh: 7660,
    highBill: 940160,
    highUseBill: 4460210,
    lowBill: 696080,
    lowUseBill: 4314130,
  },
  {
    yyyymm: "202412",
    powerAble: 121,
    usePower: 40950,
    lloadUsekwh: 15790,
    mloadUsekwh: 16410,
    maxloadUsekwh: 8750,
    highBill: 1006720,
    highUseBill: 5057820,
    lowBill: 745360,
    lowUseBill: 4886060,
  },
] as const;

/** 천 단위 구분자. 로케일에 의존하지 않아 SSR/CSR 결과가 항상 동일하다. */
export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 소수 둘째 자리까지 반올림. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 원시 행에 고압/저압 소계·절감액·누적 절감액을 채운다. (원본 report.js 와 동일 계산) */
export function computeRows(
  rows: readonly ReportMonthlyRow[],
): readonly ReportComputedRow[] {
  return rows.reduce<readonly ReportComputedRow[]>((acc, row) => {
    const high = row.highBill + row.highUseBill;
    const low = row.lowBill + row.lowUseBill;
    const frugal = high - low;
    const prevAcc = acc.length > 0 ? acc[acc.length - 1].accFrugal : 0;
    return [...acc, { ...row, high, low, frugal, accFrugal: prevAcc + frugal }];
  }, []);
}

type ReportSums = Omit<
  ReportTotals,
  "rate" | "avgFrugal" | "avgFrugalDaily" | "monthCount"
>;

const EMPTY_SUMS: ReportSums = {
  powerAble: 0,
  usePower: 0,
  lloadUsekwh: 0,
  mloadUsekwh: 0,
  maxloadUsekwh: 0,
  highBill: 0,
  highUseBill: 0,
  highSum: 0,
  lowBill: 0,
  lowUseBill: 0,
  lowSum: 0,
  frugal: 0,
};

const EMPTY_TOTALS: ReportTotals = {
  ...EMPTY_SUMS,
  rate: 0,
  avgFrugal: 0,
  avgFrugalDaily: 0,
  monthCount: 0,
};

/** 합계·절감률·평균 절감액을 계산한다. */
export function computeTotals(rows: readonly ReportComputedRow[]): ReportTotals {
  if (rows.length === 0) {
    return EMPTY_TOTALS;
  }

  const sums = rows.reduce<ReportSums>(
    (acc, row) => ({
      powerAble: acc.powerAble + row.powerAble,
      usePower: acc.usePower + row.usePower,
      lloadUsekwh: acc.lloadUsekwh + row.lloadUsekwh,
      mloadUsekwh: acc.mloadUsekwh + row.mloadUsekwh,
      maxloadUsekwh: acc.maxloadUsekwh + row.maxloadUsekwh,
      highBill: acc.highBill + row.highBill,
      highUseBill: acc.highUseBill + row.highUseBill,
      highSum: acc.highSum + row.high,
      lowBill: acc.lowBill + row.lowBill,
      lowUseBill: acc.lowUseBill + row.lowUseBill,
      lowSum: acc.lowSum + row.low,
      frugal: acc.frugal + row.frugal,
    }),
    EMPTY_SUMS,
  );

  const rate =
    sums.highSum && sums.lowSum
      ? round2(((sums.highSum - sums.lowSum) / sums.highSum) * 100)
      : 0;
  const avgFrugal = Math.round(sums.frugal / rows.length);

  return {
    ...sums,
    rate,
    avgFrugal,
    avgFrugalDaily: Math.round(avgFrugal / 30),
    monthCount: rows.length,
  };
}

/** 기간(`YYYY-MM`) 으로 월별 행을 필터링한다. */
export function filterByPeriod(
  rows: readonly ReportMonthlyRow[],
  start: string,
  end: string,
): readonly ReportMonthlyRow[] {
  const from = start.replace("-", "");
  const to = end.replace("-", "");
  return rows.filter((row) => row.yyyymm >= from && row.yyyymm <= to);
}

/** 부하대별 사용량 툴팁 문구 (원본 `useText`). */
export function buildUseText(
  lload: number,
  mload: number,
  maxload: number,
  total: number,
): string {
  const ratio = (value: number) => (total ? round2((value / total) * 100) : 0);
  return [
    `경부하: ${formatNumber(lload)} (${ratio(lload)}%)`,
    `중부하: ${formatNumber(mload)} (${ratio(mload)}%)`,
    `최대부하: ${formatNumber(maxload)} (${ratio(maxload)}%)`,
  ].join("\n");
}

/** 기본 데이터셋(전체 기간)의 계산 결과. */
export const REPORT_COMPUTED_ROWS = computeRows(REPORT_MONTHLY_ROWS);
export const REPORT_TOTALS = computeTotals(REPORT_COMPUTED_ROWS);
