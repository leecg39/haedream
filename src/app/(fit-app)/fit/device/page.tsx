import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "모드버스 계측",
};

export default function DeviceAdminPage() {
  return <AdminTablePage page="device" />;
}
