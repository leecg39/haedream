import type { Metadata } from "next";
import { AbcDeskTable } from "@/components/abc/AbcDeskTable";
import { USER_CONFIG } from "@/lib/abc/pages/user";

export const metadata: Metadata = { title: "사용자관리" };

export default function Page() {
  return <AbcDeskTable config={USER_CONFIG} />;
}
