import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import {
  getChecklistTemplate,
  getPilotBom,
  getPilotOpsSummary,
} from "@/features/pilot/ops-repository";
import { PILOT_MAPPING } from "@/features/pilot/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`pilot:bom:${user.id}`);
    return apiSuccess(
      {
        bom: getPilotBom(),
        mapping: PILOT_MAPPING,
        checklistTemplate: getChecklistTemplate(),
        summary: getPilotOpsSummary({ tenantId: user.tenantId }),
      },
      id,
    );
  } catch (error) {
    return apiError(error, id);
  }
}
