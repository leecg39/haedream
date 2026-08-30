/**
 * 업체관리(`/fit/firm`) 데모 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/firm` 에서 fetch 한다.
 * 클론은 실제 운영 DB 덤프(`data/firm-details.csv`)를
 * `scripts/import-firm-csv.mjs` 로 변환한 `firm-rows.json` 을 사용한다.
 * 한전 비밀번호는 이 클라이언트 공유 모듈에 병합하지 않는다.
 * 서버 수집 경로는 `@/lib/kepco/credentials.server`에서만 자격증명을 읽는다.
 * 모든 값은 읽기 전용이며 소비하는 쪽에서 절대 변형하지 않는다.
 */
import firmRowsJson from "./firm-rows.json";

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
export const FIRM_PAGE_LIMIT = 5;

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
  /** 0 우선순위 / 1 순차 */
  readonly peakControlMode: 0 | 1;
  /** 0 활성 / 1 비활성 */
  readonly isDisable: 0 | 1;
  readonly serviceType: number;
  readonly memo: string;
  /** 연간절감금액(원) (CSV 덤프에 없어 0) */
  readonly frugal: number;
  /** 계약전력 kW */
  readonly contractLimit: number;
  /** 저압 적용전력 kW (0 이면 계약전력 사용) */
  readonly ableLowPower: number;
  /** 최근 5개년 피크 kW (CSV 덤프에 없어 0) */
  readonly maxAbleWatt: number;
  /** 최근 5개년 피크 발생연월 `YYYYMM` */
  readonly maxAbleDate: number;
  /** 제안서 구분 표기 */
  readonly pass: string;
  /** 기상청 지점코드 */
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

/**
 * 실제 운영 DB 1,654건. 재생성: node scripts/import-firm-csv.mjs
 * 비밀번호는 의도적으로 병합하지 않으며 서버 전용 credential loader에서만 읽는다.
 */
export const FIRM_ROWS: readonly FirmRow[] = Object.freeze(firmRowsJson as FirmRow[]);

/** 원본 vio.kakaoMap 의 기본 좌표(청주 인근). 데모 지도 모달 표시용. */
export const FIRM_DEFAULT_GEO = "127.4888, 36.6426";
