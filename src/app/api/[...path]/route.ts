import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDemoLoginResponse, buildRealMenu } from "@/lib/watt-demo";
import peakInfoFixture from "@/lib/fixtures/peak-info-121.json";
import { loginUser, setSessionCookie } from "@/lib/auth";
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

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  cf: z.literal("login").optional(),
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
  "tokens",
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

async function handle(req: NextRequest, path: string[]) {
  const joined = path.join("/");
  const method = req.method.toUpperCase();
  const url = new URL(req.url);
  const id = requestId(req);

  if (joined === "tokens" || joined.startsWith("tokens/")) {
    if (method === "POST") {
      try {
        const body = (await readJson(req)) as {
          cf?: string;
          id?: string;
          pw?: string;
        };
        if (body.cf === "login" || body.id) {
          assertSameOrigin(req);
          const login = loginSchema.parse(body);
          const tenantId = process.env.DEFAULT_TENANT_ID ?? "121";
          const trustedForwarded =
            process.env.TRUST_PROXY_HEADERS === "true"
              ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
              : null;
          const clientKey = trustedForwarded || "direct";
          const accountKey = `${tenantId}:${login.id.toLowerCase()}`;
          if (trustedForwarded) {
            enforceRateLimit(`login:ip:${clientKey}`, 30);
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
          setSessionCookie(response, session.token);
          return response;
        }
        return json({ ok: true, token: "demo-access-token-solarsimz" });
      } catch (error) {
        return apiError(error, id);
      }
    }
    return json({ ok: true });
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
    return json(mockMains(url.searchParams.get("fields") ?? undefined));
  }

  if (joined.startsWith("watt-mains/")) {
    return json(mockWattMain());
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
