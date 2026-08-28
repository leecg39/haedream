import { hashSync } from "bcryptjs";
import type { AppDatabase } from "@/lib/db";

const TENANT_ID = "121";
const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const OPERATOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const GATEWAY_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const GATEWAY_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export const DEMO_CREDENTIALS = {
  admin: { username: "admin", password: "demo", role: "ADMIN" },
  operator: { username: "operator", password: "demo", role: "OPERATOR" },
  viewer: { username: "viewer", password: "demo", role: "VIEWER" },
} as const;

export function seedDatabase(db: AppDatabase) {
  const now = new Date().toISOString();
  const passwordHash = hashSync("demo", 10);

  db.transaction(() => {
    db.prepare(
      `INSERT OR IGNORE INTO tenants (id, name, timezone, created_at)
       VALUES (?, ?, 'Asia/Seoul', ?)`,
    ).run(TENANT_ID, "대산금속", now);

    const insertUser = db.prepare(
      `INSERT OR IGNORE INTO users
       (id, tenant_id, username, name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    insertUser.run(
      ADMIN_ID,
      TENANT_ID,
      "admin",
      "시스템 관리자",
      passwordHash,
      "ADMIN",
      now,
      now,
    );
    insertUser.run(
      OPERATOR_ID,
      TENANT_ID,
      "operator",
      "설비 운영자",
      passwordHash,
      "OPERATOR",
      now,
      now,
    );
    insertUser.run(
      VIEWER_ID,
      TENANT_ID,
      "viewer",
      "조회 담당자",
      passwordHash,
      "VIEWER",
      now,
      now,
    );

    const insertGateway = db.prepare(
      `INSERT OR IGNORE INTO gateways
       (id, tenant_id, code, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
    );
    insertGateway.run(
      GATEWAY_A_ID,
      TENANT_ID,
      "GATE-01",
      "주조동 게이트웨이",
      now,
      now,
    );
    insertGateway.run(
      GATEWAY_B_ID,
      TENANT_ID,
      "GATE-02",
      "가공동 게이트웨이",
      now,
      now,
    );

    const insertFacility = db.prepare(
      `INSERT OR IGNORE INTO facilities
       (id, tenant_id, code, name, process_name, group_name, priority,
        base_temperature, peak_control_percent, gateway_id, node_number,
        channel_number, control_mode, status, version, created_at, created_by,
        updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    );

    const facilities = [
      ["F-DC-01", "다이캐스팅1A", "다이캐스팅", "다이캐스팅 1", 1, 660, 40, GATEWAY_A_ID, 1, 1, "AUTO", "ACTIVE"],
      ["F-DC-02", "다이캐스팅1B", "다이캐스팅", "다이캐스팅 1", 2, 660, 40, GATEWAY_A_ID, 2, 1, "AUTO", "ACTIVE"],
      ["F-DC-03", "다이캐스팅2A", "다이캐스팅", "다이캐스팅 2", 3, 640, 45, GATEWAY_A_ID, 3, 1, "AUTO", "ACTIVE"],
      ["F-CNC-01", "가공1라인", "가공", "가공 라인", 10, 25, 30, GATEWAY_B_ID, 1, 1, "MANUAL", "ACTIVE"],
      ["F-CNC-02", "가공2라인", "가공", "가공 라인", 11, 25, 30, GATEWAY_B_ID, 2, 1, "MANUAL", "INACTIVE"],
    ] as const;

    facilities.forEach((facility, index) => {
      insertFacility.run(
        `f000000${index + 1}-0000-4000-8000-00000000000${index + 1}`,
        TENANT_ID,
        ...facility,
        now,
        ADMIN_ID,
        now,
        ADMIN_ID,
      );
    });
  })();
}
