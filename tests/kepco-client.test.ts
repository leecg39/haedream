import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchKepcoBilling,
  fetchKepcoUsageDay,
} from "@/lib/kepco/client";
import { CookieJar, type KepcoSession } from "@/lib/kepco/login";

function session(): KepcoSession {
  return { jar: new CookieJar(), establishedAt: Date.now() };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PowerPlanner data client", () => {
  it("선택일의 합계·1시간·15분 데이터를 순서대로 정규화한다", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/rs/rs0101N_total.do")) return jsonResponse({ F_AP_QT: "100" });
      if (url.endsWith("/rs/rs0101N_hour.do")) return jsonResponse([{ MR_HHMI2: "01", F_AP_QT: "10" }]);
      if (url.endsWith("/rs/rs0101N_chart.do")) {
        return jsonResponse({ list1: [{ YYMMDD: "20260830", MR_HHMI: "0015", F_AP_QT: "2.5" }] });
      }
      return jsonResponse({}, 404);
    }));

    const result = await fetchKepcoUsageDay(session(), "20260830");
    expect(result.total.F_AP_QT).toBe("100");
    expect(result.hourly).toHaveLength(1);
    expect(result.interval[0].MR_HHMI).toBe("0015");
    expect(calls.map((url) => new URL(url).pathname)).toEqual([
      "/rs/rs0101N_total.do",
      "/rs/rs0101N_hour.do",
      "/rs/rs0101N_chart.do",
    ]);
  });

  it("청구 개요 12개월 중 요청한 월만 상세 HTML을 조회한다", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/cc/cc0102Info.do")) {
        return jsonResponse({
          yearValList: [
            { YEAR_ROW2: "2026.07", TOT_REQ_AMT: "1000" },
            { YEAR_ROW2: "2026.08", TOT_REQ_AMT: "2000" },
          ],
        });
      }
      if (url.includes("/cc/cc0103.do?yymm=2026.08")) {
        return new Response(`
          <input id="JOJ_YM" value="2026.08" />
          <td id="td_BSCHR">100</td><td id="td_USKI_CHRG">200</td>
          <td id="td_REQ_AMT">300</td><td id="tot_whm_ngt">10</td>
          <td id="tot_whm_alw">20</td><td id="tot_whm_pk">30</td>
        `, { status: 200, headers: { "content-type": "text/html" } });
      }
      return jsonResponse({}, 404);
    }));

    const rows = await fetchKepcoBilling(session(), 2026, new Set(["202608"]));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ billYm: "202607", detail: null });
    expect(rows[1]).toMatchObject({
      billYm: "202608",
      detail: { baseBill: "100", kwhBill: "200", reqBill: "300" },
    });
    expect(calls.filter((url) => url.includes("/cc/cc0103.do"))).toHaveLength(1);
  });

  it("PowerPlanner HTTP 오류를 경로와 상태코드가 포함된 오류로 전달한다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 503)));
    await expect(fetchKepcoUsageDay(session(), "20260830")).rejects.toThrow(
      "/rs/rs0101N_total.do HTTP 503",
    );
  });
});
