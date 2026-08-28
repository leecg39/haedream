import type { Metadata } from "next";
import { RealtimeData } from "@/components/fit/admin/RealtimeData";

export const metadata: Metadata = {
  title: "실시간 데이터",
};

export default function Page() {
  return <RealtimeData />;
}
