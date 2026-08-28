import { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  apiError,
  apiSuccess,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";
import { purgeFacility } from "@/features/facilities/repository";

type Context = { params: Promise<{ id: string }> };

const confirmationSchema = z.strictObject({
  code: z.string().trim().min(2).max(32),
  version: z.number().int().positive(),
});

export async function DELETE(request: NextRequest, context: Context) {
  const requestIdentifier = requestId(request);
  try {
    assertSameOrigin(request);
    const user = requirePermission(request, "facility:purge");
    enforceRateLimit(`facility:purge:${user.id}`, 30);
    const id = z
      .string()
      .uuid("올바른 설비 ID가 아닙니다.")
      .parse((await context.params).id);
    const confirmation = confirmationSchema.parse(await readJson(request));
    if (request.headers.get("x-confirm-purge") !== confirmation.code) {
      throw new AppError(
        400,
        "PURGE_CONFIRMATION_REQUIRED",
        "영구 삭제 확인 값이 일치하지 않습니다.",
      );
    }
    purgeFacility(user, id, confirmation, requestIdentifier);
    return apiSuccess({ id, purged: true }, requestIdentifier, 200, {
      "Cache-Control": "private, no-store",
    });
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}
