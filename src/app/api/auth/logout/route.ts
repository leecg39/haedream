import { NextRequest } from "next/server";
import { logoutUser } from "@/lib/auth";
import { apiError, apiSuccess, assertSameOrigin, requestId } from "@/lib/http";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    const response = apiSuccess({ loggedOut: true }, id);
    logoutUser(request, response, id);
    return response;
  } catch (error) {
    return apiError(error, id);
  }
}
