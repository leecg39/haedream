import type { Metadata } from "next";
import { AdminManager } from "@/components/fit/admin/AdminManager";

export const metadata: Metadata = {
  title: "사용자관리",
};

export default function UserAdminPage() {
  return <AdminManager page="user" />;
}
