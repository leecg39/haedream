import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  createFirmForUser,
  findFirm,
  updateFirmForUser,
} from "@/features/firms/repository";
import type { SessionUser } from "@/features/facilities/types";
import { seedDatabase } from "@/lib/seed";

describe("firm integrity CRUD", () => {
  let directory: string;
  let db: AppDatabase;
  let operator: SessionUser;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-firm-crud-"));
    db = openDatabase(path.join(directory, "test.db"));
    seedDatabase(db);
    const row = db
      .prepare(
        `SELECT id, tenant_id AS tenantId, username, name, role
         FROM users WHERE username = 'operator' LIMIT 1`,
      )
      .get() as SessionUser;
    operator = row;
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("생성 시 tenant_firm_access·version·감사 로그를 같은 트랜잭션으로 남긴다", () => {
    const created = createFirmForUser(
      operator,
      { firmName: "무결성 신규" },
      "req-create",
      db,
    );
    expect(created.version).toBe(1);
    expect(created.createdBy).toBe(operator.id);
    expect(created.updatedBy).toBe(operator.id);

    const access = db
      .prepare(
        `SELECT tenant_id, fid FROM tenant_firm_access
         WHERE tenant_id = ? AND fid = ?`,
      )
      .get(operator.tenantId, created.fid) as { tenant_id: string; fid: number };
    expect(access).toEqual({ tenant_id: operator.tenantId, fid: created.fid });
    const flags = db
      .prepare(
        `SELECT can_view_pii, can_collect FROM tenant_firm_access
         WHERE tenant_id = ? AND fid = ?`,
      )
      .get(operator.tenantId, created.fid) as {
      can_view_pii: number;
      can_collect: number;
    };
    expect(flags).toEqual({ can_view_pii: 0, can_collect: 0 });

    const audit = db
      .prepare(
        `SELECT action, before_json, after_json FROM audit_logs
         WHERE entity_type = 'FIRM' AND entity_id = ?`,
      )
      .get(String(created.fid)) as {
      action: string;
      before_json: string | null;
      after_json: string;
    };
    expect(audit.action).toBe("CREATE");
    expect(audit.before_json).toBeNull();
    expect(audit.after_json).toContain("무결성 신규");
    expect(audit.after_json).not.toContain("kepcoPasswd");
    expect(audit.after_json).not.toContain("phone");
  });

  it("수정은 version 충돌 시 409 이며 거부된 요청은 DB를 바꾸지 않는다", () => {
    const created = createFirmForUser(
      operator,
      { firmName: "충돌 대상", powerLimit: 10 },
      "req-create",
      db,
    );

    const updated = updateFirmForUser(
      operator,
      created.fid,
      { version: created.version, firmName: "충돌 1차", powerLimit: 20 },
      "req-update-1",
      db,
    );
    expect(updated.version).toBe(2);
    expect(updated.firmName).toBe("충돌 1차");
    expect(updated.powerLimit).toBe(20);

    expect(() =>
      updateFirmForUser(
        operator,
        created.fid,
        { version: 1, firmName: "오래된 저장" },
        "req-stale",
        db,
      ),
    ).toThrow(AppError);

    const current = findFirm(created.fid, db);
    expect(current?.firmName).toBe("충돌 1차");
    expect(current?.version).toBe(2);

    const audits = db
      .prepare(
        `SELECT action FROM audit_logs
         WHERE entity_type = 'FIRM' AND entity_id = ?
         ORDER BY created_at`,
      )
      .all(String(created.fid)) as Array<{ action: string }>;
    expect(audits.map((row) => row.action)).toEqual(["CREATE", "UPDATE"]);
  });

  it("스키마에 없는 비밀번호 키는 수정 전에 거부한다", () => {
    const created = createFirmForUser(
      operator,
      { firmName: "비밀 거부" },
      "req-create",
      db,
    );
    expect(() =>
      updateFirmForUser(
        operator,
        created.fid,
        {
          version: created.version,
          firmName: "비밀 거부",
          kepcoPasswd: "leak",
        } as never,
        "req-bad",
        db,
      ),
    ).toThrow();
    expect(findFirm(created.fid, db)?.firmName).toBe("비밀 거부");
  });

  it("PII 미허가 수정은 마스킹 값으로 고객정보를 덮어쓰지 않는다", () => {
    const created = createFirmForUser(
      operator,
      {
        firmName: "PII 보호",
        manager: "실담당",
        phone: "01099998888",
        addressText: "실주소",
        kepcoNo: "1234567890",
      },
      "req-create",
      db,
    );
    const flags = db
      .prepare(
        `SELECT can_view_pii, can_collect FROM tenant_firm_access
         WHERE tenant_id = ? AND fid = ?`,
      )
      .get(operator.tenantId, created.fid) as {
      can_view_pii: number;
      can_collect: number;
    };
    // PII 를 명시한 생성은 can_view_pii=1 로 명시 허용된다.
    expect(flags).toEqual({ can_view_pii: 1, can_collect: 0 });

    db.prepare(
      `UPDATE tenant_firm_access SET can_view_pii = 0
       WHERE tenant_id = ? AND fid = ?`,
    ).run(operator.tenantId, created.fid);
    // 생성 직후 매핑 PII 를 끄고, 마스킹 폼이 보내는 값으로 덮어쓰지 않는지 확인한다.
    const updated = updateFirmForUser(
      operator,
      created.fid,
      {
        version: created.version,
        firmName: "PII 보호 이름만",
        manager: "",
        phone: "",
        addressText: "",
        kepcoNo: "******7890",
      },
      "req-no-pii",
      db,
    );
    expect(updated.firmName).toBe("PII 보호 이름만");
    const raw = findFirm(created.fid, db);
    expect(raw).toMatchObject({
      manager: "실담당",
      phone: "01099998888",
      addressText: "실주소",
      kepcoNo: "1234567890",
    });
  });

  it("PII 역할 없는 생성자가 비어 있지 않은 PII 를 넣으면 거부한다", () => {
    const viewer = db
      .prepare(
        `SELECT id, tenant_id AS tenantId, username, name, role
         FROM users WHERE username = 'viewer' LIMIT 1`,
      )
      .get() as SessionUser | undefined;
    if (!viewer) {
      // 시드에 viewer 가 없으면 operator 역할만 있는 환경 — create 권한 자체를 제거한 사용자로 대체
      const noCreate = { ...operator, role: "VIEWER" as const };
      expect(() =>
        createFirmForUser(
          noCreate,
          { firmName: "거부", phone: "01011112222" },
          "req-viewer",
          db,
        ),
      ).toThrow(AppError);
      return;
    }
    expect(() =>
      createFirmForUser(
        viewer,
        { firmName: "거부", phone: "01011112222" },
        "req-viewer",
        db,
      ),
    ).toThrow(AppError);
    expect(
      (
        db
          .prepare(`SELECT COUNT(*) AS c FROM firms WHERE firm_name = '거부'`)
          .get() as { c: number }
      ).c,
    ).toBe(0);
  });
});
