/**
 * 업체 도메인 타입.
 *
 * 한전 비밀번호(`kepcoPasswd`)와 원문 수집 payload는 어떤 공개 DTO에도 넣지 않는다.
 */

export interface FirmRow {
  readonly fid: number;
  readonly firmName: string;
  readonly registTime: string;
  readonly contract: string;
  readonly kepcoNo: string;
  readonly eoiTime: number;
  readonly pct_ratio: number;
  readonly peakLast: number;
  readonly powerLimit: number;
  readonly peakRunMode: 0 | 1;
  readonly peakControlMode: 0 | 1;
  readonly isDisable: 0 | 1;
  readonly serviceType: number;
  readonly memo: string;
  readonly frugal: number;
  readonly contractLimit: number;
  readonly ableLowPower: number;
  readonly maxAbleWatt: number;
  readonly maxAbleDate: number;
  readonly pass: string;
  readonly degreeCity: number;
  readonly bone: string;
  readonly kepcoCyber: string;
  /** 서버 내부 전용. API/DTO에 포함하지 않는다. */
  readonly kepcoPasswd?: string;
  readonly manager: string;
  readonly phone: string;
  readonly addressText: string;
  readonly checkDay: number;
  readonly ableLimit: number;
  readonly ableLimitTime: string;
  readonly pulse_num: number;
  readonly frugalTime: string;
  readonly investGold: number;
  readonly kepcoContract: string;
  readonly boss: string;
  readonly mapGeo: string;
}

/**
 * API 응답으로 나가는 업체 표현.
 * 한전 비밀번호는 타입 수준에서 제외한다.
 */
export type PublicFirm = Omit<FirmRow, "kepcoPasswd">;

/** 상단 셀렉트·레이아웃용 최소 옵션. */
export interface FirmOptionDto {
  readonly fid: number;
  readonly name: string;
}

/**
 * 목록/표용 최소 필드. 연락처·주소·지도 좌표 등 PII는 넣지 않는다.
 */
export interface FirmListItemDto {
  readonly fid: number;
  readonly firmName: string;
  readonly registTime: string;
  readonly contract: string;
  readonly kepcoNo: string;
  readonly eoiTime: number;
  readonly pct_ratio: number;
  readonly peakLast: number;
  readonly powerLimit: number;
  readonly peakRunMode: 0 | 1;
  readonly peakControlMode: 0 | 1;
  readonly isDisable: 0 | 1;
  readonly serviceType: number;
  readonly memo: string;
  readonly frugal: number;
  readonly contractLimit: number;
  readonly ableLowPower: number;
  readonly maxAbleWatt: number;
  readonly maxAbleDate: number;
  readonly pass: string;
  readonly degreeCity: number;
  readonly bone: string;
  readonly checkDay: number;
  readonly ableLimit: number;
  readonly ableLimitTime: string;
  readonly pulse_num: number;
  readonly frugalTime: string;
  readonly investGold: number;
  readonly kepcoContract: string;
}

/** 상세/편집용. 권한에 따라 PII가 마스킹될 수 있다. */
export type FirmDetailDto = PublicFirm;
