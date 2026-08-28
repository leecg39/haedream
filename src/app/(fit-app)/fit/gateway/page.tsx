import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "복합제어기 관리",
};

export default function GatewayAdminPage() {
  return <AdminManager page="gateway" />;
}
