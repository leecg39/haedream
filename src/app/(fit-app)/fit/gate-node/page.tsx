import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "게이트웨이 관리",
};

export default function GateNodeAdminPage() {
  return <AdminManager page="gate-node" />;
}
