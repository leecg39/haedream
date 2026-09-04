import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import { serializePilotSnapshot } from "@/features/pilot/mains";
import { getPilotDashboardSnapshot, resolveDataSource } from "@/features/pilot/source";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`pilot:snapshot:${user.id}`);
    const source = resolveDataSource(request.nextUrl.searchParams.get("source"));
    const snapshot = getPilotDashboardSnapshot({
      source,
      tenantId: user.tenantId,
    });
    return apiSuccess(serializePilotSnapshot(snapshot), id, 200, {
      "Cache-Control": "private, no-store",
    });
  } catch (error) {
    return apiError(error, id);
  }
}
