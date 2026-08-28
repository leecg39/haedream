import type { Metadata } from "next";
import { AdminTablePage } from "@/components/fit/admin/AdminTablePage";

export const metadata: Metadata = {
  title: "사용자관리",
};

export default function UserAdminPage() {
  return <AdminTablePage page="user" />;
}
