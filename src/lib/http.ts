import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

export function requestId(request: NextRequest) {
  const incoming = request.headers.get("x-request-id");
  return incoming && /^[A-Za-z0-9._-]{8,100}$/.test(incoming)
    ? incoming
    : randomUUID();
}

export function apiSuccess<T>(
  data: T,
  id: string,
  status = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { ok: true, requestId: id, data },
    { status, headers },
  );
}

export function apiError(error: unknown, id: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        requestId: id,
        error: {
          code: "VALIDATION_ERROR",
          message: "입력값을 확인해 주세요.",
          fieldErrors: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        requestId: id,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error(
    JSON.stringify({
      level: "error",
      event: "api_error",
      requestId: id,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  return NextResponse.json(
    {
      ok: false,
      requestId: id,
      error: {
        code: "INTERNAL_ERROR",
        message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
    },
    { status: 500 },
  );
}

export async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "올바른 JSON 요청이 아닙니다.");
  }
}

export function assertSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    throw new AppError(403, "CSRF_REJECTED", "허용되지 않은 요청 출처입니다.");
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    throw new AppError(403, "CSRF_REJECTED", "허용되지 않은 요청 출처입니다.");
  }
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_BUCKET_CAPACITY = 10_000;
let lastRatePrune = 0;

export function enforceRateLimit(
  key: string,
  limit = 120,
  windowMs = 60_000,
) {
  const now = Date.now();
  if (rateBuckets.size >= 1_000 && now - lastRatePrune >= 5_000) {
    lastRatePrune = now;
    for (const [bucketKey, value] of rateBuckets) {
      if (value.resetAt <= now) rateBuckets.delete(bucketKey);
    }
  }
  if (
    rateBuckets.size >= RATE_BUCKET_CAPACITY &&
    !rateBuckets.has(key)
  ) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= limit) {
    throw new AppError(
      429,
      "RATE_LIMITED",
      "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
  bucket.count += 1;
}

export function clearRateLimitsForTests() {
  rateBuckets.clear();
  lastRatePrune = 0;
}
