import type { Metadata } from "next";
import { FirmManager } from "@/components/fit/firm/FirmManager";
import { listFirmsForUser } from "@/features/firms/repository";
import { findFitMockPageByRoute } from "@/lib/fit-mock-db";
import { getCurrentSessionUser, hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

/** 제목은 MockDB(원본 사이트가 실제로 응답한 <title>)에서 가져온다. */
export const metadata: Metadata = {
  title: findFitMockPageByRoute("/fit/firm")?.title ?? "",
};

// 업체를 등록하면 router.refresh() 로 이 컴포넌트가 다시 돌아 최신 목록을 넘긴다.
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/fit/login");
  return (
    <FirmManager
      rows={listFirmsForUser(user)}
      canCreate={hasPermission(user.role, "firm:create")}
      canUpdate={hasPermission(user.role, "firm:update")}
    />
  );
}
