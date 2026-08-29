import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { GATEWAY_CONFIG } from "@/lib/abc/pages/gateway";

export const metadata: Metadata = { title: "복합제어기 관리" };

export default function Page() {
  return <AbcDeskTable config={GATEWAY_CONFIG} />;
}
