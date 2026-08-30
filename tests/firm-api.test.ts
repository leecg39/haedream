import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabasesForTests, getDb } from "@/lib/db";
import { GET, POST } from "@/app/api/firm/route";

const origin = "http://localhost";

function request(method = "GET", body?: unknown) {
  return new NextRequest(`${origin}/api/firm`, {
    method,
    headers: body ? { "content-type": "application/json", origin } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/firm", () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "firm-api-"));
    process.env.DATABASE_PATH = path.join(tempDir, "test.db");
    process.env.RATE_LIMIT_DISABLED = "true";
    getDb()
      .prepare("INSERT INTO firms (fid, seq, firm_name, kepco_no) VALUES (?, ?, ?, ?)")
      .run(1661, 0, "(주)알앤텍_2", "0927031098");
  });

  afterAll(() => {
    closeDatabasesForTests();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it("GET 은 정적 firm.html 이 소비하던 { cat, data } 형태를 유지한다", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cat).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ fid: 1661, firmName: "(주)알앤텍_2" });
    // 앞자리 0 이 살아 있어야 한다(문자열 보관).
    expect(body.data[0].kepcoNo).toBe("0927031098");
  });

  it("GET 응답에 한전 비밀번호가 들어가지 않는다", async () => {
    const response = await GET(request());
    const raw = JSON.stringify(await response.json());
    expect(raw).not.toContain("kepcoPasswd");
    expect(raw).not.toContain("kepco_passwd");
  });

  it("POST 로 업체를 등록하면 201 과 등록 결과를 돌려준다", async () => {
    const response = await POST(request("POST", { firmName: "QA API 업체", contractLimit: "150" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toMatchObject({ firmName: "QA API 업체", contractLimit: 150 });

    const listed = await (await GET(request())).json();
    expect(listed.data.some((row: { firmName: string }) => row.firmName === "QA API 업체")).toBe(true);
  });

  it("업체 이름이 없으면 422 로 거부한다", async () => {
    const response = await POST(request("POST", { firmName: "" }));
    expect(response.status).toBe(422);
  });

  it("한전 비밀번호를 실어 보내면 422 로 거부한다", async () => {
    const response = await POST(
      request("POST", { firmName: "비밀번호 주입", kepcoPasswd: "secret" }),
    );
    expect(response.status).toBe(422);
    const listed = await (await GET(request())).json();
    expect(listed.data.some((row: { firmName: string }) => row.firmName === "비밀번호 주입")).toBe(
      false,
    );
  });

  it("다른 출처에서 온 POST 는 거부한다", async () => {
    const cross = new NextRequest(`${origin}/api/firm`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://evil.example" },
      body: JSON.stringify({ firmName: "교차 출처" }),
    });
    const response = await POST(cross);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
