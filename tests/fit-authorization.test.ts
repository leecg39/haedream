import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DELETE as catchAllDELETE,
  GET as catchAllGET,
  PATCH as catchAllPATCH,
  POST as catchAllPOST,
  PUT as catchAllPUT,
} from "@/app/api/[...path]/route";
import {
  DELETE as firmDELETE,
  GET as firmGET,
  PATCH as firmPATCH,
  POST as firmPOST,
  PUT as firmPUT,
} from "@/app/api/firm/route";
import {
  GET as firmDetailGET,
  PATCH as firmDetailPATCH,
} from "@/app/api/firm/[fid]/route";
import { SESSION_COOKIE } from "@/lib/auth";
import { closeDatabasesForTests, getDb, openDatabase } from "@/lib/db";
import { clearRateLimitsForTests } from "@/lib/http";
import { seedDatabase } from "@/lib/seed";
import { processQueuedJobs } from "@/features/kepco/jobs.repository";

const origin = "http://localhost";

function request(
  pathname: string,
  method = "GET",
  cookie?: string,
  body?: unknown,
  rawBody?: string,
) {
  const hasBody = body !== undefined || rawBody !== undefined;
  return new NextRequest(`${origin}${pathname}`, {
    method,
    headers: {
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
      ...(hasBody ? { "content-type": "application/json", origin } : {}),
    },
    ...(hasBody ? { body: rawBody ?? JSON.stringify(body) } : {}),
  });
}

function routeFor(pathname: string) {
  const segments = pathname.replace(/^\/api\//, "").split("?")[0].split("/");
  return { params: Promise.resolve({ path: segments }) };
}

async function login(username: string, tenantId = "121") {
  process.env.DEFAULT_TENANT_ID = tenantId;
  const response = await catchAllPOST(
    request("/api/tokens", "POST", undefined, {
      cf: "login",
      id: username,
      pw: "demo",
    }),
    routeFor("/api/tokens"),
  );
  expect(response.status).toBe(200);
  const token = response.cookies.get(SESSION_COOKIE)?.value;
  expect(token).toBeTruthy();
  return token as string;
}

async function errorCode(response: Response) {
  const body = (await response.json()) as { error?: { code?: string } };
  return body.error?.code;
}

describe("FIT 업체·한전 접근 제어", () => {
  let directory: string;
  let adminCookie: string;
  let operatorCookie: string;
  let viewerCookie: string;
  let outsiderCookie: string;

  beforeAll(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-fit-auth-"));
    process.env.DATABASE_PATH = path.join(directory, "fit-auth.db");
    process.env.RATE_LIMIT_DISABLED = "true";
    process.env.KEPCO_INLINE_WORKER = "0";
    const db = openDatabase(process.env.DATABASE_PATH);
    seedDatabase(db);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO tenants (id, name, timezone, created_at)
       VALUES ('999', '외부 조직', 'Asia/Seoul', ?)`,
    ).run(now);
    db.prepare(
      `INSERT INTO users
       (id, tenant_id, username, name, password_hash, role, active, created_at, updated_at)
       SELECT '99999999-9999-4999-8999-999999999999', '999', 'outsider',
              '외부 관리자', password_hash, 'ADMIN', 1, ?, ?
       FROM users WHERE username = 'admin' AND tenant_id = '121'`,
    ).run(now, now);
    const insertFirm = db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name, kepco_no) VALUES (?, ?, ?, ?)",
    );
    insertFirm.run(101, 1, "허가 업체 A", "1000000001");
    insertFirm.run(202, 2, "허가 업체 B", "1000000002");
    insertFirm.run(303, 3, "외부 업체", "1000000003");
    db.prepare(
      "UPDATE firms SET manager = '담당자', phone = '01012345678', address_text = '합성 주소' WHERE fid = 101",
    ).run();
    const grant = db.prepare(
      `INSERT INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    grant.run("121", 101, 1, 1, now);
    grant.run("121", 202, 0, 0, now);
    grant.run("999", 303, 1, 1, now);
    db.close();
    closeDatabasesForTests();
    clearRateLimitsForTests();

    adminCookie = await login("admin");
    operatorCookie = await login("operator");
    viewerCookie = await login("viewer");
    outsiderCookie = await login("outsider", "999");
    process.env.DEFAULT_TENANT_ID = "121";
  });

  afterAll(() => {
    closeDatabasesForTests();
    clearRateLimitsForTests();
    delete process.env.DATABASE_PATH;
    delete process.env.DEFAULT_TENANT_ID;
    delete process.env.RATE_LIMIT_DISABLED;
    rmSync(directory, { recursive: true, force: true });
  });

  it("마이그레이션은 업체 전체를 자동 허가하지 않는다", () => {
    const db = getDb();
    const grants = db
      .prepare("SELECT tenant_id, fid FROM tenant_firm_access ORDER BY tenant_id, fid")
      .all();
    expect(grants).toEqual([
      { tenant_id: "121", fid: 101 },
      { tenant_id: "121", fid: 202 },
      { tenant_id: "121", fid: 2_000_000_001 },
      { tenant_id: "121", fid: 2_000_000_002 },
      { tenant_id: "999", fid: 303 },
    ]);
  });

  it("익명 업체 목록 조회는 401이며 캐시되지 않는다", async () => {
    const response = await firmGET(request("/api/firm"));
    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe("AUTH_REQUIRED");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("업체 루트의 미지원 쓰기 메서드도 익명 401, VIEWER 403을 먼저 반환한다", async () => {
    for (const handler of [firmPUT, firmPATCH, firmDELETE]) {
      const anonymous = await handler(
        request("/api/firm", "PATCH", undefined, undefined, "{malformed"),
      );
      expect(anonymous.status).toBe(401);
      const viewer = await handler(
        request("/api/firm", "PATCH", viewerCookie, undefined, "{malformed"),
      );
      expect(viewer.status).toBe(403);
    }
  });

  it("업체 목록은 현재 테넌트에 매핑된 업체만 반환한다", async () => {
    const response = await firmGET(request("/api/firm", "GET", operatorCookie));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: Array<{ fid: number }> };
    expect(body.data.map((row) => row.fid).sort((a, b) => a - b)).toEqual([
      101,
      202,
      2_000_000_001,
      2_000_000_002,
    ]);
    expect(response.headers.get("cache-control")).toBe("private, no-store");

    const outsider = await firmGET(request("/api/firm", "GET", outsiderCookie));
    const outsiderBody = (await outsider.json()) as { data: Array<{ fid: number }> };
    expect(outsiderBody.data.map((row) => row.fid)).toEqual([303]);
  });

  it("VIEWER와 PII 미허가 매핑은 고객정보 원문을 받지 않는다", async () => {
    const viewerResponse = await firmGET(request("/api/firm", "GET", viewerCookie));
    const viewerBody = (await viewerResponse.json()) as {
      data: Array<{ fid: number; kepcoNo: string; phone?: string; addressText?: string }>;
    };
    const viewerFirm = viewerBody.data.find((row) => row.fid === 101);
    expect(viewerFirm?.kepcoNo).toBe("******0001");
    expect(viewerFirm).not.toHaveProperty("phone");
    expect(viewerFirm).not.toHaveProperty("addressText");
    expect(viewerFirm).not.toHaveProperty("manager");
    expect(viewerFirm).not.toHaveProperty("mapGeo");

    const operatorResponse = await firmGET(request("/api/firm", "GET", operatorCookie));
    const operatorBody = (await operatorResponse.json()) as {
      data: Array<{ fid: number; kepcoNo: string; phone?: string }>;
    };
    expect(operatorBody.data.find((row) => row.fid === 101)?.kepcoNo).toBe("1000000001");
    expect(operatorBody.data.find((row) => row.fid === 202)?.kepcoNo).toBe("******0002");
    expect(operatorBody.data[0]).not.toHaveProperty("phone");

    const detail = await catchAllGET(
      request("/api/firm/101", "GET", viewerCookie),
      routeFor("/api/firm/101"),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as {
      data: { phone: string; addressText: string; kepcoNo: string };
    };
    expect(detailBody.data).toMatchObject({
      kepcoNo: "******0001",
      phone: "",
      addressText: "",
    });
  });

  it("VIEWER의 malformed 업체 쓰기는 본문 검증보다 먼저 403이고 DB를 바꾸지 않는다", async () => {
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) AS count FROM firms").get() as { count: number }).count;
    const response = await firmPOST(
      request("/api/firm", "POST", viewerCookie, undefined, "{malformed"),
    );
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FORBIDDEN");
    const after = (db.prepare("SELECT COUNT(*) AS count FROM firms").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("OPERATOR의 업체 생성은 새 업체 접근 매핑까지 한 트랜잭션으로 만든다", async () => {
    const response = await firmPOST(
      request("/api/firm", "POST", operatorCookie, { firmName: "새 허가 업체" }),
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { data: { fid: number } };
    const access = getDb()
      .prepare("SELECT can_view_pii, can_collect FROM tenant_firm_access WHERE tenant_id = ? AND fid = ?")
      .get("121", body.data.fid);
    expect(access).toEqual({ can_view_pii: 0, can_collect: 0 });
  });

  it("demo mock API는 GET만 허용하고 익명 쓰기 메서드를 기본 거부한다", async () => {
    const cases = [
      [catchAllPOST, "POST"],
      [catchAllPUT, "PUT"],
      [catchAllPATCH, "PATCH"],
      [catchAllDELETE, "DELETE"],
    ] as const;

    for (const [handler, method] of cases) {
      for (const pathname of ["/api/controls/121", "/api/acp/121", "/api/peak-set/121"]) {
        const response = await handler(request(pathname, method), routeFor(pathname));
        expect(response.status, `${method} ${pathname}`).toBe(405);
        expect(await errorCode(response)).toBe("METHOD_NOT_ALLOWED");
      }
    }
  });

  it("인코딩된 firm 별칭도 인증·권한 검사를 우회하지 못한다", async () => {
    for (const encoded of ["%66irm", "f%69rm", "fir%6d"]) {
      const pathname = `/api/${encoded}`;
      const anonymous = await catchAllGET(request(pathname), routeFor(pathname));
      expect(anonymous.status, pathname).toBe(401);
      expect(await errorCode(anonymous)).toBe("AUTH_REQUIRED");

      const viewerWrite = await catchAllPATCH(
        request(pathname, "PATCH", viewerCookie, undefined, "{malformed"),
        routeFor(pathname),
      );
      expect(viewerWrite.status, pathname).toBe(403);
      expect(await errorCode(viewerWrite)).toBe("FORBIDDEN");
    }
  });

  it("업체 catch-all은 인증 후 업체 범위를 검사하고 쓰기 메서드를 기본 거부한다", async () => {
    const anonymous = await catchAllGET(
      request("/api/firm/101"),
      routeFor("/api/firm/101"),
    );
    expect(anonymous.status).toBe(401);

    const crossTenant = await catchAllGET(
      request("/api/firm/303", "GET", operatorCookie),
      routeFor("/api/firm/303"),
    );
    expect(crossTenant.status).toBe(403);
    expect(await errorCode(crossTenant)).toBe("FIRM_ACCESS_DENIED");

    const viewerMalformed = await catchAllPATCH(
      request("/api/firm/101", "PATCH", viewerCookie, undefined, "{malformed"),
      routeFor("/api/firm/101"),
    );
    expect(viewerMalformed.status).toBe(403);
    expect(await errorCode(viewerMalformed)).toBe("FORBIDDEN");

    const unsupported = await catchAllPATCH(
      request("/api/firm/101", "PATCH", operatorCookie, { firmName: "변경" }),
      routeFor("/api/firm/101"),
    );
    expect(unsupported.status).toBe(405);
  });

  it("업체 catch-all은 정확한 root 또는 단일 fid 형태만 허용한다", async () => {
    const detail = await catchAllGET(
      request("/api/firm/101", "GET", operatorCookie),
      routeFor("/api/firm/101"),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as { data: { fid: number } };
    expect(detailBody.data).toMatchObject({ fid: 101 });
    expect(Array.isArray(detailBody.data)).toBe(false);

    const deep = await catchAllGET(
      request("/api/firm/101/extra", "GET", operatorCookie),
      routeFor("/api/firm/101/extra"),
    );
    expect(deep.status).toBe(404);
    expect(await errorCode(deep)).toBe("API_NOT_FOUND");
  });

  it("KEPCO 상태와 상세는 세션과 업체 범위를 적용한다", async () => {
    const anonymousStatus = await catchAllGET(
      request("/api/kepco/status"),
      routeFor("/api/kepco/status"),
    );
    expect(anonymousStatus.status).toBe(401);

    const status = await catchAllGET(
      request("/api/kepco/status", "GET", viewerCookie),
      routeFor("/api/kepco/status"),
    );
    expect(status.status).toBe(200);
    const body = (await status.json()) as { data: Array<{ fid: number }> };
    expect(body.data.map((row) => row.fid).sort((a, b) => a - b)).toEqual([
      101,
      202,
      2_000_000_001,
      2_000_000_002,
    ]);

    const allowed = await catchAllGET(
      request("/api/kepco/firm/101", "GET", viewerCookie),
      routeFor("/api/kepco/firm/101"),
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toBe("private, no-store");

    const denied = await catchAllGET(
      request("/api/kepco/firm/303", "GET", adminCookie),
      routeFor("/api/kepco/firm/303"),
    );
    expect(denied.status).toBe(403);
    expect(await errorCode(denied)).toBe("FIRM_ACCESS_DENIED");
  });

  it("VIEWER 수집은 malformed 본문도 403이며 작업을 만들지 않는다", async () => {
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    const response = await catchAllPOST(
      request("/api/kepco/collect", "POST", viewerCookie, undefined, "{malformed"),
      routeFor("/api/kepco/collect"),
    );
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FORBIDDEN");
    const after = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("빈 수집 본문은 전체 배치로 승격되지 않고 422이며 부수 효과가 없다", async () => {
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    const response = await catchAllPOST(
      request("/api/kepco/collect", "POST", operatorCookie, {}),
      routeFor("/api/kepco/collect"),
    );
    expect(response.status).toBe(422);
    expect(await errorCode(response)).toBe("VALIDATION_ERROR");
    const after = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("매핑되지 않은 업체 수집은 403이며 작업을 만들지 않는다", async () => {
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    const response = await catchAllPOST(
      request("/api/kepco/collect", "POST", operatorCookie, { fid: 303 }),
      routeFor("/api/kepco/collect"),
    );
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FIRM_ACCESS_DENIED");
    const after = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("can_collect 없는 허가 업체도 수집은 403이다", async () => {
    const response = await catchAllPOST(
      request("/api/kepco/collect", "POST", operatorCookie, { fid: 202 }),
      routeFor("/api/kepco/collect"),
    );
    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe("FIRM_COLLECTION_DENIED");
  });

  it("허가된 OPERATOR 단일 수집은 202 작업만 만들고 worker 가 해당 fid 만 처리한다", async () => {
    const db = getDb();
    const beforeJobs = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    const beforeLogs = (db.prepare("SELECT COUNT(*) AS count FROM kepco_collect_log").get() as { count: number }).count;
    const response = await catchAllPOST(
      request("/api/kepco/collect", "POST", operatorCookie, { fid: 101, mode: "single" }),
      routeFor("/api/kepco/collect"),
    );
    expect(response.status).toBe(202);
    const body = (await response.json()) as { data: { jobId: string; fid: number; status: string } };
    expect(body.data).toMatchObject({ fid: 101, status: "QUEUED" });
    expect(body.data.jobId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(
      (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count - beforeJobs,
    ).toBe(1);

    await processQueuedJobs(5);
    const job = db
      .prepare("SELECT status, failure_count, error_code FROM collection_jobs WHERE id = ?")
      .get(body.data.jobId) as { status: string; failure_count: number; error_code: string };
    expect(job.status).toBe("FAILED");
    expect(job.error_code).toBe("NO_CREDENTIALS");
    const logs = db
      .prepare("SELECT fid, status FROM kepco_collect_log ORDER BY id DESC LIMIT ?")
      .all(
        (db.prepare("SELECT COUNT(*) AS count FROM kepco_collect_log").get() as { count: number }).count - beforeLogs,
      ) as Array<{ fid: number; status: string }>;
    expect(logs).toEqual([{ fid: 101, status: "no_credentials" }]);
  });

  it("같은 업체의 동시 수집은 활성 작업 하나만 만들고 나머지는 409로 거부한다", async () => {
    const db = getDb();
    const before = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    const responses = await Promise.all([
      catchAllPOST(
        request("/api/kepco/collect", "POST", operatorCookie, { fid: 101 }),
        routeFor("/api/kepco/collect"),
      ),
      catchAllPOST(
        request("/api/kepco/collect", "POST", operatorCookie, { fid: 101 }),
        routeFor("/api/kepco/collect"),
      ),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([202, 409]);
    const after = (db.prepare("SELECT COUNT(*) AS count FROM collection_jobs").get() as { count: number }).count;
    expect(after - before).toBe(1);
    await processQueuedJobs(5);
  });

  it("업체별 수집 속도 제한은 권한·본문·범위 검사 뒤 적용된다", async () => {
    process.env.RATE_LIMIT_DISABLED = "false";
    clearRateLimitsForTests();
    try {
      const responses = [];
      for (let index = 0; index < 6; index += 1) {
        responses.push(await catchAllPOST(
          request("/api/kepco/collect", "POST", operatorCookie, { fid: 101 }),
          routeFor("/api/kepco/collect"),
        ));
        // 활성 작업을 비워 다음 요청이 중복 409 가 아니라 rate limit 경로를 타게 한다.
        await processQueuedJobs(5);
      }
      expect(responses.slice(0, 5).every((response) => response.status === 202)).toBe(true);
      expect(responses[5]?.status).toBe(429);
      expect(await errorCode(responses[5]!)).toBe("RATE_LIMITED");
    } finally {
      process.env.RATE_LIMIT_DISABLED = "true";
      clearRateLimitsForTests();
    }
  });

  it("만료된 세션은 보호 API에서 401이다", async () => {
    const db = getDb();
    const expiredCookie = await login("operator");
    const tokenHash = createHash("sha256").update(expiredCookie).digest("hex");
    db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token_hash = ?")
      .run(tokenHash);
    const response = await firmGET(request("/api/firm", "GET", expiredCookie));
    expect(response.status).toBe(401);
  });

  it("업체 상세 PATCH는 낙관적 잠금과 권한을 적용한다", async () => {
    const detailCtx = { params: Promise.resolve({ fid: "101" }) };
    const anonymous = await firmDetailPATCH(
      request("/api/firm/101", "PATCH", undefined, { version: 1, firmName: "x" }),
      detailCtx,
    );
    expect(anonymous.status).toBe(401);

    const viewer = await firmDetailPATCH(
      request("/api/firm/101", "PATCH", viewerCookie, { version: 1, firmName: "x" }),
      detailCtx,
    );
    expect(viewer.status).toBe(403);

    const detail = await firmDetailGET(
      request("/api/firm/101", "GET", operatorCookie),
      detailCtx,
    );
    expect(detail.status).toBe(200);
    const before = (await detail.json()) as { data: { version: number; firmName: string } };

    const updated = await firmDetailPATCH(
      request("/api/firm/101", "PATCH", operatorCookie, {
        version: before.data.version,
        firmName: "허가 업체 A 수정",
      }),
      detailCtx,
    );
    expect(updated.status).toBe(200);
    const body = (await updated.json()) as { data: { version: number; firmName: string } };
    expect(body.data).toMatchObject({
      firmName: "허가 업체 A 수정",
      version: before.data.version + 1,
    });

    const conflict = await firmDetailPATCH(
      request("/api/firm/101", "PATCH", operatorCookie, {
        version: before.data.version,
        firmName: "오래된 저장",
      }),
      detailCtx,
    );
    expect(conflict.status).toBe(409);
    expect(await errorCode(conflict)).toBe("FIRM_VERSION_CONFLICT");
  });
});
