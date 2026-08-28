"use client";

import { useEffect } from "react";
import { ALWAYS_ENABLED_CSS, FIT_CSS_PREFIX, LIB_STYLES } from "@/lib/fit-styles";

export { LIB_STYLES };


/**
 * 페이지 전용 스타일시트를 로드한다.
 *
 * 원본은 MPA 라 한 번에 한 페이지의 CSS 만 문서에 존재한다. 클론은 클라이언트
 * 라우팅을 쓰는데, React 19 는 `precedence` 로 hoist 한 스타일시트를 컴포넌트가
 * 언마운트돼도 문서에서 제거하지 않는다(재사용을 위한 의도된 동작). 그래서
 * 페이지를 옮길수록 이전 페이지 CSS 가 계속 쌓인다.
 *
 * 페이지 CSS 들은 `.sheet` `.deskTool` `.chart1` 같은 공통 클래스를 서로 다른
 * 값으로 106개나 중복 정의하기 때문에, 누적되면 나중에 로드된 규칙이 이겨서
 * 레이아웃이 깨진다. 새로고침하면 해당 페이지 CSS 만 남아 정상으로 보인다.
 *
 * React 가 관리하는 link 노드를 직접 제거하면 내부 레지스트리와 어긋날 수 있어,
 * 표준 `HTMLLinkElement.disabled` 로 켜고 끈다. 뒤로 가기로 되돌아오면 다시
 * 활성화된다.
 */
export function PageStyles({ files }: { readonly files: readonly string[] }) {
  const wantedKey = files.join("|");

  useEffect(() => {
    const wanted = new Set(wantedKey.split("|"));

    for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
      const path = new URL(link.href, window.location.origin).pathname;

      if (!path.startsWith(FIT_CSS_PREFIX) || !path.endsWith(".css")) continue;
      if (path === ALWAYS_ENABLED_CSS) continue;

      link.disabled = !wanted.has(path);
    }
  }, [wantedKey]);

  return (
    <>
      {files.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="fit-page" />
      ))}
    </>
  );
}
