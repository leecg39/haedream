/**
 * 한전 파워플래너 수집기 — 업체(fid) 단위로 로그인→수집→SQLite 적재한다.
 * 원본(watt.rfenms.com)과 동일하게 업체별 kepcoNo/kepcoPasswd 를 사용한다.
 */
import { getDb } from "@/lib/db";
import { kepcoLogin, KepcoLoginError, type KepcoSession } from "./login.ts";

const ORIGIN = "https://pp.kepco.co.kr";

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
}

async function postJson(session: KepcoSession, apiPath: string, body: Record<string, string>) {
  const res = await fetch(`${ORIGIN}${apiPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.jar.header(),
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
  session.jar.absorb(res.headers);
  if (!res.ok) throw new Error(`${apiPath} HTTP ${res.status}`);
  return res.json();
}

function seoulToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
}

/** 업체 1곳 수집: 스마트뷰 요약 + 당일 시간대별 + 월별 차트. */
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

    const summary = (await postJson(session, "/rm/getRM0101.do", {})) as Record<string, unknown>;
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

    const ymd = seoulToday();
    const hourly = (await postJson(session, "/rs/rs0101N_hour.do", {
      SELECT_DT: ymd,
      SEL_METER_ID: "",
      TIME_TYPE: "15",
      SEL_REV_USER: "F",
    })) as Record<string, unknown>[];
    const upsertHourly = db.prepare(
      `INSERT INTO kepco_hourly (fid, ymd, hhmi, f_ap_qt, max_pwr, co2, pf)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(fid, ymd, hhmi) DO UPDATE SET
         f_ap_qt=excluded.f_ap_qt, max_pwr=excluded.max_pwr, co2=excluded.co2, pf=excluded.pf`,
    );
    const writeHourly = db.transaction((rows: Record<string, unknown>[]) => {
      for (const row of rows) {
        upsertHourly.run(
          firm.fid,
          String(row.YYMMDD ?? ymd),
          String(row.MR_HHMI2 ?? row.MR_HHMI ?? ""),
          String(row.F_AP_QT ?? ""),
          String(row.MAX_PWR ?? ""),
          String(row.CO2 ?? ""),
          String(row.F_LARAP_PF ?? ""),
        );
      }
    });
    if (Array.isArray(hourly)) writeHourly(hourly);

    const monthly = (await postJson(session, "/rm/rm0101_chart.do", { menuType: "month" })) as Record<
      string,
      unknown
    >[];
    const upsertMonthly = db.prepare(
      `INSERT INTO kepco_monthly (fid, yyyymm, f_ap_qt, kwh_bill)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(fid, yyyymm) DO UPDATE SET f_ap_qt=excluded.f_ap_qt, kwh_bill=excluded.kwh_bill`,
    );
    // MR_HHMI 는 월 숫자만 오므로 현재 월 기준 최근 12개월로 역산한다.
    const nowMonth = Number(seoulToday().slice(4, 6));
    const nowYear = Number(seoulToday().slice(0, 4));
    const writeMonthly = db.transaction((rows: Record<string, unknown>[]) => {
      rows.forEach((row, index) => {
        const monthNum = Number(row.MR_HHMI ?? 0);
        if (!monthNum) return;
        const offset = rows.length - 1 - index;
        const date = new Date(nowYear, nowMonth - 1 - offset, 1);
        const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
        upsertMonthly.run(firm.fid, yyyymm, String(row.F_AP_QT ?? ""), String(row.KWH_BILL ?? ""));
      });
    });
    if (Array.isArray(monthly)) writeMonthly(monthly);

    return finish("success", `요약+시간대별 ${Array.isArray(hourly) ? hourly.length : 0}건+월별 ${Array.isArray(monthly) ? monthly.length : 0}건`);
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
