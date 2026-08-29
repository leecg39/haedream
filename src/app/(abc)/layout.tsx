import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "ABC EMS", template: "%s · ABC EMS" },
  description: "watt.rfenms.com 관리자 페이지 클론 (데모)",
  icons: { icon: "/abc/assets/img/favicon.ico" },
};

/**
 * ABC EMS(watt) 전용 root layout — EggFit(fit)와 분리된 별도 영역.
 *
 * 원본 watt 관리자 페이지는 <body id="dashboard" class="darkmode"> 이고
 * .darkmode 가 그라디언트 배경을 준다. CSS 는 watt 원본 무변환 미러
 * (public/abc/assets/css)에서 로드하며, watt common.css 가 정의 없이 쓰는
 * --color-font 는 abc-extras.css 가 채운다.
 *
 * 모든 ABC 관리자 페이지가 동일 CSS 세트를 쓰므로 여기서 한 번만 로드한다
 * (fit 처럼 페이지 전환마다 CSS 를 교체할 필요가 없다).
 */
export default function AbcRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/abc/assets/css/common.css" precedence="high" />
        <link rel="stylesheet" href="/abc/assets/css/deskLib.css" precedence="default" />
        <link rel="stylesheet" href="/abc/assets/css/bad.css" precedence="default" />
        <link rel="stylesheet" href="/abc/assets/css/net.css" precedence="default" />
        <link rel="stylesheet" href="/abc/assets/css/widgetSet.css" precedence="default" />
        <link rel="stylesheet" href="/abc/assets/css/lib/tui-date-picker.css" precedence="default" />
        <link rel="stylesheet" href="/abc/clone-css/abc-extras.css" precedence="default" />
      </head>
      <body id="dashboard" className="darkmode">{children}</body>
    </html>
  );
}
