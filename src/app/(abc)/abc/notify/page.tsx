import type { Metadata } from "next";
import { AbcAlarmSettings } from "@/components/abc/AbcAlarmSettings";

export const metadata: Metadata = { title: "알람설정" };

export default function Page() {
  return <AbcAlarmSettings />;
}
