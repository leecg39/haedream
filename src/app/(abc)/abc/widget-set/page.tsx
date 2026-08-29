import type { Metadata } from "next";
import { AbcWidgetSet } from "@/components/abc/AbcWidgetSet";

export const metadata: Metadata = { title: "대시보드 화면설정" };

export default function Page() {
  return <AbcWidgetSet />;
}
