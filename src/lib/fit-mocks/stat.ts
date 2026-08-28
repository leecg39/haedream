/**
 * 통합관제(stat) 페이지 데모 데이터.
 *
 * 원본은 https://watt.rfenms.com/api/* 에서 fetch 하지만
 * 클론은 네트워크 호출 없이 아래 목 데이터를 즉시 사용한다.
 */

/** 정렬 셀렉트(#orderBy) 가 지원하는 값 */
export type StatOrderBy =
  | ""
  | "firmNameDESC"
  | "firmNameASC"
  | "thisPowerDESC"
  | "thisPowerASC"
  | "frugalRatioDESC"
  | "frugalRatioASC"
  | "frugalMonthDESC"
  | "frugalMonthASC";

/** 랭킹 필터(#rankingFilter) 가 지원하는 값 */
export type StatRankingPeriod = "today" | "week" | "month" | "year";

export interface StatFirm {
  readonly fid: number;
  readonly firmName: string;
  /** 계약전력 (kW) */
  readonly contractLimit: number;
  /** 실시간 전력 (kW) */
  readonly thisPower: number;
  /** 절감률 (%/월별) */
  readonly frugalRatio: number;
  /** 절감금액 (원/월별) */
  readonly frugalMonth: number;
  /** 피크발생 → .statusIcon.warning */
  readonly peak: boolean;
  /** 통신불량 → .statusIcon.emergency */
  readonly netError: boolean;
}

export interface StatQuarterValues {
  readonly today: number;
  readonly week: number;
  readonly month: number;
  readonly year: number;
}

export interface StatPeakDetail {
  readonly fid: number;
  readonly firmName: string;
  /** 사용 전력 (kW) */
  readonly usedWatt: StatQuarterValues;
  /** 절감률 (%) */
  readonly frugalRatio: StatQuarterValues;
  /** 절감금액 (만원) */
  readonly frugalAmount: StatQuarterValues;
  /** 총 절감금액 (원) */
  readonly frugalTotal: number;
  /** 계약전력 (kW) */
  readonly contractLimit: number;
  /** 검침일 */
  readonly checkDay: number;
  readonly manager: string;
  readonly phone: string;
  readonly addressText: string;
}

export interface StatSummary {
  readonly preCount: number;
  readonly frugalCount: number;
  readonly preTotal: number;
  readonly frugalTotal: number;
  readonly updateTime: string;
  readonly elapsedTime: number;
  readonly startDate: string;
}

export interface StatRankingItem {
  readonly firmName: string;
  /** 절감금액 (원) */
  readonly frugal: number;
}

export interface StatAlarm {
  readonly id: string;
  readonly category: string;
  readonly date: string;
  readonly title: string;
}

/** [업체명, 계약전력, 실시간전력, 절감률, 절감금액, 플래그(1=피크, 2=통신불량, 3=둘다)] */
type StatFirmSeed = readonly [string, number, number, number, number, number];

const FIRM_SEEDS: readonly StatFirmSeed[] = [
  ["대성정밀공업 본사", 850, 612, 12.4, 4_820_000, 0],
  ["한빛에너지 제1공장", 1200, 1043, 9.8, 6_310_000, 1],
  ["동양화학 울산공장", 2400, 1876, 15.2, 12_450_000, 0],
  ["세종산업 오송지점", 300, 214, 7.1, 1_240_000, 2],
  ["가온테크 평택캠퍼스", 1500, 1288, 11.6, 8_070_000, 0],
  ["신성물산 대구물류센터", 640, 498, 6.3, 1_980_000, 0],
  ["한라알미늄 창원공장", 3200, 2740, 18.9, 21_600_000, 1],
  ["미래바이오 청주연구소", 420, 336, 5.4, 1_120_000, 0],
  ["광명전기 안산공장", 980, 742, 13.7, 5_540_000, 0],
  ["태산식품 익산공장", 760, 611, 8.2, 2_860_000, 2],
  ["삼우기계 김해공장", 540, 405, 10.5, 2_310_000, 0],
  ["예원섬유 대전공장", 460, 322, 4.9, 940_000, 0],
  ["청우제지 전주공장", 1800, 1522, 16.4, 14_280_000, 1],
  ["누리테크 구미사업장", 720, 588, 9.1, 3_040_000, 0],
  ["백두냉동 부산물류", 1100, 964, 12.8, 7_120_000, 0],
  ["한성정공 시흥공장", 880, 703, 11.2, 4_460_000, 0],
  ["금강화섬 여수공장", 2600, 2210, 17.5, 18_930_000, 3],
  ["명진전자 수원사업장", 350, 268, 6.8, 1_060_000, 0],
  ["우성테크노 파주공장", 1400, 1176, 14.3, 9_580_000, 0],
  ["보람유업 천안공장", 620, 471, 7.9, 2_150_000, 0],
  ["강원목재 원주공장", 480, 351, 5.1, 1_010_000, 2],
  ["대륙기전 광주공장", 1650, 1398, 13.1, 10_240_000, 0],
  ["삼익냉열 인천공장", 940, 786, 10.7, 4_930_000, 1],
  ["푸른들농산 나주센터", 380, 289, 6.2, 1_180_000, 0],
  ["에코플랜트 포항공장", 2100, 1742, 15.9, 15_670_000, 0],
  ["신흥제약 화성공장", 810, 645, 9.5, 3_620_000, 0],
  ["동림산업 군산공장", 1300, 1094, 12.1, 7_890_000, 0],
  ["오성정밀 진주공장", 560, 428, 8.6, 2_470_000, 2],
  ["한울전선 청원공장", 700, 552, 11.9, 3_980_000, 0],
  ["대명섬유 경산공장", 450, 338, 5.7, 1_090_000, 0],
  ["삼정유리 충주공장", 1750, 1466, 14.8, 11_930_000, 1],
  ["해성물류 평택센터", 660, 521, 7.4, 2_030_000, 0],
  ["신라케미칼 경주공장", 2300, 1958, 16.8, 17_240_000, 0],
  ["가야식품 함안공장", 520, 397, 6.6, 1_460_000, 0],
  ["대동중공업 창원2공장", 2900, 2436, 19.4, 23_180_000, 3],
  ["한결에너지 세종사옥", 320, 236, 4.5, 820_000, 0],
  ["동해상사 강릉공장", 590, 462, 8.9, 2_640_000, 0],
  ["광양제철기공 광양공장", 2000, 1704, 15.1, 14_060_000, 0],
  ["미성전기 안양공장", 430, 327, 7.6, 1_330_000, 2],
  ["백광산업 울산2공장", 1550, 1312, 13.4, 10_710_000, 1],
  ["서진테크 천안2공장", 690, 543, 9.3, 3_180_000, 0],
  ["푸드원 김천공장", 510, 386, 6.1, 1_240_000, 0],
  ["한독기계 부천공장", 870, 692, 11.4, 4_720_000, 0],
  ["신영정공 대구2공장", 1250, 1048, 12.6, 7_460_000, 0],
  ["정우섬유 구미2공장", 470, 355, 5.8, 1_070_000, 0],
];

const MANAGER_POOL: readonly string[] = [
  "김도현 과장",
  "이서준 대리",
  "박지훈 부장",
  "최은우 팀장",
  "정하윤 주임",
];

const ADDRESS_POOL: readonly string[] = [
  "경기도 화성시 동탄산단1길 24",
  "충청북도 청주시 흥덕구 산단로 88",
  "경상남도 창원시 성산구 공단로 310",
  "전라북도 익산시 석암로 152",
  "인천광역시 서구 가좌로 41",
];

/** 리스트 한 페이지에 표시되는 행 수 (원본 .listBody 의 dataRow 개수) */
export const STAT_ROWS_PER_PAGE = 15;

export const STAT_FIRMS: readonly StatFirm[] = FIRM_SEEDS.map(
  ([firmName, contractLimit, thisPower, frugalRatio, frugalMonth, flags], index) => ({
    fid: 1001 + index,
    firmName,
    contractLimit,
    thisPower,
    frugalRatio,
    frugalMonth,
    peak: (flags & 1) === 1,
    netError: (flags & 2) === 2,
  }),
);

export const STAT_SUMMARY: StatSummary = {
  preCount: 128,
  frugalCount: 45,
  preTotal: 3_284_600_000,
  frugalTotal: 1_942_180_000,
  updateTime: "2026-08-28 09:15:00",
  elapsedTime: 412,
  startDate: "2025.07.12",
};

export const STAT_RANKING: Readonly<Record<StatRankingPeriod, readonly StatRankingItem[]>> = {
  today: [
    { firmName: "대동중공업 창원2공장", frugal: 812_000 },
    { firmName: "한라알미늄 창원공장", frugal: 736_000 },
    { firmName: "금강화섬 여수공장", frugal: 654_000 },
    { firmName: "신라케미칼 경주공장", frugal: 588_000 },
    { firmName: "에코플랜트 포항공장", frugal: 521_000 },
  ],
  week: [
    { firmName: "대동중공업 창원2공장", frugal: 5_240_000 },
    { firmName: "한라알미늄 창원공장", frugal: 4_870_000 },
    { firmName: "금강화섬 여수공장", frugal: 4_310_000 },
    { firmName: "신라케미칼 경주공장", frugal: 3_920_000 },
    { firmName: "청우제지 전주공장", frugal: 3_450_000 },
  ],
  month: [
    { firmName: "대동중공업 창원2공장", frugal: 23_180_000 },
    { firmName: "한라알미늄 창원공장", frugal: 21_600_000 },
    { firmName: "금강화섬 여수공장", frugal: 18_930_000 },
    { firmName: "신라케미칼 경주공장", frugal: 17_240_000 },
    { firmName: "에코플랜트 포항공장", frugal: 15_670_000 },
  ],
  year: [
    { firmName: "대동중공업 창원2공장", frugal: 268_400_000 },
    { firmName: "한라알미늄 창원공장", frugal: 241_900_000 },
    { firmName: "금강화섬 여수공장", frugal: 213_500_000 },
    { firmName: "신라케미칼 경주공장", frugal: 196_700_000 },
    { firmName: "청우제지 전주공장", frugal: 172_300_000 },
  ],
};

export const STAT_ALARMS: readonly StatAlarm[] = [
  {
    id: "alarm-01",
    category: "통신상태 오류",
    date: "2026-08-28 08:52:10",
    title: "세종산업 오송지점 1호기 통신끊김(23분 전)",
  },
  {
    id: "alarm-02",
    category: "통신상태 오류",
    date: "2026-08-28 07:31:44",
    title: "태산식품 익산공장 2호기 통신끊김(1시간 전)",
  },
  {
    id: "alarm-03",
    category: "통신상태 오류",
    date: "2026-08-28 06:04:19",
    title: "강원목재 원주공장 1호기 통신끊김(3시간 전)",
  },
  {
    id: "alarm-04",
    category: "통신상태 오류",
    date: "2026-08-27 22:18:03",
    title: "오성정밀 진주공장 3호기 통신끊김(11시간 전)",
  },
  {
    id: "alarm-05",
    category: "통신상태 오류",
    date: "2026-08-27 19:47:36",
    title: "미성전기 안양공장 1호기 통신끊김(13시간 전)",
  },
  {
    id: "alarm-06",
    category: "통신상태 오류",
    date: "2026-08-27 15:22:58",
    title: "금강화섬 여수공장 4호기 통신끊김(18시간 전)",
  },
];

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * 업체 상세정보(지도 오버레이) 데모 값.
 *
 * 원본은 별도 API 응답이지만, 클론은 목록 값에서 결정적으로 파생시킨다.
 */
export function buildPeakDetail(firm: StatFirm): StatPeakDetail {
  const index = firm.fid - 1001;
  const usedToday = Math.round(firm.thisPower * 7.4);

  return {
    fid: firm.fid,
    firmName: firm.firmName,
    usedWatt: {
      today: usedToday,
      week: usedToday * 6,
      month: usedToday * 26,
      year: usedToday * 302,
    },
    frugalRatio: {
      today: round1(firm.frugalRatio),
      week: round1(firm.frugalRatio - 0.6),
      month: round1(firm.frugalRatio - 1.2),
      year: round1(firm.frugalRatio - 2.1),
    },
    frugalAmount: {
      today: Math.round(firm.frugalMonth / 260_000),
      week: Math.round(firm.frugalMonth / 43_000),
      month: Math.round(firm.frugalMonth / 10_000),
      year: Math.round((firm.frugalMonth * 11.4) / 10_000),
    },
    frugalTotal: Math.round(firm.frugalMonth * 13.6),
    contractLimit: firm.contractLimit,
    checkDay: (index % 4) * 5 + 5,
    manager: MANAGER_POOL[index % MANAGER_POOL.length],
    phone: `010-${2000 + index}-${4500 + index}`,
    addressText: ADDRESS_POOL[index % ADDRESS_POOL.length],
  };
}
