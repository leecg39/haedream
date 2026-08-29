import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { DEVICE_CONFIG } from "@/lib/abc/pages/device";

export const metadata: Metadata = { title: "모드버스 계측" };

export default function Page() {
  return <AbcDeskTable config={DEVICE_CONFIG} />;
}
