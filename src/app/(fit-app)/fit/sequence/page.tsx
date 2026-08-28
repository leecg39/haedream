import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "시퀀스 제어",
};

export default function SequenceAdminPage() {
  return <AdminManager page="sequence" />;
}
