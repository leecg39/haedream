import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "피크상태", template: "%s" },
  description: "fit.rfenms.com 페이지 클론 (데모)",
  icons: { icon: "/fit/assets/img/favicon.ico" },
};

/**
 * fit 대시보드 전용 root layout.
 *
 * 루트 Tailwind(globals.css)를 상속하지 않는 별도 root layout 이다.
 * Tailwind preflight 의 `h1~h6 { font-size: inherit; font-weight: inherit }` 등이
 * 원본 common.css 와 충돌해 클론 정확도를 떨어뜨리기 때문에 의도적으로 분리했다.
 * 원본 CSS 는 public/fit/assets 에서 무변환으로 서빙되어 url(../img/...) 상대경로가
 * 그대로 해석된다.
 */
export default function FitAppRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fit/assets/css/common.css" precedence="high" />
      </head>
      <body id="dashboard">{children}</body>
    </html>
  );
}
