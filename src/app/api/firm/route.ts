import { NextRequest, NextResponse } from "next/server";
import { apiError, assertSameOrigin, enforceRateLimit, readJson, requestId } from "@/lib/http";
import { createFirmForUser, listFirmsForUser } from "@/features/firms/repository";
import { firmCreateSchema } from "@/features/firms/schema";
import { hasPermission, requirePermission } from "@/lib/auth";
import { AppError } from "@/lib/errors";

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
    const user = requirePermission(request, "firm:read");
    enforceRateLimit(`firm:list:${user.id}`);
    return NextResponse.json({
      cat: 1,
      data: listFirmsForUser(user),
      permissions: {
        canCreate: hasPermission(user.role, "firm:create"),
        canUpdate: hasPermission(user.role, "firm:update"),
      },
    }, {
      headers: { "Cache-Control": "private, no-store", "X-Request-Id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "firm:create");
    assertSameOrigin(request);
    enforceRateLimit(`firm:create:${user.id}`, 30);
    // strictObject 라 스키마에 없는 키(한전 비밀번호 등)는 여기서 400 으로 거부된다.
    const input = firmCreateSchema.parse(await readJson(request));
    const created = createFirmForUser(user, input);
    return NextResponse.json({ cat: 1, data: created }, {
      status: 201,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-Id": id,
        Location: `/api/firm/${created.fid}`,
      },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

async function rejectUnsupportedMutation(request: NextRequest) {
  const id = requestId(request);
  try {
    // 인증과 역할 검사를 먼저 수행해 보호 리소스 존재 여부와 입력 오류를
    // 익명·조회 전용 사용자에게 노출하지 않는다.
    requirePermission(request, "firm:update");
    assertSameOrigin(request);
    throw new AppError(
      405,
      "METHOD_NOT_ALLOWED",
      "지원하지 않는 요청 방식입니다.",
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PUT(request: NextRequest) {
  return rejectUnsupportedMutation(request);
}

export async function PATCH(request: NextRequest) {
  return rejectUnsupportedMutation(request);
}

export async function DELETE(request: NextRequest) {
  return rejectUnsupportedMutation(request);
}
