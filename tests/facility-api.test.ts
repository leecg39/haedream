import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabasesForTests, getDb, openDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { SESSION_COOKIE } from "@/lib/auth";
import { clearRateLimitsForTests } from "@/lib/http";
import { POST as tokenPost } from "@/app/api/[...path]/route";
import {
  GET as facilitiesGet,
  POST as facilitiesPost,
} from "@/app/api/facilities/route";
import {
  DELETE as facilityDelete,
  GET as facilityGet,
  PATCH as facilityPatch,
} from "@/app/api/facilities/[id]/route";
import { POST as facilityRestore } from "@/app/api/facilities/[id]/restore/route";
import { DELETE as facilityPurge } from "@/app/api/facilities/[id]/purge/route";
import { GET as sessionGet } from "@/app/api/auth/session/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";

const origin = "http://localhost";

function request(
  url: string,
  method = "GET",
  cookie?: string,
  body?: unknown,
) {
  return new NextRequest(`${origin}${url}`, {
    method,
    headers: {
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
      ...(body ? { "content-type": "application/json", origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function json(response: Response) {
  return response.json() as Promise<{
    ok: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  }>;
}

async function login(username: string) {
  const response = await tokenPost(
    request("/api/tokens", "POST", undefined, {
      cf: "login",
      id: username,
      pw: "demo",
    }),
    { params: Promise.resolve({ path: ["tokens"] }) },
  );
  expect(response.status).toBe(200);
  const cookie = response.cookies.get(SESSION_COOKIE)?.value;
  expect(cookie).toBeTruthy();
  return cookie as string;
}

describe("facility API integration", () => {
  let directory: string;
  let adminCookie: string;
  let operatorCookie: string;
  let viewerCookie: string;
  let outsiderCookie: string;
  let createdId: string;
  let createdVersion: number;

  beforeAll(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-api-"));
    process.env.DATABASE_PATH = path.join(directory, "api.db");
    const db = openDatabase(process.env.DATABASE_PATH);
    seedDatabase(db);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO tenants (id, name, timezone, created_at)
       VALUES ('999', '외부 업체', 'Asia/Seoul', ?)`,
    ).run(now);
    db.prepare(
      `INSERT INTO users
       (id, tenant_id, username, name, password_hash, role, active, created_at, updated_at)
       SELECT '99999999-9999-4999-8999-999999999999', '999', 'admin',
              '외부 관리자', password_hash, 'ADMIN', 1, ?, ?
       FROM users WHERE id = '11111111-1111-4111-8111-111111111111'`,
    ).run(now, now);
    db.close();
    closeDatabasesForTests();
    clearRateLimitsForTests();
    adminCookie = await login("admin");
    operatorCookie = await login("operator");
    viewerCookie = await login("viewer");
    process.env.DEFAULT_TENANT_ID = "999";
    outsiderCookie = await login("admin");
    process.env.DEFAULT_TENANT_ID = "121";
  });

  afterAll(() => {
    closeDatabasesForTests();
    delete process.env.DATABASE_PATH;
    delete process.env.DEFAULT_TENANT_ID;
    rmSync(directory, { recursive: true, force: true });
  });

  it("blocks unauthenticated and unauthorized mutations", async () => {
    const unauthenticated = await facilitiesGet(request("/api/facilities"));
    expect(unauthenticated.status).toBe(401);
    expect((await json(unauthenticated)).error?.code).toBe("AUTH_REQUIRED");

    const forbidden = await facilitiesPost(
      request("/api/facilities", "POST", viewerCookie, {
        code: "F-NOPE",
        name: "권한 없는 설비",
        processName: "검증 공정",
        groupName: "",
        priority: 1,
        baseTemperature: 25,
        peakControlPercent: 10,
        gatewayId: null,
        nodeNumber: null,
        channelNumber: null,
        controlMode: "AUTO",
        status: "ACTIVE",
      }),
    );
    expect(forbidden.status).toBe(403);
    expect((await json(forbidden)).error?.code).toBe("FORBIDDEN");
  });

  it("binds login to the configured tenant", async () => {
    const response = await sessionGet(
      request("/api/auth/session", "GET", adminCookie),
    );
    expect(response.status).toBe(200);
    expect((await json(response)).data?.tenantId).toBe("121");
  });

  it("rejects a client-supplied tenant override during login", async () => {
    const loginResponse = await tokenPost(
      request("/api/tokens", "POST", undefined, {
        cf: "login",
        id: "admin",
        pw: "demo",
        tenantId: "999",
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    expect(loginResponse.status).toBe(422);
    expect((await json(loginResponse)).error?.code).toBe("VALIDATION_ERROR");
    expect(loginResponse.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("does not expose other tenants in the legacy members payload", async () => {
    const response = await tokenPost(
      request("/api/tokens", "POST", undefined, {
        cf: "login",
        id: "admin",
        pw: "demo",
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    const body = (await response.json()) as {
      fid: string | number;
      members: Array<{ fid: string | number }>;
    };
    expect(body.members.length).toBeGreaterThan(0);
    expect(body.members.every((member) => String(member.fid) === String(body.fid))).toBe(
      true,
    );
  });

  it("creates, lists, and reads a facility", async () => {
    const created = await facilitiesPost(
      request("/api/facilities", "POST", adminCookie, {
        code: "F-API-01",
        name: "API 통합 설비",
        processName: "검증 공정",
        groupName: "A 그룹",
        priority: 8,
        baseTemperature: 32.5,
        peakControlPercent: 45,
        gatewayId: null,
        nodeNumber: null,
        channelNumber: null,
        controlMode: "AUTO",
        status: "ACTIVE",
      }),
    );
    expect(created.status).toBe(201);
    expect(created.headers.get("x-request-id")).toBeTruthy();
    expect(created.headers.get("cache-control")).toBe("private, no-store");
    const createdBody = await json(created);
    expect(createdBody.ok).toBe(true);
    createdId = String(createdBody.data?.id);
    createdVersion = Number(createdBody.data?.version);

    const list = await facilitiesGet(
      request(
        "/api/facilities?q=API%20통합&status=ACTIVE&page=1&limit=10",
        "GET",
        adminCookie,
      ),
    );
    expect(list.status).toBe(200);
    const listBody = await json(list);
    expect(
      (listBody.data?.items as Array<{ id: string }>).map((item) => item.id),
    ).toContain(createdId);

    const detail = await facilityGet(
      request(`/api/facilities/${createdId}`, "GET", adminCookie),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(detail.status).toBe(200);
    expect((await json(detail)).data?.name).toBe("API 통합 설비");

    const otherTenantDetail = await facilityGet(
      request(`/api/facilities/${createdId}`, "GET", outsiderCookie),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(otherTenantDetail.status).toBe(404);
  });

  it("rejects missing fields, duplicate codes, immutable fields, and unknown input", async () => {
    const missing = await facilitiesPost(
      request("/api/facilities", "POST", adminCookie, { name: "필드 누락" }),
    );
    expect(missing.status).toBe(422);

    const duplicate = await facilitiesPost(
      request("/api/facilities", "POST", adminCookie, {
        code: "F-API-01",
        name: "중복 코드 설비",
        processName: "검증 공정",
        groupName: "",
        priority: 1,
        baseTemperature: 25,
        peakControlPercent: 10,
        gatewayId: null,
        nodeNumber: null,
        channelNumber: null,
        controlMode: "AUTO",
        status: "ACTIVE",
      }),
    );
    expect(duplicate.status).toBe(409);
    expect((await json(duplicate)).error?.code).toBe(
      "DUPLICATE_FACILITY_CODE",
    );

    const immutable = await facilityPatch(
      request(`/api/facilities/${createdId}`, "PATCH", adminCookie, {
        code: "F-CHANGED",
        version: createdVersion,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(immutable.status).toBe(422);

    const massAssignment = await facilityPatch(
      request(`/api/facilities/${createdId}`, "PATCH", adminCookie, {
        name: "허용되지 않을 수정",
        tenantId: "999",
        version: createdVersion,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(massAssignment.status).toBe(422);
  });

  it("distinguishes invalid, missing, and reversed-range queries", async () => {
    const invalidId = await facilityGet(
      request("/api/facilities/not-a-uuid", "GET", adminCookie),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );
    expect(invalidId.status).toBe(422);

    const missing = await facilityGet(
      request(
        "/api/facilities/00000000-0000-4000-8000-000000000000",
        "GET",
        adminCookie,
      ),
      {
        params: Promise.resolve({
          id: "00000000-0000-4000-8000-000000000000",
        }),
      },
    );
    expect(missing.status).toBe(404);

    const reversedRange = await facilitiesGet(
      request(
        "/api/facilities?from=2026-08-29T00%3A00%3A00%2B09%3A00&to=2026-08-28T23%3A59%3A59%2B09%3A00",
        "GET",
        adminCookie,
      ),
    );
    expect(reversedRange.status).toBe(422);
  });

  it("updates with optimistic locking and rejects a stale version", async () => {
    const updated = await facilityPatch(
      request(`/api/facilities/${createdId}`, "PATCH", adminCookie, {
        name: "API 수정 설비",
        version: createdVersion,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(updated.status).toBe(200);
    const updatedBody = await json(updated);
    expect(updatedBody.data?.name).toBe("API 수정 설비");
    createdVersion = Number(updatedBody.data?.version);

    const conflict = await facilityPatch(
      request(`/api/facilities/${createdId}`, "PATCH", adminCookie, {
        name: "충돌 수정",
        version: createdVersion - 1,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(conflict.status).toBe(409);
    expect((await json(conflict)).error?.code).toBe("VERSION_CONFLICT");
  });

  it("soft deletes, excludes, exposes to admins, and restores", async () => {
    const staleDelete = await facilityDelete(
      request(`/api/facilities/${createdId}`, "DELETE", adminCookie, {
        version: createdVersion - 1,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(staleDelete.status).toBe(409);

    const deleted = await facilityDelete(
      request(`/api/facilities/${createdId}`, "DELETE", adminCookie, {
        version: createdVersion,
      }),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(deleted.status).toBe(200);
    const deletedVersion = Number((await json(deleted)).data?.version);

    const hidden = await facilityGet(
      request(`/api/facilities/${createdId}`, "GET", adminCookie),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(hidden.status).toBe(404);

    const deletedList = await facilitiesGet(
      request(
        `/api/facilities?deleted=only&q=F-API-01`,
        "GET",
        adminCookie,
      ),
    );
    expect(deletedList.status).toBe(200);
    expect(
      (await json(deletedList)).data?.items as Array<{ id: string }>,
    ).toHaveLength(1);

    const viewerDeletedList = await facilitiesGet(
      request("/api/facilities?deleted=only", "GET", viewerCookie),
    );
    expect(viewerDeletedList.status).toBe(403);

    const staleRestore = await facilityRestore(
      request(
        `/api/facilities/${createdId}/restore`,
        "POST",
        adminCookie,
        { version: deletedVersion - 1 },
      ),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(staleRestore.status).toBe(409);

    const restored = await facilityRestore(
      request(
        `/api/facilities/${createdId}/restore`,
        "POST",
        adminCookie,
        { version: deletedVersion },
      ),
      { params: Promise.resolve({ id: createdId }) },
    );
    expect(restored.status).toBe(200);
    expect((await json(restored)).data?.deletedAt).toBeNull();
  });

  it("rejects cross-site mutation requests", async () => {
    const response = await facilitiesPost(
      new NextRequest(`${origin}/api/facilities`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminCookie}`,
          "content-type": "application/json",
          origin: "https://attacker.example",
        },
        body: JSON.stringify({
          code: "F-CSRF",
          name: "위조 요청 설비",
          processName: "검증 공정",
          priority: 1,
          baseTemperature: 1,
          peakControlPercent: 1,
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect((await json(response)).error?.code).toBe("CSRF_REJECTED");
  });

  it("rejects unsupported and oversized facility request bodies", async () => {
    const unsupported = await facilitiesPost(
      new NextRequest(`${origin}/api/facilities`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminCookie}`,
          "content-type": "text/plain",
          origin,
        },
        body: "{}",
      }),
    );
    expect(unsupported.status).toBe(415);
    expect((await json(unsupported)).error?.code).toBe(
      "UNSUPPORTED_MEDIA_TYPE",
    );

    const oversized = await facilitiesPost(
      new NextRequest(`${origin}/api/facilities`, {
        method: "POST",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminCookie}`,
          "content-type": "application/json",
          "content-length": String(65 * 1024),
          origin,
        },
        body: "{}",
      }),
    );
    expect(oversized.status).toBe(413);
    expect((await json(oversized)).error?.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("requires admin, current code, and current version for purge", async () => {
    const createdResponse = await facilitiesPost(
      request("/api/facilities", "POST", adminCookie, {
        code: "F-PURGE-API",
        name: "영구 삭제 검증",
        processName: "검증 공정",
        groupName: "",
        priority: 1,
        baseTemperature: 25,
        peakControlPercent: 10,
        gatewayId: null,
        nodeNumber: null,
        channelNumber: null,
        controlMode: "AUTO",
        status: "ACTIVE",
      }),
    );
    const created = (await json(createdResponse)).data as {
      id: string;
      code: string;
      version: number;
    };
    const deleteResponse = await facilityDelete(
      request(`/api/facilities/${created.id}`, "DELETE", adminCookie, {
        version: created.version,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    const deleted = (await json(deleteResponse)).data as {
      id: string;
      code: string;
      version: number;
    };

    const operatorResponse = await facilityPurge(
      request(`/api/facilities/${created.id}/purge`, "DELETE", operatorCookie, {
        code: deleted.code,
        version: deleted.version,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(operatorResponse.status).toBe(403);

    const wrongConfirmation = await facilityPurge(
      new NextRequest(`${origin}/api/facilities/${created.id}/purge`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminCookie}`,
          "content-type": "application/json",
          origin,
          "x-confirm-purge": "WRONG",
        },
        body: JSON.stringify({
          code: deleted.code,
          version: deleted.version,
        }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(wrongConfirmation.status).toBe(400);

    const purgeResponse = await facilityPurge(
      new NextRequest(`${origin}/api/facilities/${created.id}/purge`, {
        method: "DELETE",
        headers: {
          cookie: `${SESSION_COOKIE}=${adminCookie}`,
          "content-type": "application/json",
          origin,
          "x-confirm-purge": deleted.code,
        },
        body: JSON.stringify({
          code: deleted.code,
          version: deleted.version,
        }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(purgeResponse.status).toBe(200);
  });

  it("does not let whitespace reset the account login limit", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await tokenPost(
        request("/api/tokens", "POST", undefined, {
          cf: "login",
          id: "missing-account",
          pw: "wrong",
        }),
        { params: Promise.resolve({ path: ["tokens"] }) },
      );
      expect(response.status).toBe(attempt < 10 ? 401 : 429);
    }
    const bypass = await tokenPost(
      request("/api/tokens", "POST", undefined, {
        cf: "login",
        id: "  missing-account  ",
        pw: "wrong",
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    expect(bypass.status).toBe(429);
  });

  it("does not apply a global direct-client login bucket", async () => {
    for (let attempt = 0; attempt < 35; attempt += 1) {
      const response = await tokenPost(
        request("/api/tokens", "POST", undefined, {
          cf: "login",
          id: `unknown-${attempt}`,
          pw: "wrong",
        }),
        { params: Promise.resolve({ path: ["tokens"] }) },
      );
      expect(response.status).toBe(401);
    }
    const validLogin = await tokenPost(
      request("/api/tokens", "POST", undefined, {
        cf: "login",
        id: "operator",
        pw: "demo",
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    expect(validLogin.status).toBe(200);
  });

  it("returns 404 for misspelled protected API routes", async () => {
    const response = await tokenPost(
      request(
        "/api/facilites/00000000-0000-4000-8000-000000000000/purge",
        "DELETE",
        adminCookie,
      ),
      {
        params: Promise.resolve({
          path: [
            "facilites",
            "00000000-0000-4000-8000-000000000000",
            "purge",
          ],
        }),
      },
    );
    expect(response.status).toBe(404);
    expect((await json(response)).error?.code).toBe("API_NOT_FOUND");

    const tokenTypo = await tokenPost(
      request("/api/tokenss", "GET", adminCookie),
      { params: Promise.resolve({ path: ["tokenss"] }) },
    );
    expect(tokenTypo.status).toBe(404);
  });

  it("records logout only once for the same session", async () => {
    const cookie = await login("viewer");
    const first = await logoutPost(
      request("/api/auth/logout", "POST", cookie, {}),
    );
    const second = await logoutPost(
      request("/api/auth/logout", "POST", cookie, {}),
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const count = getDb()
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_logs
         WHERE action = 'LOGOUT'
           AND actor_id = '33333333-3333-4333-8333-333333333333'`,
      )
      .get() as { count: number };
    expect(count.count).toBe(1);
  });
});
