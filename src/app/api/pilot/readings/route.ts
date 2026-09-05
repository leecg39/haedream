import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { apiError, apiSuccess, enforceRateLimit, requestId } from "@/lib/http";
import { serializeReading } from "@/features/pilot/mains";
import { getReadings, resolveDataSource } from "@/features/pilot/source";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`pilot:readings:${user.id}`);
    const params = request.nextUrl.searchParams;
    const source = resolveDataSource(params.get("source"));
    const readings = getReadings({
      source,
      tenantId: user.tenantId,
      gatewayId: params.get("gatewayId") ?? undefined,
      pointId: params.get("pointId") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      enabledOnly: params.get("enabledOnly") === "true",
    });
    return apiSuccess(
      {
        source,
        readings: readings.map(serializeReading),
      },
      id,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
