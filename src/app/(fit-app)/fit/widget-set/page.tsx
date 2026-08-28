import type { Metadata } from "next";
import { WidgetSettings } from "@/components/fit/admin/WidgetSettings";

export const metadata: Metadata = {
  title: "대시보드 화면설정",
};

export default function Page() {
  return <WidgetSettings />;
}
