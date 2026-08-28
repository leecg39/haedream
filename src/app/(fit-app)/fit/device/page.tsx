import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "모드버스 계측",
};

export default function DeviceAdminPage() {
  return <AdminManager page="device" />;
}
