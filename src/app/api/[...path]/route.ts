import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findFirmForUser,
  listFirmItemsForUser,
} from "@/features/firms/repository";
import { handleKepcoRoute } from "@/features/kepco/routes.server";
import peakInfoFixture from "@/lib/fixtures/peak-info-121.json";
import { loginUser, requirePermission, setSessionCookie } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";
import { buildDemoLoginResponse, buildRealMenu } from "@/lib/watt-demo";
import {
  mockGenericList,
  mockMains,
  mockPeakStats,
  mockStarsDash,
  mockStarsSeries,
  mockWattMain,
  mockWidgets,
} from "@/lib/watt-mocks";

export const dynamic = "force-dynamic";

const loginSchema = z.strictObject({
  cf: z.literal("login"),
  id: z.string().trim().min(1).max(80),
  pw: z.string().min(1).max(256),
});

const demoApiPrefixes = new Set([
  "acp",
  "amount",
  "compressor",
  "control-historys",
  "controls",
  "enpis",
  "excel-reports",
  "facilities-reports",
  "gasReports",
  "kpis",
  "loads",
  "mains",
  "monits",
  "navigations",
  "peak-his",
  "peak-info",
  "peak-panels",
  "peak-set",
  "peak-stats",
  "peak-usages",
  "pipes",
  "plc-panels",
  "power-reports",
  "power-usages",
  "reportFine",
  "reportIK",
  "reports",
  "sensors",
  "stars",
  "stat",
  "tech-frozen",
  "tech-historys",
  "tech-overs",
  "tech-plans",
  "tech-settings",
  "tech-trees",
  "tech-usages",
  "temperatures",
  "toe-reports",
  "tunnels",
  "unit-reports",
  "watt-mains",
  "watt-predictions",
  "watt-usages",
  "widgets",
]);

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function methodNotAllowed(): never {
  throw new AppError(405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
}

function apiNotFound(): never {
  throw new AppError(404, "API_NOT_FOUND", "요청한 API를 찾을 수 없습니다.");
}

async function handleLogin(request: NextRequest, id: string) {
  if (request.method !== "POST") methodNotAllowed();
  assertSameOrigin(request);
  const login = loginSchema.parse(await readJson(request));
  const tenantId = process.env.DEFAULT_TENANT_ID ?? "121";
  const trustedForwarded =
    process.env.TRUST_PROXY_HEADERS === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : null;
  const accountKey = `${tenantId}:${login.id.toLowerCase()}`;
  if (trustedForwarded) enforceRateLimit(`login:ip:${trustedForwarded}`, 30);
  enforceRateLimit(`login:account:${accountKey}`, 10);
  const session = await loginUser(
    tenantId,
    login.id,
    login.pw,
    id,
    request.headers.get("user-agent"),
  );
  const response = json({
    ...buildDemoLoginResponse(login.id, session.user.tenantId, session.tenantName),
    authIdn: session.user.id,
    authName: session.user.name,
    role: session.user.role,
  });
  response.headers.set("X-Request-Id", id);
  setSessionCookie(response, session.token);
  return response;
}

function handleFirmRoute(request: NextRequest, path: readonly string[]) {
  const method = request.method.toUpperCase();
  if (method !== "GET") {
    requirePermission(request, "firm:update");
    methodNotAllowed();
  }
  const user = requirePermission(request, "firm:read");
  if (path.length === 1) {
    return json({ cat: 1, data: listFirmItemsForUser(user) });
  }
  if (path.length === 2 && /^\d+$/.test(path[1] ?? "")) {
    const fid = z.coerce.number().int().nonnegative().parse(path[1]);
    return json({ cat: 1, data: findFirmForUser(user, fid) });
  }
  apiNotFound();
}

async function handle(request: NextRequest, rawPath: string[]) {
  const path = rawPath.map(decodeSegment);
  const joined = path.join("/");
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const id = requestId(request);

  try {
    if (joined === "tokens") return await handleLogin(request, id);
    if (path[0] === "firm") return handleFirmRoute(request, path);
    if (path[0] === "kepco") return await handleKepcoRoute(request, path);

    if (!demoApiPrefixes.has(path[0])) apiNotFound();

    // 아래 명시된 호환 분기는 화면 조회용 mock만 제공한다. 쓰기처럼 보이는
    // 요청은 실제 부수 효과가 없더라도 성공 응답을 만들지 않는다.
    if (method !== "GET") methodNotAllowed();

    if (joined.startsWith("navigations/")) {
      return json({ cat: 1, data: buildRealMenu() });
    }
    if (joined.startsWith("peak-info/")) return json(peakInfoFixture);
    if (joined.startsWith("widgets/")) return json(mockWidgets());
    if (joined.startsWith("mains/")) {
      return json(mockMains(url.searchParams.get("fields") ?? undefined));
    }
    if (joined.startsWith("watt-mains/")) return json(mockWattMain());
    if (joined.startsWith("peak-stats/") || joined.startsWith("controls/")) {
      return json(mockPeakStats());
    }
    if (joined.startsWith("stars/")) {
      return json(url.searchParams.has("date") ? mockStarsSeries() : mockStarsDash());
    }
    if (
      joined.startsWith("pipes/") ||
      joined.startsWith("tunnels/") ||
      joined.startsWith("power-usages/") ||
      joined.startsWith("temperatures/") ||
      joined.startsWith("excel-reports/") ||
      joined.startsWith("monits/")
    ) {
      return json({ ...mockGenericList(), data: [], trees: [], historys: [] });
    }
    return json({
      ...mockGenericList(),
      message: `demo mock for /api/${joined}`,
      method,
    });
  } catch (error) {
    return apiError(error, id);
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).path);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).path);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).path);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(req, (await ctx.params).path);
}
