/**
 * 업체관리 UI용 공개 상수.
 *
 * 실제 업체 배열은 이 모듈에 두지 않는다. 클라이언트 번들로 흘러가지 않도록
 * 서버 repository/DTO 와 DB 시드만 업체 원본을 다룬다.
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

/** 원본 vio.kakaoMap 의 기본 좌표(청주 인근). 데모 지도 모달 표시용. */
export const FIRM_DEFAULT_GEO = "127.4888, 36.6426";

/** @deprecated Prefer `@/features/firms/types` — kept for gradual migration. */
export type { FirmRow } from "@/features/firms/types";
