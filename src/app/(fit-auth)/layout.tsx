import type { Metadata } from "next";
import { Agentation } from "agentation";

export const metadata: Metadata = {
  title: "한국미래에너지",
  description: "fit.rfenms.com 로그인 페이지 클론 (데모)",
  icons: { icon: "/fit/assets/img/favicon.ico" },
};

/**
 * fit 로그인 전용 root layout.
 * 원본 login.html 은 body 에 `logBody` 클래스를 주어 배경을 loginbg.jpg 로 바꾸므로
 * 대시보드(body#dashboard)와 별도의 root layout 으로 분리했다.
 */
export default function FitAuthRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/fit/assets/css/common.css" precedence="high" />
        <link rel="stylesheet" href="/fit/assets/css/login.css" precedence="default" />
      </head>
      <body className="logBody">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
