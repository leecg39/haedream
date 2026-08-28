/**
 * 원본 페이지들이 공통으로 링크하는 서드파티 스타일시트.
 *
 * PageStyles 는 "use client" 모듈이라 서버 컴포넌트에서 이 상수를 직접
 * import 할 수 없다(클라이언트 경계 너머로는 컴포넌트만 전달된다).
 * 그래서 상수는 경계 밖 일반 모듈에 둔다.
 *
 * common.css 는 root layout 이 이미 로드하므로 여기에는 넣지 않는다.
 */
export const LIB_STYLES = [
  "/fit/assets/css/lib/tom-select.css",
  "/fit/assets/css/lib/tui-date-picker.css",
] as const;

export const FIT_CSS_PREFIX = "/fit/assets/css/";

/** 모든 페이지가 공유하므로 절대 비활성화하지 않는다. */
export const ALWAYS_ENABLED_CSS = `${FIT_CSS_PREFIX}common.css`;
