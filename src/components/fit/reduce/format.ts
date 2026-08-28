/** 원본 `vio.echoNumber` 와 동일한 천 단위 구분 포맷. 로케일 비의존이라 SSR/CSR 결과가 같다. */
export const echoNumber = (value: number): string =>
  `${value}`.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, "$1,");

/** 증감 아이콘 클래스. 원본 `dataTransCompare` 규칙 그대로. */
export const caretClass = (value: number): string => {
  if (value > 0) {
    return "bi bi-caret-up-fill";
  }
  if (value < 0) {
    return "bi bi-caret-down-fill";
  }
  return "bi";
};
