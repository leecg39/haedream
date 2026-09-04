import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDemoLoginResponse, buildRealMenu } from "@/lib/watt-demo";
import peakInfoFixture from "@/lib/fixtures/peak-info-121.json";
import { loginUser, setSessionCookie } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";
import {
  mockGenericList,
  mockMains,
  mockPeakStats,
  mockStarsDash,
  mockStarsSeries,
  mockWattMain,
  mockWidgets,
} from "@/lib/watt-mocks";
import { withPilotSidecar } from "@/features/pilot/mains";
import {
  getPilotDashboardSnapshot,
  resolveDataSource,
} from "@/features/pilot/source";
import type { PilotSnapshot } from "@/features/pilot/types";

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
  "firm",
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
  return NextResponse.json(data, { status });
}

function safePilotSnapshot(): PilotSnapshot | null {
  try {
    return getPilotDashboardSnapshot({ source: resolveDataSource() });
  } catch {
    return null;
  }
}

function withOptionalPilot<T extends Record<string, unknown>>(payload: T) {
  const snapshot = safePilotSnapshot();
  return snapshot ? withPilotSidecar(payload, snapshot) : payload;
}

async function handle(req: NextRequest, path: string[]) {
  const joined = path.join("/");
  const method = req.method.toUpperCase();
  const url = new URL(req.url);
  const id = requestId(req);

  if (joined === "tokens") {
    try {
      if (method !== "POST") {
        throw new AppError(
          405,
          "METHOD_NOT_ALLOWED",
          "지원하지 않는 요청 방식입니다.",
        );
      }
      assertSameOrigin(req);
      const login = loginSchema.parse(await readJson(req));
      const tenantId = process.env.DEFAULT_TENANT_ID ?? "121";
      const trustedForwarded =
        process.env.TRUST_PROXY_HEADERS === "true"
          ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
          : null;
      const accountKey = `${tenantId}:${login.id.toLowerCase()}`;
      if (trustedForwarded) {
        enforceRateLimit(`login:ip:${trustedForwarded}`, 30);
      }
      enforceRateLimit(`login:account:${accountKey}`, 10);
      const session = await loginUser(
        tenantId,
        login.id,
        login.pw,
        id,
        req.headers.get("user-agent"),
      );
      const response = json({
        ...buildDemoLoginResponse(
          login.id,
          session.user.tenantId,
          session.tenantName,
        ),
        authIdn: session.user.id,
        authName: session.user.name,
        role: session.user.role,
      });
      response.headers.set("X-Request-Id", id);
      response.headers.set("Cache-Control", "private, no-store");
      setSessionCookie(response, session.token);
      return response;
    } catch (error) {
      return apiError(error, id);
    }
  }

  if (joined.startsWith("navigations/")) {
    return json({ cat: 1, data: buildRealMenu() });
  }

  if (joined.startsWith("peak-info/")) {
    return json(peakInfoFixture);
  }

  if (joined.startsWith("widgets/")) {
    return json(mockWidgets());
  }

  if (joined.startsWith("mains/")) {
    return json(
      withOptionalPilot(
        mockMains(url.searchParams.get("fields") ?? undefined) as Record<
          string,
          unknown
        >,
      ),
    );
  }

  if (joined.startsWith("watt-mains/")) {
    return json(withOptionalPilot(mockWattMain() as Record<string, unknown>));
  }

  if (joined.startsWith("peak-stats/") || joined.startsWith("controls/")) {
    return json(mockPeakStats());
  }

  if (joined.startsWith("stars/")) {
    if (method === "POST") return json(mockStarsDash());
    if (url.searchParams.has("date")) return json(mockStarsSeries());
    return json(mockStarsDash());
  }

  if (
    joined.startsWith("pipes/") ||
    joined.startsWith("tunnels/") ||
    joined.startsWith("power-usages/") ||
    joined.startsWith("temperatures/") ||
    joined.startsWith("excel-reports/") ||
    joined.startsWith("monits/")
  ) {
    return json({
      ...mockGenericList(),
      data: [],
      trees: [],
      historys: [],
    });
  }

  if (demoApiPrefixes.has(path[0])) {
    return json({
      ...mockGenericList(),
      message: `demo mock for /api/${joined}`,
      method,
    });
  }

  return json(
    {
      ok: false,
      requestId: id,
      error: {
        code: "API_NOT_FOUND",
        message: "요청한 API를 찾을 수 없습니다.",
      },
    },
    404,
  );
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return handle(req, path);
}
