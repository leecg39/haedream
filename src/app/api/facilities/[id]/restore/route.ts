import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import {
  apiError,
  apiSuccess,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";
import { facilityVersionSchema } from "@/features/facilities/schema";
import { restoreFacility } from "@/features/facilities/repository";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  const requestIdentifier = requestId(request);
  try {
    assertSameOrigin(request);
    const user = requirePermission(request, "facility:restore");
    enforceRateLimit(`facility:restore:${user.id}`, 30);
    const id = z
      .string()
      .uuid("올바른 설비 ID가 아닙니다.")
      .parse((await context.params).id);
    const { version } = facilityVersionSchema.parse(await readJson(request));
    return apiSuccess(
      restoreFacility(user, id, version, requestIdentifier),
      requestIdentifier,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}
