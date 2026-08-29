import type { Metadata } from "next";
import { AbcRealtimeData } from "@/components/abc/AbcRealtimeData";

export const metadata: Metadata = { title: "실시간 데이터" };

export default function Page() {
  return <AbcRealtimeData />;
}
