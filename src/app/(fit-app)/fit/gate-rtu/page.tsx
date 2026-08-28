import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "RTU 관리",
};

export default function GateRtuAdminPage() {
  return <AdminManager page="gate-rtu" />;
}
