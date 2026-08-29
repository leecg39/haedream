import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { SEQUENCE_CONFIG } from "@/lib/abc/pages/sequence";

export const metadata: Metadata = { title: "시퀀스 제어" };

export default function Page() {
  return <AbcDeskTable config={SEQUENCE_CONFIG} />;
}
