import { z } from "zod";

/**
 * 업체 등록 입력 검증.
 *
 * 폼 입력은 전부 문자열로 들어오므로 숫자 필드는 preprocess 로 변환한다.
 * `strictObject` 라 스키마에 없는 키가 오면 요청 전체를 거부한다 —
 * 편집 폼에 한전 비밀번호 칸(`edit-kepcoPasswd`)이 있지만 저장 대상이 아니므로
 * 여기에 정의하지 않는다. 클라이언트가 실수로 실어 보내도 이 지점에서 막힌다.
 */

function numericInput(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? undefined : Number(trimmed);
    }
    return value;
  }, schema);
}

/** 빈 문자열을 허용하는 선택 문자열. 길이 상한은 편집 폼 maxLength 와 맞춘다. */
const text = (max: number) => z.string().trim().max(max).default("");

const count = (max: number, message: string) =>
  numericInput(z.number().int(message).min(0, message).max(max, message)).default(0);

export const firmCreateSchema = z.strictObject({
  firmName: z
    .string()
    .trim()
    .min(1, "업체 이름을 입력해 주세요.")
    .max(32, "업체 이름은 32자 이하로 입력해 주세요."),
  contract: text(16),
  kepcoNo: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9]*$/, "한전고객번호는 숫자만 입력해 주세요.")
    .default(""),
  bone: text(16),
  kepcoCyber: text(32),
  manager: text(16),
  phone: text(16),
  addressText: text(180),
  memo: text(32),
  pass: text(16),
  boss: text(16),
  mapGeo: text(32),
  kepcoContract: text(16),
  registTime: text(24),
  ableLimitTime: text(10),
  frugalTime: text(10),
  degreeCity: count(9999, "기상청 지점코드가 올바르지 않습니다."),
  checkDay: numericInput(
    z.number().int().min(0, "검침일은 1~31 사이여야 합니다.").max(31, "검침일은 1~31 사이여야 합니다."),
  ).default(0),
  contractLimit: count(65535, "계약전력이 범위를 벗어났습니다."),
  ableLimit: count(65535, "요금적용전력이 범위를 벗어났습니다."),
  ableLowPower: count(65535, "저압 적용전력이 범위를 벗어났습니다."),
  powerLimit: count(65535, "목표전력이 범위를 벗어났습니다."),
  peakLast: count(65535, "최근전력이 범위를 벗어났습니다."),
  maxAbleWatt: count(65535, "최근 5개년 피크가 범위를 벗어났습니다."),
  maxAbleDate: count(999912, "피크 발생연월이 올바르지 않습니다."),
  pct_ratio: count(8388608, "PCT비가 범위를 벗어났습니다."),
  pulse_num: count(65535, "펄스정수가 범위를 벗어났습니다."),
  eoiTime: count(86400, "EOI 주기가 범위를 벗어났습니다."),
  frugal: count(2147483647, "연간절감금액이 범위를 벗어났습니다."),
  investGold: count(4294967295, "투자금액이 범위를 벗어났습니다."),
  serviceType: count(99, "서비스상태 값이 올바르지 않습니다."),
  peakRunMode: numericInput(z.number().int().min(0).max(1)).default(0),
  peakControlMode: numericInput(z.number().int().min(0).max(1)).default(0),
  isDisable: numericInput(z.number().int().min(0).max(1)).default(0),
});

/**
 * 호출 측이 넘기는 값의 타입. default 가 붙은 필드는 선택이고 숫자 필드는
 * 문자열도 받으므로 출력 타입(z.output)이 아니라 입력 타입을 쓴다.
 */
export type FirmCreateInput = z.input<typeof firmCreateSchema>;

/** 검증을 통과한 뒤의 값 — 전 필드가 채워져 있다. */
export type FirmRecord = z.output<typeof firmCreateSchema>;
