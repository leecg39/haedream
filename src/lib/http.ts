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

function responseHeaders(id: string, headers?: HeadersInit) {
  const response = new Headers(headers);
  response.set("X-Request-Id", id);
  if (!response.has("Cache-Control")) {
    response.set("Cache-Control", "private, no-store");
  }
  return response;
}

export function apiSuccess<T>(
  data: T,
  id: string,
  status = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { ok: true, requestId: id, data },
    { status, headers: responseHeaders(id, headers) },
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
      { status: 422, headers: responseHeaders(id) },
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
      { status: error.status, headers: responseHeaders(id) },
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
    { status: 500, headers: responseHeaders(id) },
  );
}

export async function readJson(request: NextRequest) {
  const maxBytes = 64 * 1024;
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if (contentType !== "application/json") {
    throw new AppError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type은 application/json이어야 합니다.",
    );
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "요청 본문은 64KB를 초과할 수 없습니다.",
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new AppError(400, "INVALID_JSON", "올바른 JSON 요청이 아닙니다.");
  }
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "요청 본문은 64KB를 초과할 수 없습니다.",
    );
  }
  try {
    return JSON.parse(text) as unknown;
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
  if (!origin && fetchSite !== "same-origin") {
    throw new AppError(
      403,
      "CSRF_REJECTED",
      "요청 출처를 확인할 수 없습니다.",
    );
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
