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
import { FIRM_ROWS } from "@/lib/fit-mocks/firm";
import { getDb } from "@/lib/db";
import { collectFirms } from "@/lib/kepco/collect.ts";

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

  // 업체관리 목록 — React(/fit/firm)와 정적 EMS 페이지(firm.html)가 같은 데이터를 쓴다.
  if (joined === "firm" || joined.startsWith("firm/")) {
    return json({ cat: 1, data: FIRM_ROWS });
  }

  // 한전 파워플래너 연동 — 업체별 수집 상태
  if (joined === "kepco/status") {
    const db = getDb();
    const latestLog = db.prepare(
      `SELECT fid, started_at, finished_at, status, message
       FROM kepco_collect_log
       WHERE id IN (SELECT MAX(id) FROM kepco_collect_log GROUP BY fid)`,
    ).all() as { fid: number; started_at: string; finished_at: string; status: string; message: string }[];
    const logByFid = new Map(latestLog.map((row) => [row.fid, row]));
    const summaries = db.prepare("SELECT fid, collected_at FROM kepco_summary").all() as {
      fid: number;
      collected_at: string;
    }[];
    const summaryByFid = new Map(summaries.map((row) => [row.fid, row]));
    const data = FIRM_ROWS.filter((row) => row.kepcoNo).map((row) => ({
      fid: row.fid,
      firmName: row.firmName,
      kepcoNo: row.kepcoNo,
      hasPasswd: Boolean(row.kepcoPasswd),
      lastStatus: logByFid.get(row.fid)?.status ?? null,
      lastMessage: logByFid.get(row.fid)?.message ?? null,
      lastCollectedAt: summaryByFid.get(row.fid)?.collected_at ?? null,
    }));
    return json({ cat: 1, data });
  }

  // 한전 파워플래너 연동 — 업체별 수집 데이터 조회
  const kepcoFirmMatch = joined.match(/^kepco\/firm\/(\d+)$/);
  if (kepcoFirmMatch) {
    const fid = Number(kepcoFirmMatch[1]);
    const db = getDb();
    const summary = db.prepare("SELECT * FROM kepco_summary WHERE fid = ?").get(fid) ?? null;
    const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
    const hourly = db
      .prepare("SELECT ymd, hhmi, f_ap_qt, max_pwr, co2, pf FROM kepco_hourly WHERE fid = ? AND ymd = ? ORDER BY hhmi")
      .all(fid, ymd);
    const monthly = db
      .prepare("SELECT yyyymm, f_ap_qt, kwh_bill FROM kepco_monthly WHERE fid = ? ORDER BY yyyymm")
      .all(fid);
    return json({ cat: 1, data: { summary, hourly, monthly } });
  }

  // 한전 파워플래너 연동 — 수동 수집 트리거 (원본의 '수집 요청' 버튼)
  if (joined === "kepco/collect") {
    try {
      if (method !== "POST") {
        throw new AppError(405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
      }
      assertSameOrigin(req);
      const body = (await readJson(req).catch(() => ({}))) as { fid?: number };
      const targets = body.fid != null
        ? FIRM_ROWS.filter((row) => row.fid === body.fid)
        : FIRM_ROWS.filter((row) => row.kepcoNo && row.kepcoPasswd);
      if (targets.length === 0) {
        throw new AppError(404, "NOT_FOUND", "수집 대상 업체가 없습니다.");
      }
      const results = await collectFirms(
        targets.map((row) => ({ fid: row.fid, kepcoNo: row.kepcoNo, kepcoPasswd: row.kepcoPasswd })),
      );
      return json({ cat: 1, data: results });
    } catch (error) {
      return apiError(error, id);
    }
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
