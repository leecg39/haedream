import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { AppError } from "@/lib/errors";
import {
  createFacility,
  deleteFacility,
  findFacility,
  listFacilities,
  listProcesses,
  purgeFacility,
  restoreFacility,
  updateFacility,
} from "@/features/facilities/repository";
import { facilityListQuerySchema } from "@/features/facilities/schema";
import type { SessionUser } from "@/features/facilities/types";

const admin: SessionUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "121",
  username: "admin",
  name: "시스템 관리자",
  role: "ADMIN",
};

const input = {
  code: "F-TEST-01",
  name: "테스트 설비",
  processName: "검증 공정",
  groupName: "검증 그룹",
  priority: 20,
  baseTemperature: 25,
  peakControlPercent: 30,
  gatewayId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  nodeNumber: 5,
  channelNumber: 2,
  controlMode: "AUTO" as const,
  status: "ACTIVE" as const,
};

describe("facility repository integration", () => {
  let directory: string;
  let db: AppDatabase;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-repo-"));
    db = openDatabase(path.join(directory, "test.db"));
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("lists with pagination, search, filtering, and tenant isolation", () => {
    const firstPage = listFacilities(
      admin,
      facilityListQuerySchema.parse({ page: 1, limit: 2 }),
      db,
    );
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.meta).toMatchObject({ total: 5, totalPages: 3 });

    const search = listFacilities(
      admin,
      facilityListQuerySchema.parse({
        q: "다이캐스팅",
        status: "ACTIVE",
        page: 1,
        limit: 10,
      }),
      db,
    );
    expect(search.items).toHaveLength(3);

    const otherTenant = listFacilities(
      { ...admin, tenantId: "unrelated" },
      facilityListQuerySchema.parse({ page: 1, limit: 10 }),
      db,
    );
    expect(otherTenant.items).toHaveLength(0);
  });

  it("creates normalized data and rejects duplicate facility codes", () => {
    const created = createFacility(
      admin,
      { ...input, code: " f-test-01 " },
      "request-create",
      db,
    );
    expect(created.code).toBe("F-TEST-01");
    expect(created.gatewayName).toBe("주조동 게이트웨이");

    expect(() =>
      createFacility(
        admin,
        {
          ...input,
          name: "다른 설비",
          gatewayId: null,
          nodeNumber: null,
          channelNumber: null,
        },
        "request-duplicate",
        db,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_FACILITY_CODE" }),
    );
  });

  it("prevents two active facilities from sharing a gateway endpoint", () => {
    createFacility(admin, input, "request-create", db);
    expect(() =>
      createFacility(
        admin,
        { ...input, code: "F-TEST-02", name: "중복 연결 설비" },
        "request-duplicate-endpoint",
        db,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_GATEWAY_ENDPOINT" }),
    );
  });

  it("detects stale updates and records before/after audit values", () => {
    const created = createFacility(admin, input, "request-create", db);
    const updated = updateFacility(
      admin,
      created.id,
      { name: "변경된 설비", version: created.version },
      "request-update",
      db,
    );
    expect(updated.name).toBe("변경된 설비");
    expect(updated.version).toBe(created.version + 1);

    expect(() =>
      updateFacility(
        admin,
        created.id,
        { name: "충돌 수정", version: created.version },
        "request-conflict",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "VERSION_CONFLICT" }));

    const audit = db
      .prepare(
        `SELECT before_json, after_json FROM audit_logs
         WHERE entity_id = ? AND action = 'UPDATE'`,
      )
      .get(created.id) as { before_json: string; after_json: string };
    expect(JSON.parse(audit.before_json).name).toBe("테스트 설비");
    expect(JSON.parse(audit.after_json).name).toBe("변경된 설비");
  });

  it("soft deletes idempotently, restores, then purges only deleted data", () => {
    const created = createFacility(admin, input, "request-create", db);
    expect(() =>
      deleteFacility(
        admin,
        created.id,
        created.version + 1,
        "request-stale-delete",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "VERSION_CONFLICT" }));
    const deleted = deleteFacility(
      admin,
      created.id,
      created.version,
      "request-delete",
      db,
    );
    const deletedAgain = deleteFacility(
      admin,
      created.id,
      deleted.version,
      "request-delete-again",
      db,
    );
    expect(deleted.deletedAt).not.toBeNull();
    expect(deletedAgain.version).toBe(deleted.version);
    expect(() => findFacility(admin, created.id, false, db)).toThrow(AppError);

    expect(() =>
      restoreFacility(
        admin,
        created.id,
        deleted.version + 1,
        "request-stale-restore",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "VERSION_CONFLICT" }));
    const restored = restoreFacility(
      admin,
      created.id,
      deleted.version,
      "request-restore",
      db,
    );
    expect(restored.deletedAt).toBeNull();
    expect(() =>
      purgeFacility(
        admin,
        created.id,
        { code: created.code, version: restored.version },
        "request-invalid-purge",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "PURGE_REQUIRES_DELETE" }));

    const deletedForPurge = deleteFacility(
      admin,
      created.id,
      restored.version,
      "request-delete-2",
      db,
    );
    purgeFacility(
      admin,
      created.id,
      { code: deletedForPurge.code, version: deletedForPurge.version },
      "request-purge",
      db,
    );
    expect(() => findFacility(admin, created.id, true, db)).toThrowError(
      expect.objectContaining({ code: "FACILITY_NOT_FOUND" }),
    );
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS count FROM audit_logs
           WHERE entity_id = ? AND action = 'PURGE'`,
        )
        .get(created.id),
    ).toEqual({ count: 1 });
  });

  it("rejects a gateway from another tenant or inactive gateway", () => {
    const inactiveGateway = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO gateways
       (id, tenant_id, code, name, status, created_at, updated_at)
       VALUES (?, ?, 'GATE-OFF', '비활성 게이트웨이', 'INACTIVE', ?, ?)`,
    ).run(inactiveGateway, admin.tenantId, now, now);
    expect(() =>
      createFacility(
        admin,
        { ...input, gatewayId: inactiveGateway },
        "request-invalid-gateway",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_GATEWAY" }));
  });

  it("prevents disabling a gateway that still has active facilities", () => {
    expect(() =>
      db.prepare("UPDATE gateways SET status = 'INACTIVE' WHERE id = ?").run(
        input.gatewayId,
      ),
    ).toThrow(/active facilities/);
  });

  it("does not expose a process that exists only on deleted data", () => {
    const created = createFacility(
      admin,
      { ...input, processName: "삭제 전용 공정" },
      "request-create",
      db,
    );
    deleteFacility(
      admin,
      created.id,
      created.version,
      "request-delete",
      db,
    );
    expect(listProcesses(admin, db).map((item) => item.processName)).not.toContain(
      "삭제 전용 공정",
    );
  });

  it("blocks restore when its gateway became inactive", () => {
    const gatewayId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO gateways
       (id, tenant_id, code, name, status, created_at, updated_at)
       VALUES (?, ?, 'GATE-RESTORE', '복구 검증 게이트웨이', 'ACTIVE', ?, ?)`,
    ).run(gatewayId, admin.tenantId, now, now);
    const created = createFacility(
      admin,
      { ...input, gatewayId },
      "request-create",
      db,
    );
    const deleted = deleteFacility(
      admin,
      created.id,
      created.version,
      "request-delete",
      db,
    );
    db.prepare("UPDATE gateways SET status = 'INACTIVE' WHERE id = ?").run(
      gatewayId,
    );
    expect(() =>
      restoreFacility(
        admin,
        created.id,
        deleted.version,
        "request-restore",
        db,
      ),
    ).toThrowError(expect.objectContaining({ code: "INVALID_GATEWAY" }));
  });

  it("enforces immutable identity, version increments, and append-only audits", () => {
    const created = createFacility(admin, input, "request-create", db);

    expect(() =>
      db.prepare(
        `UPDATE facilities
         SET code = 'F-CHANGED', version = version + 1
         WHERE id = ?`,
      ).run(created.id),
    ).toThrow(/immutable/);
    expect(() =>
      db.prepare("UPDATE facilities SET name = name WHERE id = ?").run(created.id),
    ).toThrow(/version must increment/);
    expect(() =>
      db.prepare(
        `UPDATE audit_logs SET request_id = 'tampered'
         WHERE entity_id = ?`,
      ).run(created.id),
    ).toThrow(/append only/);
  });

  it("enforces actor tenant consistency at the database boundary", () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO tenants (id, name, timezone, created_at)
       VALUES ('other', '다른 업체', 'Asia/Seoul', ?)`,
    ).run(now);
    db.prepare(
      `INSERT INTO users
       (id, tenant_id, username, name, password_hash, role, active, created_at, updated_at)
       SELECT '44444444-4444-4444-8444-444444444444', 'other', 'other-admin',
              '다른 관리자', password_hash, 'ADMIN', 1, ?, ?
       FROM users WHERE id = ?`,
    ).run(now, now, admin.id);

    expect(() =>
      db.prepare(
        `INSERT INTO facilities
         (id, tenant_id, code, name, process_name, group_name, priority,
          base_temperature, peak_control_percent, control_mode, status,
          version, created_at, created_by, updated_at, updated_by)
         VALUES (?, '121', 'F-CROSS', '교차 테넌트 설비', '검증 공정', '',
                 1, 25, 10, 'AUTO', 'ACTIVE', 1, ?, ?, ?, ?)`,
      ).run(
        "55555555-5555-4555-8555-555555555555",
        now,
        "44444444-4444-4444-8444-444444444444",
        now,
        admin.id,
      ),
    ).toThrow(/tenant mismatch/);
  });
});
