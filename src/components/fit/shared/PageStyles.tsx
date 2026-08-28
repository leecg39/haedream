"use client";

/**
 * 원본 페이지들이 공통으로 링크하는 서드파티 스타일시트.
 * common.css 는 root layout 이 이미 로드하므로 여기에는 넣지 않는다.
 */
export const LIB_STYLES = [
  "/fit/assets/css/lib/tom-select.css",
  "/fit/assets/css/lib/tui-date-picker.css",
] as const;

export function PageStyles({ files }: { readonly files: readonly string[] }) {
  return (
    <>
      {files.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="fit-page" />
      ))}
    </>
  );
}

/**
 * 원본 아이콘 스프라이트(`/fit/assets/img/icons.svg`)를 `<use>` 로 참조한다.
 * `.peakDetailItemIcon svg { display:block; width:1rem; height:1rem }` 가
 * 이 구조에 의존하므로 부트스트랩 아이콘으로 대체하면 크기가 어긋난다.
 */
