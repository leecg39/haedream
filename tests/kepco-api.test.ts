import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabasesForTests, getDb } from "@/lib/db";
import { GET, POST } from "@/app/api/[...path]/route";

const origin = "http://localhost";

function request(pathname: string, method = "GET", body?: unknown) {
  return new NextRequest(`${origin}${pathname}`, {
    method,
    headers: body ? { "content-type": "application/json", origin } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function routeFor(pathname: string) {
  const segments = pathname.replace(/^\/api\//, "").split("/");
  return { params: Promise.resolve({ path: segments }) };
}

describe("kepco API", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "kepco-api-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.db");
  });

  afterAll(() => {
    closeDatabasesForTests();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("GET /api/kepco/status — 고객번호 등록 업체 목록과 수집 상태를 반환한다", async () => {
    const res = await GET(request("/api/kepco/status"), routeFor("/api/kepco/status"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cat).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const row = body.data[0];
    expect(row).toHaveProperty("fid");
    expect(row).toHaveProperty("firmName");
    expect(row).toHaveProperty("kepcoNo");
    expect(row).toHaveProperty("hasPasswd");
    expect(row).toHaveProperty("lastStatus");
    // 비밀번호 자체는 절대 내려주지 않는다.
    expect(row).not.toHaveProperty("kepcoPasswd");
  });

  it("GET /api/kepco/firm/[fid] — 수집 전에는 빈 데이터를 반환한다", async () => {
    const res = await GET(request("/api/kepco/firm/2"), routeFor("/api/kepco/firm/2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary).toBeNull();
    expect(body.data.hourly).toEqual([]);
    expect(body.data.monthly).toEqual([]);
  });

  it("POST /api/kepco/collect — 고객번호 없는 업체는 no_credentials", async () => {
    // fid=1655 한산스크류: 한전고객번호 미등록 업체
    const res = await POST(
      request("/api/kepco/collect", "POST", { fid: 1655 }),
      routeFor("/api/kepco/collect"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].status).toBe("no_credentials");

    // 수집 로그가 DB에 남는다
    const db = getDb();
    const log = db
      .prepare("SELECT status FROM kepco_collect_log WHERE fid = 1655 ORDER BY id DESC LIMIT 1")
      .get() as { status: string };
    expect(log.status).toBe("no_credentials");
  });

  it("POST /api/kepco/collect — 존재하지 않는 업체는 404", async () => {
    const res = await POST(
      request("/api/kepco/collect", "POST", { fid: 999999 }),
      routeFor("/api/kepco/collect"),
    );
    expect(res.status).toBe(404);
  });

  it("수집 성공 데이터는 firm 조회 API로 그대로 노출된다", async () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO kepco_summary (fid, collected_at, start_dt, end_dt, cntr_knd_nm, f_ap_qt, total_charge, predict_total_charge, joj_kw, max_pwr, max_pwr_time, raw_json)
       VALUES (7, '2026-08-29T00:00:00Z', '2026.08.01', '2026.08.31', '산업용(을)고압A', '1,234', '5,678', '9,000', '100', '95', '', '{}')`,
    ).run();
    const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
    db.prepare(
      "INSERT INTO kepco_hourly (fid, ymd, hhmi, f_ap_qt, max_pwr, co2, pf) VALUES (7, ?, '01', '10.5', '11.2', '0.01', '80.0')",
    ).run(ymd);
    db.prepare(
      "INSERT INTO kepco_monthly (fid, yyyymm, f_ap_qt, kwh_bill) VALUES (7, '202608', '300', '1000')",
    ).run();

    const res = await GET(request("/api/kepco/firm/7"), routeFor("/api/kepco/firm/7"));
    const body = await res.json();
    expect(body.data.summary.cntr_knd_nm).toBe("산업용(을)고압A");
    expect(body.data.hourly).toHaveLength(1);
    expect(body.data.hourly[0].f_ap_qt).toBe("10.5");
    expect(body.data.monthly).toHaveLength(1);
    expect(body.data.monthly[0].yyyymm).toBe("202608");
  });
});
