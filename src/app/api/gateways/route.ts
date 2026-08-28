import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import {
  listGateways,
  listProcesses,
} from "@/features/facilities/repository";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`gateway:list:${user.id}`);
    return apiSuccess(
      {
        gateways: listGateways(user),
        processes: listProcesses(user).map((item) => item.processName),
      },
      id,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
