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
import { facilityUpdateSchema } from "@/features/facilities/schema";
import {
  deleteFacility,
  findFacility,
  updateFacility,
} from "@/features/facilities/repository";

type Context = { params: Promise<{ id: string }> };

async function facilityId(context: Context) {
  return z.string().uuid("올바른 설비 ID가 아닙니다.").parse(
    (await context.params).id,
  );
}

export async function GET(request: NextRequest, context: Context) {
  const requestIdentifier = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`facility:detail:${user.id}`);
    const includeDeleted =
      request.nextUrl.searchParams.get("includeDeleted") === "true";
    if (includeDeleted) requirePermission(request, "deleted:read");
    return apiSuccess(
      findFacility(user, await facilityId(context), includeDeleted),
      requestIdentifier,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const requestIdentifier = requestId(request);
  try {
    assertSameOrigin(request);
    const user = requirePermission(request, "facility:update");
    enforceRateLimit(`facility:update:${user.id}`, 60);
    const input = facilityUpdateSchema.parse(await readJson(request));
    return apiSuccess(
      updateFacility(
        user,
        await facilityId(context),
        input,
        requestIdentifier,
      ),
      requestIdentifier,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestIdentifier = requestId(request);
  try {
    assertSameOrigin(request);
    const user = requirePermission(request, "facility:delete");
    enforceRateLimit(`facility:delete:${user.id}`, 30);
    return apiSuccess(
      deleteFacility(user, await facilityId(context), requestIdentifier),
      requestIdentifier,
      200,
      { "Cache-Control": "private, no-store" },
    );
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}
