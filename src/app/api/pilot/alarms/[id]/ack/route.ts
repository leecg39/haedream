import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import { acknowledgePilotAlarm } from "@/features/pilot/ops-repository";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestIdentifier = requestId(request);
  try {
    const user = requirePermission(request, "alarm:ack");
    enforceRateLimit(`pilot:alarm-ack:${user.id}`);
    const { id } = await context.params;
    const alarm = acknowledgePilotAlarm(id, user);
    return apiSuccess({ alarm }, requestIdentifier);
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}
