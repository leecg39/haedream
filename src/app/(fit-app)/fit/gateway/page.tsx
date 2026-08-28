import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "복합제어기 관리",
};

export default function GatewayAdminPage() {
  return <AdminTablePage page="gateway" />;
}
