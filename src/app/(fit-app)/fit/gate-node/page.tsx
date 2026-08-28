import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "게이트웨이 관리",
};

export default function GateNodeAdminPage() {
  return <AdminTablePage page="gate-node" />;
}
