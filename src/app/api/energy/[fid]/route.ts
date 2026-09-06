import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requestId } from "@/lib/http";
import { requirePermission } from "@/lib/auth";
import { requireFirmAccess } from "@/features/firms/authorization.server";
import { toEnergySeriesDto } from "@/features/energy/dashboard-dto.server";
import { listCorrections } from "@/features/energy/measurements.repository";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ fid: string }> };

const querySchema = z.object({
  meterPoint: z.string().trim().min(1).max(64).default("main"),
  unit: z.enum(["kW", "kWh"]).default("kW"),
});

/**
 * 합성/정규 계측 시리즈와 품질 배지를 반환한다.
 * 실데이터 승인 전에는 DEMO/STALE/NO_DATA 등이 그대로 노출되며
 * 실측으로 가장하지 않는다.
 */
export async function GET(request: NextRequest, context: Ctx) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "firm:read");
    const fid = z.coerce.number().int().nonnegative().parse((await context.params).fid);
    requireFirmAccess(user, fid);
    const parsed = querySchema.parse({
      meterPoint: request.nextUrl.searchParams.get("meterPoint") ?? undefined,
      unit: request.nextUrl.searchParams.get("unit") ?? undefined,
    });
    const series = toEnergySeriesDto(
      user.tenantId,
      fid,
      parsed.meterPoint,
      parsed.unit,
    );
    const corrections = listCorrections(user.tenantId, fid, parsed.meterPoint);
    return NextResponse.json(
      {
        cat: 1,
        data: {
          ...series,
          corrections,
          disclaimer:
            series.quality === "DEMO" || series.points.every((p) => p.source === "DEMO")
              ? "합성/데모 계측입니다. 실측으로 해석하지 마세요."
              : "품질·출처 필드를 함께 확인하세요.",
        },
      },
      { headers: { "Cache-Control": "private, no-store", "X-Request-Id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
