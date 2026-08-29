import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { GATE_RTU_CONFIG } from "@/lib/abc/pages/gate-rtu";

export const metadata: Metadata = { title: "RTU 관리" };

export default function Page() {
  return <AbcDeskTable config={GATE_RTU_CONFIG} />;
}
