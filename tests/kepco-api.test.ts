import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  const segments = pathname.replace(/^\/api\//, "").split("?")[0].split("/");
  return { params: Promise.resolve({ path: segments }) };
}

describe("kepco API", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "kepco-api-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.db");
    process.env.KEPCO_BATCH_LOCK_PATH = path.join(tempDir, "kepco-pipeline.lock");
  });

  afterAll(() => {
    closeDatabasesForTests();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.KEPCO_BATCH_LOCK_PATH;
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
    expect(row).not.toHaveProperty("kepcoPasswd");
  });

  it("GET /api/firm — 업체 목록에 한전 비밀번호 필드를 직렬화하지 않는다", async () => {
    const res = await GET(request("/api/firm"), routeFor("/api/firm"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((row: Record<string, unknown>) => !("kepcoPasswd" in row))).toBe(true);
  });

  it("GET /api/kepco/firm/[fid] — 수집 전에는 모든 데이터셋이 비어 있다", async () => {
    const res = await GET(request("/api/kepco/firm/2"), routeFor("/api/kepco/firm/2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.summary).toBeNull();
    expect(body.data.contract).toBeNull();
    expect(body.data.dailyTotal).toEqual([]);
    expect(body.data.hourly).toEqual([]);
    expect(body.data.interval).toEqual([]);
    expect(body.data.monthly).toEqual([]);
    expect(body.data.billing).toEqual([]);
    expect(body.data.intervalMonth).toMatch(/^\d{6}$/);
  });

  it("POST /api/kepco/collect — 전체 배치 중에는 동일 계정 수동 수집을 차단한다", async () => {
    const lockPath = process.env.KEPCO_BATCH_LOCK_PATH as string;
    writeFileSync(lockPath, JSON.stringify({ owner: process.pid, pids: [process.pid] }));
    try {
      const res = await POST(
        request("/api/kepco/collect", "POST", { fid: 2 }),
        routeFor("/api/kepco/collect"),
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("KEPCO_BATCH_ACTIVE");
    } finally {
      rmSync(lockPath, { force: true });
    }
  });

  it("POST /api/kepco/collect — 고객번호 없는 업체는 no_credentials", async () => {
    const res = await POST(
      request("/api/kepco/collect", "POST", { fid: 1655 }),
      routeFor("/api/kepco/collect"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].status).toBe("no_credentials");

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

  it("수집 성공 데이터는 상세 API로 노출하되 raw_json은 노출하지 않는다", async () => {
    const db = getDb();
    db.prepare(
      `INSERT INTO kepco_summary (fid, collected_at, start_dt, end_dt, cntr_knd_nm, f_ap_qt, total_charge, predict_total_charge, joj_kw, max_pwr, max_pwr_time, raw_json)
       VALUES (7, '2026-08-29T00:00:00Z', '2026.08.01', '2026.08.31', '산업용(을)고압A', '1,234', '5,678', '9,000', '100', '95', '', '{"private":"value"}')`,
    ).run();
    db.prepare(
      "INSERT INTO kepco_contract (fid, collected_at, cntr_knd_cd, selbill_cd, raw_json) VALUES (7, '2026-08-29T00:00:00Z', '320', '1', '{\"private\":true}')",
    ).run();
    db.prepare(
      "INSERT INTO kepco_daily_total (fid, ymd, collected_at, f_ap_qt, max_pwr, raw_json) VALUES (7, '20260815', '2026-08-29T00:00:00Z', '100', '20', '{}')",
    ).run();
    db.prepare(
      "INSERT INTO kepco_hourly (fid, ymd, hhmi, f_ap_qt, max_pwr, co2, pf) VALUES (7, '20260830', '01', '10.5', '11.2', '0.01', '80.0')",
    ).run();
    db.prepare(
      `INSERT INTO kepco_interval
       (fid, ymd, hhmi, collected_at, f_ap_qt, max_pwr, no_data_yn, raw_json)
       VALUES (7, '20260815', '0015', '2026-08-29T00:00:00Z', '2.5', '10', 'N', '{"ICUS":"private"}')`,
    ).run();
    db.prepare(
      "INSERT INTO kepco_monthly (fid, yyyymm, f_ap_qt, kwh_bill) VALUES (7, '202608', '300', '1000')",
    ).run();
    db.prepare(
      `INSERT INTO kepco_billing
       (fid, bill_ym, collected_at, bill_aply_pwr, use_kwh, base_bill, kwh_bill, req_bill,
        lload_usekwh, mload_usekwh, maxload_usekwh, ji_pwrfact, jn_pwrfact, raw_json)
       VALUES (7, '202608', '2026-08-29T00:00:00Z', '100', '300', '500', '1000', '1500',
               '80', '120', '100', '95', '100', '{"private":true}')`,
    ).run();

    const pathname = "/api/kepco/firm/7?month=202608";
    const res = await GET(request(pathname), routeFor(pathname));
    const body = await res.json();
    expect(body.data.summary.cntr_knd_nm).toBe("산업용(을)고압A");
    expect(body.data.summary).not.toHaveProperty("raw_json");
    expect(body.data.contract).toEqual({
      collected_at: "2026-08-29T00:00:00Z",
      cntr_knd_cd: "320",
      selbill_cd: "1",
    });
    expect(body.data.dailyTotal).toHaveLength(1);
    expect(body.data.hourly).toHaveLength(1);
    expect(body.data.interval).toHaveLength(1);
    expect(body.data.interval[0]).not.toHaveProperty("raw_json");
    expect(body.data.intervalMonth).toBe("202608");
    expect(body.data.monthly[0].yyyymm).toBe("202608");
    expect(body.data.billing).toHaveLength(1);
    expect(body.data.billing[0].req_bill).toBe("1500");
    expect(body.data.billing[0]).not.toHaveProperty("raw_json");
  });
});
