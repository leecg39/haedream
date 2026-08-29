import type { Metadata } from "next";
import { AbcBadStatus } from "@/components/abc/AbcBadStatus";

export const metadata: Metadata = { title: "통신상태 불량" };

export default function Page() {
  return <AbcBadStatus />;
}
