/**
 * 업체관리(`/fit/firm`) 공용 타입·라벨.
 *
 * 실제 고객 목록 JSON(`firm-rows.json`)은 이 모듈에 넣지 않는다.
 * 클라이언트 번들로 전체 카탈로그가 새면 tenant_firm_access 경계를 우회한다.
 * DB 시드/스크립트는 `firm-rows.json` 을 직접 읽고, 런타임 목록은 `/api/firm` 만 쓴다.
 */

/** 전력타입 코드 → 한글 설명 (원본 firm.js `vio._contract`). */
export const FIRM_CONTRACT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  IEHAS1: "산업용(을)고압A 선택I",
  IEHAS2: "산업용(을)고압A 선택II",
  IEHAS3: "산업용(을)고압A 선택III",
  IEHBS1: "산업용(을)고압B 선택I",
  IEHBS2: "산업용(을)고압B 선택II",
  IEHBS3: "산업용(을)고압B 선택III",
  IEHCS1: "산업용(을)고압C 선택I",
  IEHCS2: "산업용(을)고압C 선택II",
  IEHCS3: "산업용(을)고압C 선택III",
  IGHAS1: "산업용(갑)II고압A 선택I",
  IGHAS2: "산업용(갑)II고압A 선택II",
  IGHBS1: "산업용(갑)II고압B 선택I",
  IGHBS2: "산업용(갑)II고압B 선택II",
  IGL1: "산업용(갑)I 저압",
  NEHAS1: "일반용(을)고압A 선택I",
  NEHAS2: "일반용(을)고압A 선택II",
  NEHAS3: "일반용(을)고압A 선택III",
  NEHBS1: "일반용(을)고압B 선택I",
  NEHBS2: "일반용(을)고압B 선택II",
  NEHBS3: "일반용(을)고압B 선택III",
  NGHAS1: "일반용(갑)II고압A 선택I",
  NGHAS2: "일반용(갑)II고압A 선택II",
  NGHBS1: "일반용(갑)II고압B 선택I",
  NGHBS2: "일반용(갑)II고압B 선택II",
  NGL1: "일반용(갑)I 저압",
});

/** 서비스상태 코드 → 표 노출 라벨 (원본 firm.js `vio._serviceType`). */
export const FIRM_SERVICE_TYPE_LABELS: Readonly<Record<number, string>> = Object.freeze({
  0: "",
  1: "EMS",
  2: "피크",
  3: "저압",
  11: "EMS 준비",
  12: "피크 준비",
  13: "저압 준비",
  21: "EMS 제안",
  22: "피크 제안",
  23: "저압 제안",
});

/** 한 페이지에 노출하는 행 수. 원본 `dbListLimit` 대응. */
export const FIRM_PAGE_LIMIT = 10;

/** 정렬 가능한 컬럼 키 (원본 `th[data-sort]`). */
export type FirmSortKey = "fid" | "firmName" | "contract" | "kepcoNo" | "registTime" | "frugal";

export interface FirmRow {
  /** 업체 ID */
  readonly fid: number;
  readonly firmName: string;
  /** 업체등록일 `YYYY-MM-DD HH:mm:ss` (CSV 덤프에 없어 빈값) */
  readonly registTime: string;
  /** 전력타입 코드 */
  readonly contract: string;
  /** 한전고객번호. 앞자리 0 보존을 위해 문자열, 빈값이면 미등록 */
  readonly kepcoNo: string;
  /** EOI 주기(초). 0 이면 미사용 */
  readonly eoiTime: number;
  readonly pct_ratio: number;
  /** 최근전력 kW */
  readonly peakLast: number;
  /** 목표전력 kW */
  readonly powerLimit: number;
  /** 0 수동 / 1 자동 */
  readonly peakRunMode: 0 | 1;
  /** 0 개별 / 1 전체 */
  readonly peakControlMode: 0 | 1;
  readonly isDisable: 0 | 1;
  /** 1 EMS / 2 피크 / 3 저압 / 11~23 준비·제안 */
  readonly serviceType: number;
  readonly memo: string;
  /** 누적절감금액(원) */
  readonly frugal: number;
  /** 계약전력 kW */
  readonly contractLimit: number;
  readonly ableLowPower: number;
  readonly maxAbleWatt: number;
  readonly maxAbleDate: number;
  readonly pass: string;
  readonly degreeCity: number;
  readonly bone: string;
  readonly kepcoCyber: string;
  /** 한전 사이버지점 비밀번호 (CSV 덤프 원본 값) */
  readonly kepcoPasswd: string;
  readonly manager: string;
  readonly phone: string;
  readonly addressText: string;
  /** 검침일 1~31 */
  readonly checkDay: number;
  /** 요금적용전력 kW */
  readonly ableLimit: number;
  /** 요금적용날짜 `YYYY-MM-DD` */
  readonly ableLimitTime: string;
  readonly pulse_num: number;
  /** 절감계산시작일 `YYYY-MM-DD` */
  readonly frugalTime: string;
  /** 투자금액(천원) */
  readonly investGold: number;
  /** 이전 전력타입 코드 */
  readonly kepcoContract: string;
  readonly boss: string;
  /** `경도, 위도`. 미등록이면 빈값 */
  readonly mapGeo: string;
}

/** 원본 vio.kakaoMap 의 기본 좌표(청주 인근). 데모 지도 모달 표시용. */
export const FIRM_DEFAULT_GEO = "127.4888, 36.6426";
