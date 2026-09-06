import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFirmAccess } from "@/features/firms/authorization.server";
import {
  findFirmForCollection,
  listFirmsForUser,
} from "@/features/firms/repository";
import { requirePermission } from "@/lib/auth";
import { isKepcoBatchActive } from "@/lib/kepco/batch-lock.server";
import { collectFirms } from "@/lib/kepco/collect";
import { getKepcoPassword } from "@/lib/kepco/credentials.server";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  apiError,
  assertSameOrigin,
  enforceRateLimit,
  readJson,
  requestId,
} from "@/lib/http";

const collectSchema = z.strictObject({
  fid: z.number().int().nonnegative(),
});

const activeFirmCollections = new Set<string>();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function methodNotAllowed(): never {
  throw new AppError(405, "METHOD_NOT_ALLOWED", "지원하지 않는 요청 방식입니다.");
}

function notFound(): never {
  throw new AppError(404, "API_NOT_FOUND", "요청한 API를 찾을 수 없습니다.");
}

function listKepcoStatus(
  tenantId: string,
  firms: ReturnType<typeof listFirmsForUser>,
) {
  const db = getDb();
  const accessible = new Set(firms.map((row) => row.fid));
  const latestLog = db
    .prepare(
      `SELECT log.fid, log.started_at, log.finished_at, log.status, log.message
       FROM kepco_collect_log log
       INNER JOIN tenant_firm_access access
         ON access.fid = log.fid AND access.tenant_id = ?
       WHERE log.id IN (
         SELECT MAX(scoped.id)
         FROM kepco_collect_log scoped
         INNER JOIN tenant_firm_access scoped_access
           ON scoped_access.fid = scoped.fid AND scoped_access.tenant_id = ?
         GROUP BY scoped.fid
       )`,
    )
    .all(tenantId, tenantId) as Array<{
      fid: number;
      started_at: string;
      finished_at: string;
      status: string;
      message: string;
    }>;
  const logByFid = new Map(latestLog.map((row) => [row.fid, row]));
  const summaries = db
    .prepare(
      `SELECT summary.fid, summary.collected_at
       FROM kepco_summary summary
       INNER JOIN tenant_firm_access access
         ON access.fid = summary.fid AND access.tenant_id = ?`,
    )
    .all(tenantId) as Array<{ fid: number; collected_at: string }>;
  const summaryByFid = new Map(
    summaries
      .filter((row) => accessible.has(row.fid))
      .map((row) => [row.fid, row]),
  );

  return firms
    .filter((row) => String(row.kepcoNo ?? "").trim() !== "")
    .map((row) => ({
      fid: row.fid,
      firmName: row.firmName,
      kepcoNo: row.kepcoNo,
      hasPasswd: Boolean(getKepcoPassword(row.fid)),
      lastStatus: logByFid.get(row.fid)?.status ?? null,
      lastMessage: logByFid.get(row.fid)?.message ?? null,
      lastCollectedAt: summaryByFid.get(row.fid)?.collected_at ?? null,
    }));
}

function getKepcoFirmData(fid: number, requestedMonth: string | null) {
  const db = getDb();
  const summary =
    db
      .prepare(
        `SELECT fid, collected_at, start_dt, end_dt, cntr_knd_nm, f_ap_qt,
                total_charge, predict_total_charge, joj_kw, max_pwr, max_pwr_time
         FROM kepco_summary WHERE fid = ?`,
      )
      .get(fid) ?? null;
  const today = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
    .replaceAll("-", "");
  const normalizedMonth = (requestedMonth ?? "").replace(/\D/g, "");
  const month = /^\d{6}$/.test(normalizedMonth)
    ? normalizedMonth
    : today.slice(0, 6);
  const hourly = db
    .prepare(
      `SELECT ymd, hhmi, f_ap_qt, max_pwr, co2, pf, f_larap_qt, f_lerap_qt,
              f_lerap_pf, no_data_yn
       FROM kepco_hourly WHERE fid = ? AND ymd = ? ORDER BY hhmi`,
    )
    .all(fid, today);
  const interval = db
    .prepare(
      `SELECT ymd, hhmi, f_ap_qt, max_pwr, f_larap_qt, f_lerap_qt,
              f_larap_pf, f_lerap_pf, co2, no_data_yn
       FROM kepco_interval
       WHERE fid = ? AND substr(ymd, 1, 6) = ?
       ORDER BY ymd, hhmi`,
    )
    .all(fid, month);
  const dailyTotal = db
    .prepare(
      `SELECT ymd, collected_at, f_ap_qt, max_pwr, f_larap_qt, f_lerap_qt, co2
       FROM kepco_daily_total
       WHERE fid = ? AND substr(ymd, 1, 6) = ? ORDER BY ymd`,
    )
    .all(fid, month);
  const monthly = db
    .prepare(
      "SELECT yyyymm, f_ap_qt, kwh_bill FROM kepco_monthly WHERE fid = ? ORDER BY yyyymm",
    )
    .all(fid);
  const billing = db
    .prepare(
      `SELECT bill_ym, mr_ymd, contract_pwr, bill_aply_pwr, use_kwh, use_days,
              base_bill, kwh_bill, req_bill, lload_usekwh, mload_usekwh,
              maxload_usekwh, ji_pwrfact, jn_pwrfact
       FROM kepco_billing WHERE fid = ? ORDER BY bill_ym`,
    )
    .all(fid);
  const contract =
    db
      .prepare(
        "SELECT collected_at, cntr_knd_cd, selbill_cd FROM kepco_contract WHERE fid = ?",
      )
      .get(fid) ?? null;

  return {
    summary,
    contract,
    dailyTotal,
    hourly,
    interval,
    intervalMonth: month,
    monthly,
    billing,
  };
}

async function collectSingleFirm(request: NextRequest) {
  const user = requirePermission(request, "kepco:collect");
  assertSameOrigin(request);
  const body = collectSchema.parse(await readJson(request));
  const target = findFirmForCollection(user, body.fid);
  enforceRateLimit(`kepco:collect:${user.id}:${body.fid}`, 5);
  if (isKepcoBatchActive()) {
    throw new AppError(
      409,
      "KEPCO_BATCH_ACTIVE",
      "전체 한전 수집이 진행 중입니다. 완료 후 다시 요청하세요.",
    );
  }

  const lockKey = `${user.tenantId}:${body.fid}`;
  if (activeFirmCollections.has(lockKey)) {
    throw new AppError(
      409,
      "KEPCO_FIRM_COLLECTION_ACTIVE",
      "이 업체의 한전 수집이 이미 진행 중입니다.",
    );
  }
  activeFirmCollections.add(lockKey);
  try {
    await Promise.resolve();
    return await collectFirms([
      {
        fid: target.fid,
        kepcoNo: target.kepcoNo,
        kepcoPasswd: getKepcoPassword(target.fid),
        checkDay: target.checkDay,
      },
    ]);
  } finally {
    activeFirmCollections.delete(lockKey);
  }
}

export async function handleKepcoRoute(
  request: NextRequest,
  path: readonly string[],
): Promise<NextResponse> {
  const id = requestId(request);
  const joined = path.join("/");
  const method = request.method.toUpperCase();
  try {
    if (joined === "kepco/status") {
      if (method !== "GET") {
        requirePermission(request, "kepco:collect");
        methodNotAllowed();
      }
      const user = requirePermission(request, "kepco:read");
      const firms = listFirmsForUser(user).filter((row) => row.kepcoNo);
      return json({ cat: 1, data: listKepcoStatus(user.tenantId, firms) });
    }

    const firmMatch = joined.match(/^kepco\/firm\/(\d+)$/);
    if (firmMatch) {
      if (method !== "GET") {
        requirePermission(request, "kepco:collect");
        methodNotAllowed();
      }
      const user = requirePermission(request, "kepco:read");
      const fid = Number(firmMatch[1]);
      requireFirmAccess(user, fid);
      return json({
        cat: 1,
        data: getKepcoFirmData(fid, request.nextUrl.searchParams.get("month")),
      });
    }

    if (joined === "kepco/collect") {
      if (method !== "POST") {
        requirePermission(request, "kepco:collect");
        methodNotAllowed();
      }
      return json({ cat: 1, data: await collectSingleFirm(request) });
    }

    requirePermission(
      request,
      method === "GET" ? "kepco:read" : "kepco:collect",
    );
    notFound();
  } catch (error) {
    return apiError(error, id);
  }
}
