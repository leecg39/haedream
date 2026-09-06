import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import {
  createPilotInspection,
  getChecklistTemplate,
  listPilotInspections,
} from "@/features/pilot/ops-repository";
import { inspectionCreateSchema } from "@/features/pilot/ops-schema";
import { PILOT_GATEWAY_ID } from "@/features/pilot/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "inspection:read");
    enforceRateLimit(`pilot:inspections:${user.id}`);
    const gatewayId =
      request.nextUrl.searchParams.get("gatewayId") ?? PILOT_GATEWAY_ID;
    const inspections = listPilotInspections({
      tenantId: user.tenantId,
      gatewayId,
    });
    return apiSuccess(
      {
        inspections,
        checklistTemplate: getChecklistTemplate(),
      },
      id,
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "inspection:write");
    enforceRateLimit(`pilot:inspection-write:${user.id}`);
    const body = inspectionCreateSchema.parse(await request.json());
    const inspection = createPilotInspection(user, body);
    return apiSuccess({ inspection }, id, 201);
  } catch (error) {
    return apiError(error, id);
  }
}
