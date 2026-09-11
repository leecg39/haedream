import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { NextRequest } from "next/server";
import { getDb, closeDatabasesForTests } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { loginUser, SESSION_COOKIE } from "@/lib/auth";
import { importFirmCsv, parseFirmCsv } from "@/features/firms/csv-import.server";
import { listFirmsForUser, findFirmForUser, updateFirmForUser, createFirmForUser } from "@/features/firms/repository";
import { enqueueSingleCollectJob, getCollectionJobForUser, processQueuedJobs } from "@/features/kepco/jobs.repository";
import { decryptFirmPassword } from "@/lib/firm-secrets.server";
import { getKepcoPassword } from "@/lib/kepco/credentials.server";
import { GET as firmGET, PATCH as firmPATCH } from "@/app/api/firm/[fid]/route";
import { GET as energyGET } from "@/app/api/energy/[fid]/route";
import { GET as catchAllGET } from "@/app/api/[...path]/route";
import type { SessionUser } from "@/features/facilities/types";

const header = ["fid", "firmName", "bone", "kepcoNo", "kepcoPasswd", "contract", "kepcoContract", "manager", "boss", "phone", "addressText", "mapGeo", "degreeCity", "serviceType", "isDisable", "memo", "eoiTime", "pct_ratio", "peakLast", "powerLimit", "peakRunMode", "peakControlMode", "pulse_num", "contractLimit", "ableLimit", "ableLimitTime", "checkDay", "kepcoCyber", "frugalTime", "investGold"];
const source = { fid: "77", firmName: '합성 시험 "업체", A', kepcoNo: "001234567890", kepcoPasswd: "synthetic-test-password", phone: "010-0000-0000", memo: "첫 줄\n둘째 줄", mapGeo: "POINT(127.123456789123456 37.123456789123456)", contractLimit: "150", ableLimitTime: "1704034800" };
function csv(rows: Record<string, string>[] = [source]) {
  const quoted = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return "\uFEFF" + [header.map(quoted).join(","), ...rows.map((row) => header.map((key) => quoted(row[key] ?? "")).join(","))].join("\r\n");
}
const admin: SessionUser = { id: "11111111-1111-4111-8111-111111111111", tenantId: "121", username: "admin", name: "시험 관리자", role: "ADMIN" };
const context = { params: Promise.resolve({ fid: "77" }) };
const origin = "http://localhost";
function request(url: string, cookie: string, method = "GET", body?: unknown) {
  return new NextRequest(`${origin}${url}`, { method, headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

describe("private CSV firms", () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "private-firm-test-"));
    process.env.DATABASE_PATH = path.join(directory, "test.db");
    process.env.FIRM_CREDENTIAL_KEY_PATH = path.join(directory, "test.key");
    process.env.RATE_LIMIT_DISABLED = "true";
    seedDatabase(getDb());
  });
  afterEach(() => {
    closeDatabasesForTests();
    rmSync(directory, { recursive: true, force: true });
    delete process.env.FIRM_CREDENTIAL_KEY_PATH;
    delete process.env.RATE_LIMIT_DISABLED;
  });
  const runImport = (text = csv(), apply = true, actorId = admin.id) => importFirmCsv({ db: getDb(), text, tenantId: admin.tenantId, actorId, apply });

  it("imports private real-shaped records, preserves identifiers, encrypts secrets, and retains later edits on rerun/reopen", () => {
    expect(runImport(csv(), false)).toMatchObject({ applied: false, rows: 1, created: 1 });
    expect(existsSync(process.env.FIRM_CREDENTIAL_KEY_PATH!)).toBe(false);
    expect(runImport()).toMatchObject({ applied: true, rows: 1, credentialCount: 1, adminOnly: true });
    const firm = findFirmForUser(admin, 77);
    expect(firm).toMatchObject({ firmName: source.firmName, kepcoNo: source.kepcoNo, memo: source.memo, ableLimitTime: "2024-01-01", dataSource: "PRIVATE_CSV" });
    expect(JSON.stringify(firm)).not.toContain(source.kepcoPasswd);
    const encrypted = getDb().prepare("SELECT encrypted_password FROM firm_credentials WHERE fid = 77").get() as { encrypted_password: string };
    expect(encrypted.encrypted_password).not.toContain(source.kepcoPasswd);
    expect(getKepcoPassword(77)).toBe(source.kepcoPasswd);
    expect(() => decryptFirmPassword(78, encrypted.encrypted_password)).toThrow();
    updateFirmForUser(admin, 77, { version: firm.version, phone: "010-1111-1111" }, "test-edit");
    expect(runImport()).toMatchObject({ alreadyImported: true, applied: false });
    closeDatabasesForTests();
    expect(findFirmForUser(admin, 77).phone).toBe("010-1111-1111");
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firm_import_runs").get()).toEqual({ n: 1 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE entity_type='FIRM_IMPORT'").get()).toEqual({ n: 1 });
  });

  it("blocks operator/viewer direct read/write, linked energy/KEPCO/job routes, and cross-tenant admins", async () => {
    runImport();
    getDb().prepare("UPDATE tenant_firm_access SET can_collect = 1 WHERE fid = 77").run();
    const job = enqueueSingleCollectJob(admin, 77, "test-only-no-worker");
    const before = findFirmForUser(admin, 77);
    for (const username of ["operator", "viewer"]) {
      const session = await loginUser("121", username, "demo", "private-test-login", null);
      expect(listFirmsForUser(session.user).some((firm) => firm.fid === 77)).toBe(false);
      expect(() => findFirmForUser(session.user, 77)).toThrow();
      expect(() => getCollectionJobForUser(session.user, job.id)).toThrow();
      expect(() => enqueueSingleCollectJob(session.user, 77, "denied")).toThrow();
      expect((await firmGET(request("/api/firm/77", session.token), context)).status).toBe(403);
      expect((await firmPATCH(request("/api/firm/77", session.token, "PATCH", {}), context)).status).toBe(403);
      expect((await energyGET(request("/api/energy/77", session.token), context)).status).toBe(403);
      for (const route of ["kepco/firm/77", `kepco/jobs/${job.id}`]) {
        expect((await catchAllGET(request(`/api/${route}`, session.token), { params: Promise.resolve({ path: route.split("/") }) })).status).toBe(403);
      }
      const status = await catchAllGET(request("/api/kepco/status", session.token), { params: Promise.resolve({ path: ["kepco", "status"] }) });
      expect(JSON.stringify(await status.json())).not.toContain(source.kepcoNo);
    }
    expect(findFirmForUser(admin, 77)).toEqual(before);
    expect(() => findFirmForUser({ ...admin, tenantId: "another-org" }, 77)).toThrow();
    const session = await loginUser("121", "admin", "demo", "private-test-admin", null);
    const detail = await firmGET(request("/api/firm/77", session.token), context);
    expect(detail.status).toBe(200);
    const updated = await firmPATCH(request("/api/firm/77", session.token, "PATCH", { version: before.version, memo: "합성 검증 수정" }), context);
    expect(updated.status).toBe(200);
    expect((await firmPATCH(request("/api/firm/77", session.token, "PATCH", { version: before.version, memo: "경합 수정" }), context)).status).toBe(409);
    expect((await firmGET(new NextRequest(`${origin}/api/firm/77`), context)).status).toBe(401);
  });

  it("rejects bad/duplicate rows and non-admin import without partial writes", () => {
    expect(() => runImport(csv([source, { ...source, fid: "78", firmName: "x".repeat(100) }]))).toThrow(/firmName/);
    expect(() => runImport(csv([source, source]))).toThrow(/중복/);
    expect(() => parseFirmCsv(csv() + '"unterminated')).toThrow();
    const operator = getDb().prepare("SELECT id FROM users WHERE username = 'operator'").get() as { id: string };
    expect(() => runImport(csv(), true, operator.id)).toThrow(/ADMIN/);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firms WHERE fid IN (77,78)").get()).toEqual({ n: 0 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firm_import_runs").get()).toEqual({ n: 0 });
  });

  it("runs an admin-only collection using the requesting admin's actual role", async () => {
    runImport();
    const db = getDb();
    db.prepare("UPDATE tenant_firm_access SET can_collect = 1 WHERE fid = 77").run();
    const job = enqueueSingleCollectJob(admin, 77, "admin-worker", db);
    let called = false;
    await processQueuedJobs(1, db, async (firm) => {
      called = true;
      expect(firm.kepcoPasswd).toBe(source.kepcoPasswd);
      return { fid: firm.fid, status: "success", message: "synthetic", startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() };
    });
    expect(called).toBe(true);
    expect(getCollectionJobForUser(admin, job.id, db)?.status).toBe("SUCCEEDED");
  });

  it.each([
    "UPDATE users SET active = 0 WHERE username = 'admin'",
    "UPDATE users SET role = 'VIEWER' WHERE username = 'admin'",
    "UPDATE users SET role = 'OPERATOR' WHERE username = 'admin'",
    "UPDATE tenant_firm_access SET can_collect = 0 WHERE fid = 77",
  ])("refuses queued collection after authorization changes: %s", async (change) => {
    runImport();
    const db = getDb();
    // 계정/역할 회수는 일반 업체에서도 외부 호출을 막아야 한다.
    if (change.includes("active = 0") || change.includes("'VIEWER'")) {
      db.prepare("UPDATE firms SET admin_only = 0 WHERE fid = 77").run();
    }
    db.prepare("UPDATE tenant_firm_access SET can_collect = 1 WHERE fid = 77").run();
    const job = enqueueSingleCollectJob(admin, 77, "revoked-worker", db);
    db.exec(change);
    let called = false;
    await processQueuedJobs(1, db, async () => {
      called = true;
      throw new Error("must not collect");
    });
    expect(called).toBe(false);
    expect(db.prepare("SELECT status, attempt_count FROM collection_jobs WHERE id = ?").get(job.id))
      .toEqual({ status: "FAILED", attempt_count: 1 });
  });

  it("rolls back firms, credentials, grants and import history on a database failure", () => {
    getDb().exec("CREATE TRIGGER fail_import BEFORE INSERT ON firms WHEN NEW.fid = 78 BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END");
    expect(() => runImport(csv([source, { ...source, fid: "78" }]))).toThrow();
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firms WHERE fid IN (77,78)").get()).toEqual({ n: 0 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firm_credentials").get()).toEqual({ n: 0 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM tenant_firm_access WHERE fid IN (77,78)").get()).toEqual({ n: 0 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firm_import_runs").get()).toEqual({ n: 0 });
  });

  it("also keeps firms newly registered by admin private", async () => {
    const firm = createFirmForUser(admin, { firmName: "관리자 전용 합성 업체" }, "private-create");
    const operator = await loginUser("121", "operator", "demo", "create-test-login", null);
    expect(() => findFirmForUser(operator.user, firm.fid)).toThrow();
    expect(findFirmForUser(admin, firm.fid).firmName).toBe("관리자 전용 합성 업체");
  });

  it("the old no-argument command fails instead of exporting private data into the fixture", () => {
    const fixture = path.join(process.cwd(), "src/lib/fit-mocks/firm-rows.json");
    const before = readFileSync(fixture);
    const result = spawnSync(process.execPath, ["scripts/import-firm-csv.mjs"], { cwd: process.cwd(), encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(readFileSync(fixture).equals(before)).toBe(true);
    expect(result.stdout + result.stderr).not.toContain(source.kepcoPasswd);
  });

  it("refuses a missing or replaced key before importing another CSV and preserves the existing secrets", () => {
    runImport();
    const keyPath = process.env.FIRM_CREDENTIAL_KEY_PATH!;
    const originalKey = readFileSync(keyPath);
    const original = findFirmForUser(admin, 77);
    const second = csv([{ ...source, fid: "78" }]);
    rmSync(keyPath);
    expect(() => runImport(second)).toThrow(/기존 DB와 일치하는 키/);
    expect(existsSync(keyPath)).toBe(false);
    writeFileSync(keyPath, Buffer.alloc(32), { mode: 0o600 });
    expect(() => runImport(second)).toThrow(/기존 DB와 일치하는 키/);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firm_import_runs").get()).toEqual({ n: 1 });
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM firms WHERE fid = 78").get()).toEqual({ n: 0 });
    expect(findFirmForUser(admin, 77)).toEqual(original);
    writeFileSync(keyPath, originalKey);
    expect(runImport(second)).toMatchObject({ applied: true, rows: 1 });
    expect(getKepcoPassword(77)).toBe(source.kepcoPasswd);
    expect(getKepcoPassword(78)).toBe(source.kepcoPasswd);
  });
});
