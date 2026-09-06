import { AbcShell } from "@/components/abc/AbcShell";
import type { AbcFirmOption } from "@/components/abc/AbcTopBar";
import { listFirmsForUser } from "@/features/firms/repository";
import { getCurrentSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AbcDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/");
  const firms: readonly AbcFirmOption[] = listFirmsForUser(user).map((row) => ({
    fid: row.fid,
    name: row.firmName,
  }));
  return <AbcShell firms={firms}>{children}</AbcShell>;
}
