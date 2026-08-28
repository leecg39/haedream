import type { FitFirmOption, FitStatusBadge } from "@/types/fit";

/** 데모용 업체 목록 (원본 #firmSelect 는 API 로 채워진다) */
export const FIT_DEMO_FIRMS: readonly FitFirmOption[] = [
  { fid: 1, name: "한국미래에너지 본사" },
  { fid: 121, name: "제1공장" },
  { fid: 122, name: "제2공장" },
];

/** 데모용 상단 상태 배지 */
export const FIT_DEMO_STATUS: FitStatusBadge = {
  level: "normal",
  text: "보통  이번주 피크현황이 안정적입니다.",
};
