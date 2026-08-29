import type { Metadata } from "next";
import { AbcResearchPanel } from "@/components/abc/AbcResearchPanel";

export const metadata: Metadata = { title: "한전 파워플래너 연동" };

export default function Page() {
  return <AbcResearchPanel />;
}
