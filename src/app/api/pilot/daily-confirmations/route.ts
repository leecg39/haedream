import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import {
  getDailyConfirmation,
  listDailyConfirmations,
  upsertDailyConfirmation,
} from "@/features/pilot/ops-repository";
import { dailyConfirmationUpsertSchema } from "@/features/pilot/ops-schema";
import { PILOT_GATEWAY_ID } from "@/features/pilot/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "alarm:read");
    enforceRateLimit(`pilot:daily:${user.id}`);
    const gatewayId =
      request.nextUrl.searchParams.get("gatewayId") ?? PILOT_GATEWAY_ID;
    const confirmDate = request.nextUrl.searchParams.get("confirmDate");
    if (confirmDate) {
      const confirmation = getDailyConfirmation({
        tenantId: user.tenantId,
        gatewayId,
        confirmDate,
      });
      return apiSuccess({ confirmation }, id);
    }
    const confirmations = listDailyConfirmations({
      tenantId: user.tenantId,
      gatewayId,
    });
    return apiSuccess({ confirmations }, id);
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PUT(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "alarm:ack");
    enforceRateLimit(`pilot:daily-write:${user.id}`);
    const body = dailyConfirmationUpsertSchema.parse(await request.json());
    const confirmation = upsertDailyConfirmation(user, body);
    return apiSuccess({ confirmation }, id);
  } catch (error) {
    return apiError(error, id);
  }
}
