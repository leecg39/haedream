import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { GATE_NODE_CONFIG } from "@/lib/abc/pages/gate-node";

export const metadata: Metadata = { title: "게이트웨이 관리" };

export default function Page() {
  return <AbcDeskTable config={GATE_NODE_CONFIG} />;
}
