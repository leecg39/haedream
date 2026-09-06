import { FitShell } from "@/components/fit/FitShell";
import { FIT_DEMO_STATUS } from "@/lib/fit-demo";
import type { FitFirmOption } from "@/types/fit";
import { getCurrentSessionUser } from "@/lib/auth";
import { listFirmsForUser } from "@/features/firms/repository";
import { redirect } from "next/navigation";

export default async function FitDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/fit/login");
  // 상단 업체 선택에는 현재 조직에 허가된 최소 필드만 넘긴다.
  const firmOptions: readonly FitFirmOption[] = listFirmsForUser(user).map((row) => ({
    fid: row.fid,
    name: row.firmName,
  }));
  return (
    <FitShell firms={firmOptions} status={FIT_DEMO_STATUS}>
      {children}
    </FitShell>
  );
}
