import { hashSync } from "bcryptjs";
import { migrate, resolveDatabasePath } from "./migrate.mjs";

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error(
    "Demo seeding is opt-in. Set ALLOW_DEMO_SEED=true only for an isolated development or demo database.",
  );
}

const db = migrate();
const now = new Date().toISOString();
const tenantId = "121";
const adminId = "11111111-1111-4111-8111-111111111111";
const operatorId = "22222222-2222-4222-8222-222222222222";
const viewerId = "33333333-3333-4333-8333-333333333333";
const gatewayA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const gatewayB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const passwordHash = hashSync("demo", 10);

db.transaction(() => {
  db.prepare(
    `INSERT OR IGNORE INTO tenants (id, name, timezone, created_at)
     VALUES (?, ?, 'Asia/Seoul', ?)`,
  ).run(tenantId, "대산금속", now);

  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
     (id, tenant_id, username, name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  [
    [adminId, "admin", "시스템 관리자", "ADMIN"],
    [operatorId, "operator", "설비 운영자", "OPERATOR"],
    [viewerId, "viewer", "조회 담당자", "VIEWER"],
  ].forEach(([id, username, name, role]) => {
    insertUser.run(
      id,
      tenantId,
      username,
      name,
      passwordHash,
      role,
      now,
      now,
    );
  });

  const insertGateway = db.prepare(
    `INSERT OR IGNORE INTO gateways
     (id, tenant_id, code, name, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
  );
  insertGateway.run(gatewayA, tenantId, "GATE-01", "주조동 게이트웨이", now, now);
  insertGateway.run(gatewayB, tenantId, "GATE-02", "가공동 게이트웨이", now, now);

  const insertFacility = db.prepare(
    `INSERT OR IGNORE INTO facilities
     (id, tenant_id, code, name, process_name, group_name, priority,
      base_temperature, peak_control_percent, gateway_id, node_number,
      channel_number, control_mode, status, version, created_at, created_by,
      updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
  );
  const facilities = [
    ["F-DC-01", "다이캐스팅1A", "다이캐스팅", "다이캐스팅 1", 1, 660, 40, gatewayA, 1, 1, "AUTO", "ACTIVE"],
    ["F-DC-02", "다이캐스팅1B", "다이캐스팅", "다이캐스팅 1", 2, 660, 40, gatewayA, 2, 1, "AUTO", "ACTIVE"],
    ["F-DC-03", "다이캐스팅2A", "다이캐스팅", "다이캐스팅 2", 3, 640, 45, gatewayA, 3, 1, "AUTO", "ACTIVE"],
    ["F-CNC-01", "가공1라인", "가공", "가공 라인", 10, 25, 30, gatewayB, 1, 1, "MANUAL", "ACTIVE"],
    ["F-CNC-02", "가공2라인", "가공", "가공 라인", 11, 25, 30, gatewayB, 2, 1, "MANUAL", "INACTIVE"],
  ];
  facilities.forEach((facility, index) => {
    insertFacility.run(
      `f000000${index + 1}-0000-4000-8000-00000000000${index + 1}`,
      tenantId,
      ...facility,
      now,
      adminId,
      now,
      adminId,
    );
  });
})();

db.close();
console.log(`Seed complete: ${resolveDatabasePath()}`);
console.log("Demo accounts: admin / operator / viewer (password: demo)");
