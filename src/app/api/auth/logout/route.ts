import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";
import { apiError, assertSameOrigin, requestId } from "@/lib/http";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    const response = NextResponse.json({
      ok: true,
      requestId: id,
      data: { loggedOut: true },
    });
    logoutUser(request, response, id);
    return response;
  } catch (error) {
    return apiError(error, id);
  }
}
