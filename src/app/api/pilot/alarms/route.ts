import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import {
  getChecklistTemplate,
  getPilotOpsSummary,
  listPilotAlarms,
} from "@/features/pilot/ops-repository";
import { PILOT_GATEWAY_ID } from "@/features/pilot/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "alarm:read");
    enforceRateLimit(`pilot:alarms:${user.id}`);
    const gatewayId =
      request.nextUrl.searchParams.get("gatewayId") ?? PILOT_GATEWAY_ID;
    const unackedOnly =
      request.nextUrl.searchParams.get("unackedOnly") === "1" ||
      request.nextUrl.searchParams.get("unackedOnly") === "true";
    const alarms = listPilotAlarms({
      tenantId: user.tenantId,
      gatewayId,
      unackedOnly,
    });
    const summary = getPilotOpsSummary({
      tenantId: user.tenantId,
      gatewayId,
    });
    return apiSuccess(
      {
        alarms,
        summary,
        checklistTemplate: getChecklistTemplate(),
      },
      id,
    );
  } catch (error) {
    return apiError(error, id);
  }
}
