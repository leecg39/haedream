// Regression: ISSUE-001 — PII 비권한 업체 편집 시 "저장은 200, 데이터는 유실" 되던 무음 드랍
// Found by /qa on 2026-09-07
// Report: .gstack/qa-reports/qa-report-solarsimz-2026-09-07.md
//
// 잠긴 계약:
// 1) 상세 GET /api/firm/[fid] 는 canWritePii 를 함께 내려준다
//    (role 권한 + tenant_firm_access.can_view_pii — 목록 마스킹과 같은 규칙).
// 2) canWritePii=false 업체에 PATCH 로 PII(memo)를 보내도 서버는 조용히
//    무시하고 이전값을 유지한다(방어는 유지, UI 가 잠글 수 있게 플래그 제공).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as firmDetailGET, PATCH as firmDetailPATCH } from "@/app/api/firm/[fid]/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { closeDatabasesForTests, getDb, openDatabase } from "@/lib/db";
import { clearRateLimitsForTests } from "@/lib/http";
import { seedDatabase } from "@/lib/seed";

const origin = "http://localhost";

function request(
  pathname: string,
  method = "GET",
  cookie?: string,
  body?: unknown,
) {
  const hasBody = body !== undefined;
  return new NextRequest(`${origin}${pathname}`, {
    method,
    headers: {
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
      ...(hasBody ? { "content-type": "application/json", origin } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
}

function routeFor(fid: number) {
  return { params: Promise.resolve({ fid: String(fid) }) };
}

async function login(username: string) {
  // 기존 관례(fit-authorization.test.ts)와 같이 토큰 발급 라우트로 세션을 만든다.
  process.env.DEFAULT_TENANT_ID = "121";
  const { POST: tokensPOST } = await import("@/app/api/[...path]/route");
  const response = await tokensPOST(
    request("/api/tokens", "POST", undefined, { cf: "login", id: username, pw: "demo" }),
    { params: Promise.resolve({ path: ["tokens"] }) },
  );
  expect(response.status).toBe(200);
  const token = response.cookies.get(SESSION_COOKIE)?.value;
  expect(token).toBeTruthy();
  return token as string;
}

describe("ISSUE-001 회귀: 업체 상세 canWritePii 플래그", () => {
  let directory: string;
  let adminCookie: string;

  beforeAll(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-qa-issue001-"));
    process.env.DATABASE_PATH = path.join(directory, "issue001.db");
    process.env.RATE_LIMIT_DISABLED = "true";
    const db = openDatabase(process.env.DATABASE_PATH);
    seedDatabase(db);
    const now = new Date().toISOString();
    const insertFirm = db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name, kepco_no) VALUES (?, ?, ?, ?)",
    );
    insertFirm.run(101, 1, "PII 허가 업체", "1000000001");
    insertFirm.run(202, 2, "PII 미허가 업체", "1000000002");
    db.prepare(
      "UPDATE firms SET memo = '원본 메모' WHERE fid IN (101, 202)",
    ).run();
    const grant = db.prepare(
      `INSERT INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, ?, ?, 0, ?)`,
    );
    grant.run("121", 101, 1, now);
    grant.run("121", 202, 0, now);
    db.close();
    closeDatabasesForTests();
    clearRateLimitsForTests();
    adminCookie = await login("admin");
  });

  afterAll(() => {
    closeDatabasesForTests();
    clearRateLimitsForTests();
    delete process.env.DATABASE_PATH;
    delete process.env.DEFAULT_TENANT_ID;
    delete process.env.RATE_LIMIT_DISABLED;
    rmSync(directory, { recursive: true, force: true });
  });

  it("can_view_pii=1 업체는 canWritePii=true 이고 PII 원문을 내려준다", async () => {
    const response = await firmDetailGET(request("/api/firm/101", "GET", adminCookie), routeFor(101));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { memo?: string }; canWritePii?: boolean };
    expect(body.canWritePii).toBe(true);
    expect(body.data.memo).toBe("원본 메모");
  });

  it("can_view_pii=0 업체는 canWritePii=false 이고 PII 는 마스킹된다", async () => {
    const response = await firmDetailGET(request("/api/firm/202", "GET", adminCookie), routeFor(202));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { memo?: string }; canWritePii?: boolean };
    expect(body.canWritePii).toBe(false);
    expect(body.data.memo).toBe("");
  });

  it("canWritePii=false 업체에 PATCH 로 memo 를 보내도 서버는 이전값을 유지한다", async () => {
    const response = await firmDetailPATCH(
      request("/api/firm/202", "PATCH", adminCookie, { memo: "유실되면 안 되는 입력", version: 1 }),
      routeFor(202),
    );
    expect(response.status).toBe(200);
    const db = openDatabase(process.env.DATABASE_PATH!);
    const row = db.prepare("SELECT memo FROM firms WHERE fid = 202").get() as { memo: string };
    db.close();
    expect(row.memo).toBe("원본 메모");
  });
});
