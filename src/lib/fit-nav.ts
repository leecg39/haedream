import type { FitNavItem, FitPermissions } from "@/types/fit";

/**
 * 원본 include/leftnav.html 의 메뉴 14개.
 * 라벨과 아이콘 클래스는 원본에서 그대로 가져왔다.
 */
export const FIT_NAV_ITEMS: readonly FitNavItem[] = [
  { id: "stat", href: "/fit/stat", icon: "bi-globe2", label: "통합관제", restricted: true },
  { id: "firm", href: "/fit/firm", icon: "bi-building", label: "업체관리", restricted: true },
  { id: "research", href: "/fit/research", icon: "bi-boxes", label: "한전데이터 수집", restricted: true },
  { id: "peak", href: "/fit/peak", icon: "bi-speedometer2", label: "피크상태" },
  { id: "peakPanel", href: "/fit/peak-panel", icon: "bi-activity", label: "부하상황판" },
  { id: "peakSet", href: "/fit/peak-set", icon: "bi-gear-wide-connected", label: "피크 제어설정" },
  { id: "peakHis", href: "/fit/peak-his", icon: "bi-graph-up", label: "피크 그래프" },
  { id: "powerUsage", href: "/fit/power-usage", icon: "bi-clipboard-data", label: "전력 사용 보고서" },
  { id: "peakUsage", href: "/fit/peak-usage", icon: "bi-bar-chart", label: "피크 15분 전력보고서" },
  { id: "controlHis", href: "/fit/control-his", icon: "bi-bezier2", label: "피크제어이력" },
  { id: "acp", href: "/fit/acp", icon: "bi-fan", label: "시스템에어컨" },
  { id: "ratePlan", href: "/fit/rate-plan", icon: "bi-calculator", label: "전기 요금 비교" },
  { id: "reduce", href: "/fit/reduce", icon: "bi-bar-chart-fill", label: "저압 절감 분석" },
  { id: "report", href: "/fit/report", icon: "bi-clipboard-data-fill", label: "저압 절감 보고서" },
] as const;

/** 원본 base.js vio.isGroup(fid) 의 그룹 fid 목록 */
const GROUP_FIDS: readonly number[] = [
  1, 80, 81, 82, 83, 84, 85, 87, 88, 89, 326, 558, 559, 560, 561, 562, 563, 564, 565, 963,
];

export function isGroupFid(fid: number): boolean {
  return GROUP_FIDS.includes(fid);
}

/**
 * 원본 base.js 의 권한 규칙대로 메뉴 노출 여부를 계산한다.
 * 데모에서는 전체 노출이 기본값이다.
 */
export function isNavItemVisible(item: FitNavItem, permissions: FitPermissions): boolean {
  if (!item.restricted) return true;

  switch (item.id) {
    case "stat":
      return permissions.isGroup;
    case "firm":
      return permissions.permit > 0 && permissions.fid === 1;
    case "research":
      return permissions.permit > 0;
    default:
      return true;
  }
}

/** 데모용 기본 권한 — 원본 메뉴 14개를 모두 노출한다. */
export const FIT_DEMO_PERMISSIONS: FitPermissions = {
  fid: 1,
  permit: 1,
  isGroup: true,
};
