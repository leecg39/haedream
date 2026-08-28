import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { apiError, apiSuccess, requestId } from "@/lib/http";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = getSessionUser(request);
    if (!user) {
      throw new AppError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }
    return apiSuccess(user, id, 200, { "Cache-Control": "private, no-store" });
  } catch (error) {
    return apiError(error, id);
  }
}
