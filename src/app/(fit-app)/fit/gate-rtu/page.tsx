import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "RTU 관리",
};

export default function GateRtuAdminPage() {
  return <AdminTablePage page="gate-rtu" />;
}
