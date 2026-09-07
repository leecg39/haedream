import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, assertSameOrigin, enforceRateLimit, readJson, requestId } from "@/lib/http";
import { canWriteFirmPii, findFirmForUser, updateFirmForUser } from "@/features/firms/repository";
import { firmUpdateSchema } from "@/features/firms/schema";
import { requirePermission } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { requireFirmAccess } from "@/features/firms/authorization.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ fid: string }> };

const fidParam = z.coerce.number().int().nonnegative();

/**
 * 업체 상세 조회·수정.
 *
 * 목록(`/api/firm`)보다 구체적이라 catch-all 보다 우선한다.
 * 비밀번호·원문 수집 payload 키는 스키마에서 거부한다.
 */
export async function GET(request: NextRequest, context: Ctx) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "firm:read");
    enforceRateLimit(`firm:detail:${user.id}`);
    const fid = fidParam.parse((await context.params).fid);
    // 편집 폼이 PII 쓰기 가능 여부를 알 수 있게 함께 내려준다(ISSUE-001).
    // false 면 폼이 PII 필드를 비활성화하고 저장 본문에서도 제외한다.
    return NextResponse.json(
      { cat: 1, data: findFirmForUser(user, fid), canWritePii: canWriteFirmPii(user, fid) },
      {
        headers: { "Cache-Control": "private, no-store", "X-Request-Id": id },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const id = requestId(request);
  try {
    const user = requirePermission(request, "firm:update");
    assertSameOrigin(request);
    enforceRateLimit(`firm:update:${user.id}`, 60);
    const fid = fidParam.parse((await context.params).fid);
    requireFirmAccess(user, fid);
    const input = firmUpdateSchema.parse(await readJson(request));
    const updated = updateFirmForUser(user, fid, input, id);
    return NextResponse.json({ cat: 1, data: updated }, {
      headers: { "Cache-Control": "private, no-store", "X-Request-Id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

async function rejectUnsupported(request: NextRequest) {
  const id = requestId(request);
  try {
    requirePermission(request, "firm:update");
    assertSameOrigin(request);
    throw new AppError(405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PUT(request: NextRequest) {
  return rejectUnsupported(request);
}

export async function DELETE(request: NextRequest) {
  return rejectUnsupported(request);
}

export async function POST(request: NextRequest) {
  return rejectUnsupported(request);
}
