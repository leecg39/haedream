import { FIRM_CONTRACT_LABELS } from "@/lib/fit-mocks/firm";

/**
 * 원본 firm.html `#modal` 편집 폼의 필드 정의.
 * 라벨·id·타입·제약(maxLength/min/max)을 원본 마크업에서 그대로 옮겼다.
 */

export type FirmFieldKind = "text" | "number" | "date" | "select";

export interface FirmEditField {
  readonly id: string;
  readonly label: string;
  readonly kind: FirmFieldKind;
  /** `.tip` 으로 표시되는 라벨 툴팁 (원본 data-tip) */
  readonly tip?: string;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  /** 기상청 지점 셀렉트처럼 optgroup 구조가 필요한 필드 */
  readonly grouped?: boolean;
  readonly placeholder?: string;
}

const PEAK_RUN_MODE = [
  { value: "0", label: "수동" },
  { value: "1", label: "자동" },
] as const;

const PEAK_CONTROL_MODE = [
  { value: "0", label: "우선순위" },
  { value: "1", label: "순차제어" },
] as const;

const IS_DISABLE = [
  { value: "0", label: "활성" },
  { value: "1", label: "비활성" },
] as const;

const SERVICE_TYPE = [
  { value: "0", label: "선택없음" },
  { value: "1", label: "EMS" },
  { value: "2", label: "피크" },
  { value: "3", label: "저압 완료" },
  { value: "11", label: "EMS 준비" },
  { value: "12", label: "피크 준비" },
  { value: "13", label: "저압 준비" },
  { value: "21", label: "EMS 제안" },
  { value: "22", label: "피크 제안" },
  { value: "23", label: "저압 제안" },
] as const;

/**
 * 원본은 `<option value="">전력타입 선택</option>` 하나만 정적으로 두고,
 * firm.js 가 `vio._contract`(24개 계약종별)를 `insertAdjacentHTML` 로 뒤에 붙인다.
 * 클론은 정적 데이터라 처음부터 전량을 채운다.
 */
const CONTRACT_OPTIONS = [
  { value: "", label: "전력타입 선택" },
  ...Object.entries(FIRM_CONTRACT_LABELS).map(([value, label]) => ({ value, label })),
] as const;

export const FIRM_EDIT_FIELDS: readonly FirmEditField[] = [
  { id: "edit-firmName", label: "이름", kind: "text", maxLength: 32 },
  { id: "edit-degreeCity", label: "기상청지점", kind: "select", tip: "냉방도일/난방도일 측정 위치기준", grouped: true },
  { id: "edit-contract", label: "전력타입", kind: "select", tip: "최대전력관리 사용은 필수", options: CONTRACT_OPTIONS },
  { id: "edit-kepcoNo", label: "한전고객번호", kind: "number", step: 1, min: 0, max: 4294967295 },
  { id: "edit-bone", label: "EMS 아이디", kind: "text", maxLength: 16 },
  { id: "edit-kepcoCyber", label: "한전 ID", kind: "text", tip: "한전고객번호와 다를경우 입력", maxLength: 32 },
  { id: "edit-passwd", label: "EMS 암호변경", kind: "text", maxLength: 16 },
  { id: "edit-kepcoPasswd", label: "한전 비밀번호", kind: "text", maxLength: 32 },
  { id: "edit-manager", label: "담당자", kind: "text", maxLength: 16 },
  { id: "edit-phone", label: "연락처", kind: "text", maxLength: 16 },
  { id: "edit-addressText", label: "주소", kind: "text", maxLength: 180 },
  { id: "edit-checkDay", label: "검침일", kind: "number", step: 1, min: 1, max: 31 },
  { id: "edit-contractLimit", label: "계약전력", kind: "number", step: 1, min: 0, max: 65535 },
  { id: "edit-ableLimit", label: "요금적용전력", kind: "number", step: 1, min: 0, max: 65535 },
  { id: "edit-ableLimitTime", label: "요금적용날짜", kind: "date" },
  { id: "edit-powerLimit", label: "목표전력", kind: "number", step: 1, min: 0, max: 65535 },
  { id: "edit-pct_ratio", label: "PCT비", kind: "number", step: 1, min: 0, max: 8388608 },
  { id: "edit-pulse_num", label: "펄스정수", kind: "number", step: 1, min: 0, max: 65535 },
  { id: "edit-peakRunMode", label: "운전모드", kind: "select", options: PEAK_RUN_MODE },
  { id: "edit-peakControlMode", label: "제어방식", kind: "select", options: PEAK_CONTROL_MODE },
  { id: "edit-isDisable", label: "EMS 활성", kind: "select", options: IS_DISABLE },
  { id: "edit-serviceType", label: "서비스상태", kind: "select", options: SERVICE_TYPE },
  { id: "edit-frugalTime", label: "절감계산시작일", kind: "date" },
  { id: "edit-investGold", label: "투자금액(천원)", kind: "number", step: 1, min: 0, max: 4294967295 },
  { id: "edit-kepcoContract", label: "이전 전력타입", kind: "select", tip: "한전수전합리화", options: CONTRACT_OPTIONS },
  { id: "edit-boss", label: "관리계정", kind: "text", maxLength: 16 },
  { id: "edit-memo", label: "메모", kind: "text", maxLength: 32 },
];
