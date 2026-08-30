import type { KepcoSession } from "./login.ts";
import { parseKepcoBillDetail, type KepcoBillDetail } from "./parse.ts";

const ORIGIN = "https://pp.kepco.co.kr";

export type KepcoRecord = Record<string, unknown>;

export interface KepcoUsageDay {
  readonly total: KepcoRecord;
  readonly hourly: KepcoRecord[];
  readonly interval: KepcoRecord[];
}

export interface KepcoBillingRow {
  readonly overview: KepcoRecord;
  readonly detail: KepcoBillDetail | null;
  readonly billYm: string;
}

export async function postKepcoJson<T>(
  session: KepcoSession,
  apiPath: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${ORIGIN}${apiPath}`, {
    method: "POST",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json",
      cookie: session.jar.header(),
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
  session.jar.absorb(response.headers);
  if (!response.ok) throw new Error(`${apiPath} HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getKepcoText(session: KepcoSession, path: string): Promise<string> {
  const response = await fetch(`${ORIGIN}${path}`, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      cookie: session.jar.header(),
    },
  });
  session.jar.absorb(response.headers);
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.text();
}

/** 선택 날짜의 합계, 1시간 집계 24건, 15분 시계열 96건을 한 세션에서 조회한다. */
export async function fetchKepcoUsageDay(
  session: KepcoSession,
  ymd: string,
): Promise<KepcoUsageDay> {
  const request = {
    SELECT_DT: ymd,
    SEL_METER_ID: "",
    TIME_TYPE: "15",
    SEL_REV_USER: "F",
  };
  const total = await postKepcoJson<KepcoRecord>(session, "/rs/rs0101N_total.do", request);
  const hourly = await postKepcoJson<KepcoRecord[]>(session, "/rs/rs0101N_hour.do", request);
  const chart = await postKepcoJson<{ list1?: KepcoRecord[] }>(
    session,
    "/rs/rs0101N_chart.do",
    request,
  );
  return {
    total,
    hourly: Array.isArray(hourly) ? hourly : [],
    interval: Array.isArray(chart.list1) ? chart.list1 : [],
  };
}

/**
 * 청구 개요 12개월을 조회하고, 필요하면 각 월 상세요금 HTML도 파싱한다.
 * detailMonths가 주어지면 해당 YYYYMM만 상세 조회한다(이미 적재된 월은 생략 가능).
 */
export async function fetchKepcoBilling(
  session: KepcoSession,
  year: number,
  detailMonths?: ReadonlySet<string>,
): Promise<KepcoBillingRow[]> {
  const response = await postKepcoJson<{ yearValList?: KepcoRecord[] }>(
    session,
    "/cc/cc0102Info.do",
    { year: String(year) },
  );
  const overviewRows = Array.isArray(response.yearValList) ? response.yearValList : [];
  const result: KepcoBillingRow[] = [];

  for (const overview of overviewRows) {
    const dotted = String(overview.YEAR_ROW2 ?? "");
    const billYm = dotted.replace(/\D/g, "").slice(0, 6);
    if (!billYm) continue;
    let detail: KepcoBillDetail | null = null;
    if (!detailMonths || detailMonths.has(billYm)) {
      const html = await getKepcoText(session, `/cc/cc0103.do?yymm=${encodeURIComponent(dotted)}`);
      detail = parseKepcoBillDetail(html);
    }
    result.push({ overview, detail, billYm });
  }
  return result;
}
