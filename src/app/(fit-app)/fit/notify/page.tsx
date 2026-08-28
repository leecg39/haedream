import type { Metadata } from "next";
import { AlarmSettings } from "@/components/fit/admin/AlarmSettings";

export const metadata: Metadata = {
  title: "알람설정",
};

export default function Page() {
  return <AlarmSettings />;
}
