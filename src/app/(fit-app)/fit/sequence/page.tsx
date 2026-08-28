import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "시퀀스 제어",
};

export default function SequenceAdminPage() {
  return <AdminTablePage page="sequence" />;
}
