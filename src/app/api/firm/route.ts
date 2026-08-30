import { NextRequest, NextResponse } from "next/server";
import { apiError, assertSameOrigin, enforceRateLimit, readJson, requestId } from "@/lib/http";
import { createFirm, listFirms } from "@/features/firms/repository";
import { firmCreateSchema } from "@/features/firms/schema";

export const dynamic = "force-dynamic";

/**
 * 업체관리 목록/등록.
 *
 * 정적 세그먼트라 캐치올(`/api/[...path]`)보다 우선한다.
 * 응답 형태 `{ cat: 1, data: [...] }` 는 정적 firm.html(firm-demo.js)이 그대로
 * 소비하므로 바꾸지 않는다.
 */
export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    return NextResponse.json({ cat: 1, data: listFirms() }, {
      headers: { "Cache-Control": "no-store", "X-Request-Id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    enforceRateLimit(`firm:create:${request.headers.get("x-forwarded-for") ?? "local"}`, 30);
    // strictObject 라 스키마에 없는 키(한전 비밀번호 등)는 여기서 400 으로 거부된다.
    const input = firmCreateSchema.parse(await readJson(request));
    const created = createFirm(input);
    return NextResponse.json({ cat: 1, data: created }, {
      status: 201,
      headers: { "X-Request-Id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
