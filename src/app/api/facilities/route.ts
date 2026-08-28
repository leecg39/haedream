import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import {
  apiError,
  apiSuccess,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";
import {
  facilityCreateSchema,
  facilityListQuerySchema,
} from "@/features/facilities/schema";
import {
  createFacility,
  listFacilities,
} from "@/features/facilities/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "facility:read");
    enforceRateLimit(`facility:list:${user.id}`);
    const query = facilityListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (query.deleted !== "exclude") {
      requirePermission(request, "deleted:read");
    }
    return apiSuccess(listFacilities(user, query), id, 200, {
      "Cache-Control": "private, no-store",
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    const user = requirePermission(request, "facility:create");
    enforceRateLimit(`facility:create:${user.id}`, 30);
    const input = facilityCreateSchema.parse(await readJson(request));
    const created = createFacility(user, input, id);
    return apiSuccess(created, id, 201, {
      Location: `/api/facilities/${created.id}`,
      "Cache-Control": "private, no-store",
    });
  } catch (error) {
    return apiError(error, id);
  }
}
