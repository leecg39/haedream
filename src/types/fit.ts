/** fit.rfenms.com 클론 공용 타입 */

export interface FitNavItem {
  /** 원본 leftnav.html 의 li id */
  readonly id: string;
  readonly href: string;
  /** bootstrap-icons 클래스명 (예: "bi-speedometer2") */
  readonly icon: string;
  readonly label: string;
  /**
   * 원본에서 기본 `.disable` 이며 권한에 따라 해제되는 메뉴.
   * stat: isGroup(fid) / firm: permit>0 && fid===1 / research: permit>0
   */
  readonly restricted?: boolean;
}

/** 상단 피크 상태 배지. 원본 #currentStatus 의 4개 li 중 하나만 노출된다. */
export type FitStatusLevel = "badbad" | "bad" | "normal" | "good";

export interface FitStatusBadge {
  readonly level: FitStatusLevel;
  readonly text: string;
}

export interface FitFirmOption {
  readonly fid: number;
  readonly name: string;
}

/** 원본 base.js 가 localStorage 로 관리하는 권한 플래그 */
export interface FitPermissions {
  readonly fid: number;
  readonly permit: number;
  readonly isGroup: boolean;
}
