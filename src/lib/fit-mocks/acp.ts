/**
 * `/fit/acp` (시스템에어컨 관리) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/acp/*` 를 1.5 초 주기로 폴링하지만, 클론은
 * 실제 API 를 호출하지 않는다. 아래 값은 국내 업무용 건물의 시스템에어컨(LG ACP4 /
 * ACP5) 운영 화면에서 볼 수 있는 현실적인 예시 값이다.
 * 모든 상수는 `as const` 로 동결해 변형(mutation)을 막는다.
 */

/** 운전모드 라벨. 원본 `acp.js` 의 `['자동','냉방','난방','송풍','제습']` 과 동일. */
export const ACP_DRIVE_MODES = ["자동", "냉방", "난방", "송풍", "제습"] as const;

/** 풍량 라벨. 원본 `acp.js` 의 `['자동','약풍','중풍','강풍']` 과 동일. */
export const ACP_FAN_SPEEDS = ["자동", "약풍", "중풍", "강풍"] as const;

/** 통신상태 게이지 20 칸 색상. 원본 `randerAirStat` 의 `connColors` 원문 그대로. */
export const ACP_CONN_COLORS = [
  "#d32f2f", "#cc3d32", "#c84533", "#c54c34", "#c15436",
  "#bd5b37", "#ba6238", "#b66a3a", "#b3713b", "#af793d",
  "#ac803e", "#a8883f", "#a48f40", "#a19742", "#9d9e43",
  "#9aa544", "#96ad46", "#92b447", "#8fbc49", "#8bc34a",
] as const;

/** 게이지 미점등 색상. */
export const ACP_GAUGE_OFF_COLOR = "rgba(80,80,80,.6)";

/** 도면 포인트 상태 클래스. `acp.css` 의 `.mapStart/.mapStop/.mapRequest/.mapFan`. */
export type AcpPointKind = "mapStart" | "mapStop" | "mapRequest" | "mapFan";

export interface AcpMapPoint {
  /** `.mapPoint` 절대 위치 (도면 이미지 기준 백분율). */
  readonly top: string;
  readonly left: string;
  readonly kind: AcpPointKind;
}

export interface AcpFacility {
  readonly idn: number;
  readonly airName: string;
  /** `ACP_DRIVE_MODES` 인덱스. */
  readonly driveMode: number;
  /** 원본 규칙: `1` 이면 정지, 그 외는 운전. */
  readonly status: number;
  readonly temperature: number;
  readonly setTemperature: number;
  /** `ACP_FAN_SPEEDS` 인덱스. */
  readonly fanspeed: number;
  /** 도면(층) 코드. 원본의 `mid`. */
  readonly mid: number;
  readonly point: AcpMapPoint;
}

export interface AcpFloorMap {
  /** `#floorMapName` 상단 라벨. */
  readonly floorMapName: string;
  /** `#floorPlanName` 하단 라벨. */
  readonly floorName: string;
  /** `#floorMapImage` src. */
  readonly floorFile: string;
}

export interface AcpStat {
  /** `#acpPeakType` 운전방식. */
  readonly peakType: string;
  /** 통신상태 게이지 점등 칸 수(0~20). */
  readonly statConn: number;
  /** 희망운전율(%). */
  readonly rateHope: number;
  /** 현재운전율(%). */
  readonly rateCurrent: number;
  /** 제어동작상태 — 참이면 `운전 (제어)` 표시. */
  readonly isOperation: boolean;
  readonly floorMap: AcpFloorMap;
  readonly facilities: readonly AcpFacility[];
}

export interface AcpConfig {
  /** 0 사용안함 · 1 ACP4 · 2 ACP5 · 3 DMS 2.5 */
  readonly acpType: string;
  readonly ip: string;
  readonly portNo: string;
  readonly id: string;
  readonly passwd: string;
  readonly isLocal: boolean;
  /** 제어시 희망운전율(%) — 0~100, 5 단위. */
  readonly ratePeak: number;
  /** 0 수동 · 1 자동 */
  readonly controlMode: string;
  /** 동작상태 수동제어 토글. */
  readonly statPeak: boolean;
}

export interface AcpUnitOption {
  readonly idn: number;
  readonly nickname: string;
}

/** `#acpIdn` 셀렉트 항목. */
export const ACP_UNITS: readonly AcpUnitOption[] = [
  { idn: 1, nickname: "본관 시스템에어컨 (ACP4)" },
  { idn: 2, nickname: "별관 시스템에어컨 (ACP5)" },
] as const;

const MAIN_FACILITIES: readonly AcpFacility[] = [
  {
    idn: 101, airName: "3층 대회의실", driveMode: 1, status: 0,
    temperature: 25.4, setTemperature: 24, fanspeed: 2, mid: 31,
    point: { top: "14%", left: "18%", kind: "mapStart" },
  },
  {
    idn: 102, airName: "3층 임원실", driveMode: 1, status: 0,
    temperature: 24.8, setTemperature: 24, fanspeed: 1, mid: 31,
    point: { top: "14%", left: "34%", kind: "mapStart" },
  },
  {
    idn: 103, airName: "3층 사무실 A", driveMode: 1, status: 1,
    temperature: 27.1, setTemperature: 25, fanspeed: 0, mid: 31,
    point: { top: "30%", left: "26%", kind: "mapStop" },
  },
  {
    idn: 104, airName: "3층 사무실 B", driveMode: 3, status: 0,
    temperature: 26.2, setTemperature: 25, fanspeed: 3, mid: 31,
    point: { top: "30%", left: "48%", kind: "mapFan" },
  },
  {
    idn: 105, airName: "3층 전산실", driveMode: 1, status: 0,
    temperature: 22.6, setTemperature: 22, fanspeed: 3, mid: 31,
    point: { top: "52%", left: "20%", kind: "mapStart" },
  },
  {
    idn: 106, airName: "3층 휴게실", driveMode: 4, status: 1,
    temperature: 27.9, setTemperature: 26, fanspeed: 1, mid: 31,
    point: { top: "52%", left: "62%", kind: "mapStop" },
  },
  {
    idn: 107, airName: "3층 복도 동측", driveMode: 0, status: 0,
    temperature: 26.7, setTemperature: 26, fanspeed: 0, mid: 31,
    point: { top: "70%", left: "40%", kind: "mapRequest" },
  },
  {
    idn: 108, airName: "3층 복도 서측", driveMode: 0, status: 0,
    temperature: 26.5, setTemperature: 26, fanspeed: 0, mid: 31,
    point: { top: "70%", left: "76%", kind: "mapRequest" },
  },
] as const;

const ANNEX_FACILITIES: readonly AcpFacility[] = [
  {
    idn: 201, airName: "별관 1층 로비", driveMode: 1, status: 0,
    temperature: 26.9, setTemperature: 26, fanspeed: 2, mid: 41,
    point: { top: "20%", left: "22%", kind: "mapStart" },
  },
  {
    idn: 202, airName: "별관 1층 교육장", driveMode: 1, status: 1,
    temperature: 28.3, setTemperature: 25, fanspeed: 0, mid: 41,
    point: { top: "20%", left: "58%", kind: "mapStop" },
  },
  {
    idn: 203, airName: "별관 2층 연구실", driveMode: 2, status: 0,
    temperature: 23.1, setTemperature: 24, fanspeed: 1, mid: 41,
    point: { top: "44%", left: "34%", kind: "mapStart" },
  },
  {
    idn: 204, airName: "별관 2층 실험실", driveMode: 1, status: 0,
    temperature: 24.4, setTemperature: 23, fanspeed: 3, mid: 41,
    point: { top: "44%", left: "70%", kind: "mapFan" },
  },
  {
    idn: 205, airName: "별관 3층 창고", driveMode: 3, status: 1,
    temperature: 29.2, setTemperature: 27, fanspeed: 0, mid: 41,
    point: { top: "68%", left: "30%", kind: "mapStop" },
  },
  {
    idn: 206, airName: "별관 3층 기계실", driveMode: 0, status: 0,
    temperature: 30.1, setTemperature: 28, fanspeed: 2, mid: 41,
    point: { top: "68%", left: "66%", kind: "mapRequest" },
  },
] as const;

const ACP_STAT_BY_UNIT: Readonly<Record<number, AcpStat>> = {
  1: {
    peakType: "피크 우선순위 제어",
    statConn: 17,
    rateHope: 70,
    rateCurrent: 55,
    isOperation: true,
    floorMap: {
      floorMapName: "본관 3층 냉난방제어 도면",
      floorName: "본관 3층",
      floorFile: "/fit/assets/img/empty.png",
    },
    facilities: MAIN_FACILITIES,
  },
  2: {
    peakType: "대기중",
    statConn: 9,
    rateHope: 45,
    rateCurrent: 30,
    isOperation: false,
    floorMap: {
      floorMapName: "별관 2층 냉난방제어 도면",
      floorName: "별관 2층",
      floorFile: "/fit/assets/img/empty.png",
    },
    facilities: ANNEX_FACILITIES,
  },
} as const;

const ACP_CONFIG_BY_UNIT: Readonly<Record<number, AcpConfig>> = {
  1: {
    acpType: "1",
    ip: "192.168.10.31",
    portNo: "9000",
    id: "fitadmin",
    passwd: "acp4demo",
    isLocal: true,
    ratePeak: 60,
    controlMode: "1",
    statPeak: true,
  },
  2: {
    acpType: "2",
    ip: "192.168.20.44",
    portNo: "9100",
    id: "fitoper",
    passwd: "acp5demo",
    isLocal: false,
    ratePeak: 40,
    controlMode: "0",
    statPeak: false,
  },
} as const;

/** 기본 선택 설비(원본은 셀렉트의 첫 항목을 자동 선택한다). */
export const ACP_DEFAULT_IDN = ACP_UNITS[0].idn;

export function findAcpStat(idn: number): AcpStat {
  return ACP_STAT_BY_UNIT[idn] ?? ACP_STAT_BY_UNIT[ACP_DEFAULT_IDN];
}

export function findAcpConfig(idn: number): AcpConfig {
  return ACP_CONFIG_BY_UNIT[idn] ?? ACP_CONFIG_BY_UNIT[ACP_DEFAULT_IDN];
}

export function driveModeLabel(driveMode: number): string {
  return ACP_DRIVE_MODES[driveMode] ?? ACP_DRIVE_MODES[0];
}

export function fanSpeedLabel(fanspeed: number): string {
  return ACP_FAN_SPEEDS[fanspeed] ?? ACP_FAN_SPEEDS[0];
}

/** 원본 규칙: `status == 1` 이면 정지, 그 외는 운전. */
export function statusLabel(status: number): string {
  return status === 1 ? "정지" : "운전";
}
