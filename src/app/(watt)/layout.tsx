import type { Metadata } from "next";
import { Agentation } from "agentation";
import "../globals.css";

export const metadata: Metadata = {
  title: "SolarSimz · ABC 에너지 통합관제 클론",
  description: "watt.rfenms.com 페이지 클론 (데모)",
  icons: {
    icon: "/assets/img/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
