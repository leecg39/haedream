import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabasesForTests, getDb } from "@/lib/db";
import { GET, POST } from "@/app/api/firm/route";
import { POST as tokenPOST } from "@/app/api/[...path]/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

const origin = "http://localhost";

function request(method = "GET", body?: unknown, cookie?: string) {
  return new NextRequest(`${origin}/api/firm`, {
    method,
    headers: {
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
      ...(body ? { "content-type": "application/json", origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/firm", () => {
  let tempDir: string;
  let operatorCookie: string;

  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "firm-api-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.db");
    process.env.RATE_LIMIT_DISABLED = "true";
    const db = getDb();
    seedDatabase(db);
    db.prepare("DELETE FROM tenant_firm_access WHERE tenant_id = '121'").run();
    db
      .prepare("INSERT INTO firms (fid, seq, firm_name, kepco_no) VALUES (?, ?, ?, ?)")
      .run(1661, 0, "(주)알앤텍_2", "0927031098");
    db.prepare(
      `INSERT INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES ('121', 1661, 1, 1, ?)`,
    ).run(new Date().toISOString());
    const login = await tokenPOST(
      new NextRequest(`${origin}/api/tokens`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ cf: "login", id: "operator", pw: "demo" }),
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    operatorCookie = login.cookies.get(SESSION_COOKIE)?.value ?? "";
    expect(operatorCookie).toBeTruthy();
  });

  afterAll(() => {
    closeDatabasesForTests();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it("GET 은 정적 firm.html 이 소비하던 { cat, data } 형태를 유지한다", async () => {
    const response = await GET(request("GET", undefined, operatorCookie));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cat).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ fid: 1661, firmName: "(주)알앤텍_2" });
    // 앞자리 0 이 살아 있어야 한다(문자열 보관).
    expect(body.data[0].kepcoNo).toBe("0927031098");
  });

  it("GET 응답에 한전 비밀번호가 들어가지 않는다", async () => {
    const response = await GET(request("GET", undefined, operatorCookie));
    const raw = JSON.stringify(await response.json());
    expect(raw).not.toContain("kepcoPasswd");
    expect(raw).not.toContain("kepco_passwd");
  });

  it("POST 로 업체를 등록하면 201 과 등록 결과를 돌려준다", async () => {
    const response = await POST(request("POST", { firmName: "QA API 업체", contractLimit: "150" }, operatorCookie));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toMatchObject({ firmName: "QA API 업체", contractLimit: 150 });

    const listed = await (await GET(request("GET", undefined, operatorCookie))).json();
    expect(listed.data.some((row: { firmName: string }) => row.firmName === "QA API 업체")).toBe(true);
  });

  it("업체 이름이 없으면 422 로 거부한다", async () => {
    const response = await POST(request("POST", { firmName: "" }, operatorCookie));
    expect(response.status).toBe(422);
  });

  it("한전 비밀번호를 실어 보내면 422 로 거부한다", async () => {
    const response = await POST(
      request("POST", { firmName: "비밀번호 주입", kepcoPasswd: "secret" }, operatorCookie),
    );
    expect(response.status).toBe(422);
    const listed = await (await GET(request("GET", undefined, operatorCookie))).json();
    expect(listed.data.some((row: { firmName: string }) => row.firmName === "비밀번호 주입")).toBe(
      false,
    );
  });

  it("다른 출처에서 온 POST 는 거부한다", async () => {
    const cross = new NextRequest(`${origin}/api/firm`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://evil.example",
        cookie: `${SESSION_COOKIE}=${operatorCookie}`,
      },
      body: JSON.stringify({ firmName: "교차 출처" }),
    });
    const response = await POST(cross);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
