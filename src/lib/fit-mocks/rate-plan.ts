/**
 * `/fit/rate-plan` (전기 요금 비교) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/plans/{fid}` 에서 `{ kepcoContract, contract, cost[] }`
 * 형태의 응답을 받아 표를 채운다. 클론은 실제 API 를 호출하지 않고 아래 목 데이터를 즉시
 * 사용한다. 값은 한전 산업용 전기요금표(고압/저압, 계절별·부하시간대별 전력량요금 원/kWh,
 * 기본요금 원/kW) 를 참고한 현실적인 예시이며 실제 고지 단가와는 다르다.
 *
 * 모든 객체는 `as const` 로 동결해 변형(mutation)을 막는다.
 */

/** 계절 구분 접미사: S=여름철, F=봄·가을철, W=겨울철 */
export type SeasonSuffix = "S" | "F" | "W";

/** 부하 구분 접두사: L=경부하, M=중부하, H=최대부하 */
export type LoadPrefix = "L" | "M" | "H";

/** 원본 API 의 전력량요금 키 (`costLS` ~ `costHW`) */
export type CostKey = `cost${LoadPrefix}${SeasonSuffix}`;

/** 원본 `cost[]` 배열 한 건. 기본요금(원/kW) + 계절·부하시간대별 전력량요금(원/kWh). */
export interface RatePlanCost {
  readonly costCode: string;
  /** 기본요금 (원/kW) */
  readonly basicCost: number;
  readonly costLS: number;
  readonly costMS: number;
  readonly costHS: number;
  readonly costLF: number;
  readonly costMF: number;
  readonly costHF: number;
  readonly costLW: number;
  readonly costMW: number;
  readonly costHW: number;
}

/** `#ratePlan1` / `#ratePlan2` 셀렉트의 요금제 목록 (빈 옵션 제외). */
export interface RatePlanOption {
  readonly value: string;
  readonly label: string;
}

export const RATE_PLAN_OPTIONS: readonly RatePlanOption[] = [
  { value: "IEHAS1", label: "산업용(을)고압A 선택I" },
  { value: "IEHAS2", label: "산업용(을)고압A 선택II" },
  { value: "IEHAS3", label: "산업용(을)고압A 선택III" },
  { value: "IEHBS1", label: "산업용(을)고압B 선택I" },
  { value: "IEHBS2", label: "산업용(을)고압B 선택II" },
  { value: "IEHBS3", label: "산업용(을)고압B 선택III" },
  { value: "IEHCS1", label: "산업용(을)고압C 선택I" },
  { value: "IEHCS2", label: "산업용(을)고압C 선택II" },
  { value: "IEHCS3", label: "산업용(을)고압C 선택III" },
  { value: "IGHAS1", label: "산업용(갑)II고압A 선택I" },
  { value: "IGHAS2", label: "산업용(갑)II고압A 선택II" },
  { value: "IGHBS1", label: "산업용(갑)II고압B 선택I" },
  { value: "IGHBS2", label: "산업용(갑)II고압B 선택II" },
  { value: "IGL1", label: "산업용(갑)I 저압" },
] as const;

/**
 * 요금제별 단가표.
 * 산업용(갑)I 저압(`IGL1`)은 부하시간대 구분이 없어 계절별 단일 단가를 3개 부하에 동일하게 넣는다.
 */
export const RATE_PLAN_COSTS: readonly RatePlanCost[] = [
  {
    costCode: "IEHAS1", basicCost: 6630,
    costLS: 100.6, costMS: 146.4, costHS: 216.5,
    costLF: 100.6, costMF: 109.5, costHF: 138.7,
    costLW: 109.7, costMW: 148.4, costHW: 204.5,
  },
  {
    costCode: "IEHAS2", basicCost: 7170,
    costLS: 96.6, costMS: 142.4, costHS: 212.5,
    costLF: 96.6, costMF: 105.5, costHF: 134.7,
    costLW: 105.7, costMW: 144.4, costHW: 200.5,
  },
  {
    costCode: "IEHAS3", basicCost: 8230,
    costLS: 93.0, costMS: 138.8, costHS: 208.9,
    costLF: 93.0, costMF: 101.9, costHF: 131.1,
    costLW: 102.1, costMW: 140.8, costHW: 196.9,
  },
  {
    costCode: "IEHBS1", basicCost: 6000,
    costLS: 97.5, costMS: 143.3, costHS: 213.4,
    costLF: 97.5, costMF: 106.4, costHF: 135.6,
    costLW: 106.6, costMW: 145.3, costHW: 201.4,
  },
  {
    costCode: "IEHBS2", basicCost: 6900,
    costLS: 93.5, costMS: 139.3, costHS: 209.4,
    costLF: 93.5, costMF: 102.4, costHF: 131.6,
    costLW: 102.6, costMW: 141.3, costHW: 197.4,
  },
  {
    costCode: "IEHBS3", basicCost: 7470,
    costLS: 90.0, costMS: 135.8, costHS: 205.9,
    costLF: 90.0, costMF: 98.9, costHF: 128.1,
    costLW: 99.1, costMW: 137.8, costHW: 193.9,
  },
  {
    costCode: "IEHCS1", basicCost: 6590,
    costLS: 96.9, costMS: 142.7, costHS: 212.8,
    costLF: 96.9, costMF: 105.8, costHF: 135.0,
    costLW: 106.0, costMW: 144.7, costHW: 200.8,
  },
  {
    costCode: "IEHCS2", basicCost: 7380,
    costLS: 92.9, costMS: 138.7, costHS: 208.8,
    costLF: 92.9, costMF: 101.8, costHF: 131.0,
    costLW: 102.0, costMW: 140.7, costHW: 196.8,
  },
  {
    costCode: "IEHCS3", basicCost: 8190,
    costLS: 89.4, costMS: 135.2, costHS: 205.3,
    costLF: 89.4, costMF: 98.3, costHF: 127.5,
    costLW: 98.5, costMW: 137.2, costHW: 193.3,
  },
  {
    costCode: "IGHAS1", basicCost: 5550,
    costLS: 105.5, costMS: 151.3, costHS: 221.4,
    costLF: 105.5, costMF: 114.4, costHF: 143.6,
    costLW: 114.6, costMW: 153.3, costHW: 209.4,
  },
  {
    costCode: "IGHAS2", basicCost: 6980,
    costLS: 101.9, costMS: 147.7, costHS: 217.8,
    costLF: 101.9, costMF: 110.8, costHF: 140.0,
    costLW: 111.0, costMW: 149.7, costHW: 205.8,
  },
  {
    costCode: "IGHBS1", basicCost: 5410,
    costLS: 104.0, costMS: 149.8, costHS: 219.9,
    costLF: 104.0, costMF: 112.9, costHF: 142.1,
    costLW: 113.1, costMW: 151.8, costHW: 207.9,
  },
  {
    costCode: "IGHBS2", basicCost: 6810,
    costLS: 100.4, costMS: 146.2, costHS: 216.3,
    costLF: 100.4, costMF: 109.3, costHF: 138.5,
    costLW: 109.5, costMW: 148.2, costHW: 204.3,
  },
  {
    costCode: "IGL1", basicCost: 6160,
    costLS: 121.1, costMS: 121.1, costHS: 121.1,
    costLF: 78.5, costMF: 78.5, costHF: 78.5,
    costLW: 109.4, costMW: 109.4, costHW: 109.4,
  },
] as const;

/** 원본 응답의 `kepcoContract` 기본값 — 요금제1 초기 선택값(현재 한전 계약 요금제). */
export const DEFAULT_KEPCO_CONTRACT = "IEHAS2";

/** 원본 응답의 `contract` 기본값 — 요금제2 초기 선택값(비교 대상 요금제). */
export const DEFAULT_CONTRACT = "IGL1";

/** 요금제 코드로 단가표를 찾는다. 미선택(빈 값)이거나 없는 코드면 `undefined`. */
export function findRatePlanCost(costCode: string): RatePlanCost | undefined {
  return RATE_PLAN_COSTS.find((row) => row.costCode === costCode);
}
