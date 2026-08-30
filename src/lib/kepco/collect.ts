/**
 * 한전 파워플래너 수집기 — 업체(fid) 단위로 로그인→수집→SQLite 적재한다.
 * 원본(watt.rfenms.com)과 동일하게 업체별 kepcoNo/kepcoPasswd 를 사용한다.
 */
import { getDb } from "@/lib/db";
import {
  fetchKepcoBilling,
  fetchKepcoUsageDay,
  postKepcoJson,
  type KepcoRecord,
} from "./client.ts";
import { kepcoLogin, KepcoLoginError, type KepcoSession } from "./login.ts";
import { normalizeKepcoNumber } from "./parse.ts";

export type CollectStatus = "success" | "no_credentials" | "login_failed" | "error";

export interface CollectResult {
  fid: number;
  status: CollectStatus;
  message: string;
  startedAt: string;
  finishedAt: string;
}

interface FirmCredentials {
  fid: number;
  kepcoNo: string;
  kepcoPasswd: string;
  checkDay?: number;
}

function seoulToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
}

function recentMonths(count: number): Set<string> {
  const now = new Date();
  const months = new Set<string>();
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.add(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function billingReadDate(billYm: string, checkDay?: number): string {
  if (!/^\d{6}$/.test(billYm) || !checkDay || checkDay < 1) return "";
  const year = Number(billYm.slice(0, 4));
  const month = Number(billYm.slice(4, 6));
  const lastDay = new Date(year, month, 0).getDate();
  return `${billYm}${String(Math.min(checkDay, lastDay)).padStart(2, "0")}`;
}

/** 업체 1곳 수집: 스마트뷰 + 계약 + 일 합계 + 1시간/15분 + 월별 청구 상세. */
export async function collectFirm(firm: FirmCredentials): Promise<CollectResult> {
  const startedAt = new Date().toISOString();
  const finish = (status: CollectStatus, message: string): CollectResult => {
    const result = { fid: firm.fid, status, message, startedAt, finishedAt: new Date().toISOString() };
    const db = getDb();
    db.prepare(
      "INSERT INTO kepco_collect_log (fid, started_at, finished_at, status, message) VALUES (?, ?, ?, ?, ?)",
    ).run(result.fid, result.startedAt, result.finishedAt, result.status, result.message);
    return result;
  };

  if (!firm.kepcoNo || !firm.kepcoPasswd) {
    return finish("no_credentials", "한전고객번호/비밀번호 미등록");
  }

  let session: KepcoSession;
  try {
    session = await kepcoLogin(firm.kepcoNo, firm.kepcoPasswd);
  } catch (error) {
    if (error instanceof KepcoLoginError) return finish("login_failed", error.message);
    return finish("error", error instanceof Error ? error.message : String(error));
  }

  try {
    const db = getDb();
    const ymd = seoulToday();
    const optionalErrors: string[] = [];

    const summary = await postKepcoJson<KepcoRecord>(session, "/rm/getRM0101.do", {});
    db.prepare(
      `INSERT INTO kepco_summary (fid, collected_at, start_dt, end_dt, cntr_knd_nm, f_ap_qt, total_charge, predict_total_charge, joj_kw, max_pwr, max_pwr_time, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(fid) DO UPDATE SET
         collected_at=excluded.collected_at, start_dt=excluded.start_dt, end_dt=excluded.end_dt,
         cntr_knd_nm=excluded.cntr_knd_nm, f_ap_qt=excluded.f_ap_qt, total_charge=excluded.total_charge,
         predict_total_charge=excluded.predict_total_charge, joj_kw=excluded.joj_kw,
         max_pwr=excluded.max_pwr, max_pwr_time=excluded.max_pwr_time, raw_json=excluded.raw_json`,
    ).run(
      firm.fid,
      startedAt,
      String(summary.START_DT ?? ""),
      String(summary.END_DT ?? ""),
      String(summary.CNTR_KND_NM ?? ""),
      String(summary.F_AP_QT ?? ""),
      String(summary.TOTAL_CHARGE ?? ""),
      String(summary.PREDICT_TOTAL_CHARGE ?? ""),
      String(summary.JOJ_KW ?? ""),
      String(summary.MAX_PWR ?? ""),
      String(summary.MAX_PWR_TIME ?? summary.MAX_DT ?? ""),
      JSON.stringify(summary),
    );

    try {
      const contract = await postKepcoJson<KepcoRecord>(session, "/rm/rm0101_contract_info.do", {});
      db.prepare(
        `INSERT INTO kepco_contract (fid, collected_at, cntr_knd_cd, selbill_cd, raw_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(fid) DO UPDATE SET collected_at=excluded.collected_at,
           cntr_knd_cd=excluded.cntr_knd_cd, selbill_cd=excluded.selbill_cd, raw_json=excluded.raw_json`,
      ).run(
        firm.fid,
        startedAt,
        String(contract.SESS_CNTR_KND_CD ?? ""),
        String(contract.SESS_SELBILL_CD ?? ""),
        JSON.stringify(contract),
      );
    } catch (error) {
      optionalErrors.push(`계약:${error instanceof Error ? error.message : String(error)}`);
    }

    const usage = await fetchKepcoUsageDay(session, ymd);
    db.prepare(
      `INSERT INTO kepco_daily_total (fid, ymd, collected_at, f_ap_qt, max_pwr, f_larap_qt, f_lerap_qt, co2, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(fid, ymd) DO UPDATE SET collected_at=excluded.collected_at,
         f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, f_larap_qt=excluded.f_larap_qt,
         f_lerap_qt=excluded.f_lerap_qt, co2=excluded.co2, raw_json=excluded.raw_json`,
    ).run(
      firm.fid,
      ymd,
      startedAt,
      String(usage.total.F_AP_QT ?? ""),
      String(usage.total.MAX_PWR ?? ""),
      String(usage.total.F_LARAP_QT ?? ""),
      String(usage.total.F_LERAP_QT ?? ""),
      String(usage.total.CO2 ?? ""),
      JSON.stringify(usage.total),
    );

    const upsertHourly = db.prepare(
      `INSERT INTO kepco_hourly
       (fid, ymd, hhmi, f_ap_qt, max_pwr, co2, pf, f_larap_qt, f_lerap_qt, f_lerap_pf, no_data_yn, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(fid, ymd, hhmi) DO UPDATE SET
         f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, co2=excluded.co2, pf=excluded.pf,
         f_larap_qt=excluded.f_larap_qt, f_lerap_qt=excluded.f_lerap_qt,
         f_lerap_pf=excluded.f_lerap_pf, no_data_yn=excluded.no_data_yn, raw_json=excluded.raw_json`,
    );
    db.transaction((rows: KepcoRecord[]) => {
      for (const row of rows) {
        upsertHourly.run(
          firm.fid,
          String(row.YYMMDD ?? ymd),
          String(row.MR_HHMI2 ?? row.MR_HHMI ?? ""),
          String(row.F_AP_QT ?? ""),
          String(row.MAX_PWR ?? ""),
          String(row.CO2 ?? ""),
          String(row.F_LARAP_PF ?? ""),
          String(row.F_LARAP_QT ?? ""),
          String(row.F_LERAP_QT ?? ""),
          String(row.F_LERAP_PF ?? ""),
          String(row.NO_DATA_YN ?? ""),
          JSON.stringify(row),
        );
      }
    })(usage.hourly);

    const upsertInterval = db.prepare(
      `INSERT INTO kepco_interval
       (fid, ymd, hhmi, collected_at, f_ap_qt, max_pwr, f_larap_qt, f_lerap_qt, f_larap_pf, f_lerap_pf, co2, no_data_yn, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(fid, ymd, hhmi) DO UPDATE SET collected_at=excluded.collected_at,
         f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, f_larap_qt=excluded.f_larap_qt,
         f_lerap_qt=excluded.f_lerap_qt, f_larap_pf=excluded.f_larap_pf,
         f_lerap_pf=excluded.f_lerap_pf, co2=excluded.co2, no_data_yn=excluded.no_data_yn,
         raw_json=excluded.raw_json`,
    );
    db.transaction((rows: KepcoRecord[]) => {
      for (const row of rows) {
        upsertInterval.run(
          firm.fid,
          String(row.YYMMDD ?? ymd),
          String(row.MR_HHMI ?? String(row.MR_HHMI2 ?? "").replace(":", "")),
          startedAt,
          String(row.F_AP_QT ?? ""),
          String(row.MAX_PWR ?? ""),
          String(row.F_LARAP_QT ?? ""),
          String(row.F_LERAP_QT ?? ""),
          String(row.F_LARAP_PF ?? ""),
          String(row.F_LERAP_PF ?? ""),
          String(row.CO2 ?? ""),
          String(row.NO_DATA_YN ?? ""),
          JSON.stringify(row),
        );
      }
    })(usage.interval);

    // 기존 3열 월별 UI 호환 데이터. 상세 청구 API가 없는 계약도 표시할 수 있도록 유지한다.
    const monthly = await postKepcoJson<KepcoRecord[]>(session, "/rm/rm0101_chart.do", {
      menuType: "month",
    });
    const upsertMonthly = db.prepare(
      `INSERT INTO kepco_monthly (fid, yyyymm, f_ap_qt, kwh_bill)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(fid, yyyymm) DO UPDATE SET f_ap_qt=excluded.f_ap_qt, kwh_bill=excluded.kwh_bill`,
    );
    const nowMonth = Number(ymd.slice(4, 6));
    const nowYear = Number(ymd.slice(0, 4));
    db.transaction((rows: KepcoRecord[]) => {
      rows.forEach((row, index) => {
        if (!Number(row.MR_HHMI ?? 0)) return;
        const offset = rows.length - 1 - index;
        const date = new Date(nowYear, nowMonth - 1 - offset, 1);
        const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
        upsertMonthly.run(
          firm.fid,
          yyyymm,
          String(row.F_AP_QT ?? ""),
          String(row.KWH_BILL ?? ""),
        );
      });
    })(Array.isArray(monthly) ? monthly : []);

    let billingCount = 0;
    try {
      const detailedMonths = recentMonths(24);
      for (const row of db
        .prepare("SELECT bill_ym FROM kepco_billing WHERE fid = ? AND base_bill <> ''")
        .all(firm.fid) as { bill_ym: string }[]) {
        detailedMonths.delete(row.bill_ym);
      }
      const bills = await fetchKepcoBilling(session, nowYear, detailedMonths);
      const upsertBill = db.prepare(
        `INSERT INTO kepco_billing
         (fid, bill_ym, collected_at, mr_ymd, contract_pwr, bill_aply_pwr, use_kwh, use_days,
          base_bill, kwh_bill, req_bill, lload_usekwh, mload_usekwh, maxload_usekwh,
          ji_pwrfact, jn_pwrfact, raw_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(fid, bill_ym) DO UPDATE SET
          collected_at=excluded.collected_at, mr_ymd=excluded.mr_ymd,
          contract_pwr=excluded.contract_pwr, bill_aply_pwr=excluded.bill_aply_pwr,
          use_kwh=excluded.use_kwh, use_days=excluded.use_days,
          base_bill=CASE WHEN excluded.base_bill <> '' THEN excluded.base_bill ELSE kepco_billing.base_bill END,
          kwh_bill=CASE WHEN excluded.kwh_bill <> '' THEN excluded.kwh_bill ELSE kepco_billing.kwh_bill END,
          req_bill=CASE WHEN excluded.req_bill <> '' THEN excluded.req_bill ELSE kepco_billing.req_bill END,
          lload_usekwh=CASE WHEN excluded.lload_usekwh <> '' THEN excluded.lload_usekwh ELSE kepco_billing.lload_usekwh END,
          mload_usekwh=CASE WHEN excluded.mload_usekwh <> '' THEN excluded.mload_usekwh ELSE kepco_billing.mload_usekwh END,
          maxload_usekwh=CASE WHEN excluded.maxload_usekwh <> '' THEN excluded.maxload_usekwh ELSE kepco_billing.maxload_usekwh END,
          ji_pwrfact=excluded.ji_pwrfact, jn_pwrfact=excluded.jn_pwrfact, raw_json=excluded.raw_json`,
      );
      db.transaction(() => {
        if (bills.length >= 12) {
          // 기존 rm 차트의 월 역산값은 검침월과 어긋날 수 있어 실제 청구월 목록으로 교체한다.
          db.prepare("DELETE FROM kepco_monthly WHERE fid = ?").run(firm.fid);
        }
        for (const bill of bills) {
          const overview = bill.overview;
          const detail = bill.detail;
          upsertBill.run(
            firm.fid,
            bill.billYm,
            startedAt,
            billingReadDate(bill.billYm, firm.checkDay),
            normalizeKepcoNumber(overview.JOJ_IKW),
            normalizeKepcoNumber(overview.JOJ_KW),
            normalizeKepcoNumber(overview.F_AP_QT),
            normalizeKepcoNumber(overview.JOJ_ILSU),
            detail?.baseBill ?? "",
            detail?.kwhBill ?? "",
            detail?.reqBill ?? normalizeKepcoNumber(overview.TOT_REQ_AMT),
            detail?.lloadUsekwh ?? "",
            detail?.mloadUsekwh ?? "",
            detail?.maxloadUsekwh ?? "",
            normalizeKepcoNumber(overview.JOJ_JI_PF),
            normalizeKepcoNumber(overview.JOJ_JN_PF),
            JSON.stringify({ overview, detail }),
          );
          // 기존 월별 3열 API도 실제 청구월/총청구액 기준으로 교정한다.
          upsertMonthly.run(
            firm.fid,
            bill.billYm,
            String(overview.F_AP_QT ?? ""),
            String(overview.TOT_REQ_AMT ?? ""),
          );
        }
      })();
      billingCount = bills.length;
    } catch (error) {
      optionalErrors.push(`청구:${error instanceof Error ? error.message : String(error)}`);
    }

    const optional = optionalErrors.length > 0 ? `; 선택항목 오류 ${optionalErrors.join(", ")}` : "";
    return finish(
      "success",
      `요약+일합계+시간 ${usage.hourly.length}건+15분 ${usage.interval.length}건+월별 ${Array.isArray(monthly) ? monthly.length : 0}건+청구 ${billingCount}건${optional}`,
    );
  } catch (error) {
    return finish("error", error instanceof Error ? error.message : String(error));
  }
}

/** 여러 업체를 순차 수집한다(서버 부하 방지 딜레이 포함). */
export async function collectFirms(firms: FirmCredentials[]): Promise<CollectResult[]> {
  const results: CollectResult[] = [];
  for (const firm of firms) {
    results.push(await collectFirm(firm));
    if (firm !== firms[firms.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  return results;
}
