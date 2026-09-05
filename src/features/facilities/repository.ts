import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { getDb } from "@/lib/db";
import { AppError, isSqliteConstraint } from "@/lib/errors";
import {
  facilityCreateSchema,
  facilityUpdateSchema,
  facilityVersionSchema,
  type FacilityCreateInput,
  type FacilityListQuery,
  type FacilityUpdateInput,
} from "@/features/facilities/schema";
import type {
  Facility,
  GatewayOption,
  PaginatedFacilities,
  SessionUser,
} from "@/features/facilities/types";

const facilitySelect = `
  SELECT
    f.id,
    f.code,
    f.name,
    f.process_name AS processName,
    f.group_name AS groupName,
    f.priority,
    f.base_temperature AS baseTemperature,
    f.peak_control_percent AS peakControlPercent,
    f.gateway_id AS gatewayId,
    g.code AS gatewayCode,
    g.name AS gatewayName,
    f.node_number AS nodeNumber,
    f.channel_number AS channelNumber,
    f.control_mode AS controlMode,
    f.status,
    f.version,
    f.created_at AS createdAt,
    f.created_by AS createdBy,
    creator.name AS createdByName,
    f.updated_at AS updatedAt,
    f.updated_by AS updatedBy,
    updater.name AS updatedByName,
    f.deleted_at AS deletedAt,
    f.deleted_by AS deletedBy,
    deleter.name AS deletedByName
  FROM facilities f
  LEFT JOIN gateways g
    ON g.id = f.gateway_id AND g.tenant_id = f.tenant_id
  INNER JOIN users creator
    ON creator.id = f.created_by AND creator.tenant_id = f.tenant_id
  INNER JOIN users updater
    ON updater.id = f.updated_by AND updater.tenant_id = f.tenant_id
  LEFT JOIN users deleter
    ON deleter.id = f.deleted_by AND deleter.tenant_id = f.tenant_id
`;

function dbFor(database?: AppDatabase) {
  return database ?? getDb();
}

function getFacility(
  id: string,
  tenantId: string,
  includeDeleted: boolean,
  database?: AppDatabase,
) {
  const row = dbFor(database)
    .prepare(
      `${facilitySelect}
       WHERE f.id = ? AND f.tenant_id = ?
       ${includeDeleted ? "" : "AND f.deleted_at IS NULL"}`,
    )
    .get(id, tenantId) as Facility | undefined;
  if (!row) {
    throw new AppError(404, "FACILITY_NOT_FOUND", "설비를 찾을 수 없습니다.");
  }
  return row;
}

function assertGateway(
  gatewayId: string | null,
  tenantId: string,
  database: AppDatabase,
) {
  if (!gatewayId) return;
  const gateway = database
    .prepare(
      `SELECT id FROM gateways
       WHERE id = ? AND tenant_id = ? AND status = 'ACTIVE'`,
    )
    .get(gatewayId, tenantId);
  if (!gateway) {
    throw new AppError(
      422,
      "INVALID_GATEWAY",
      "사용 가능한 게이트웨이를 선택해 주세요.",
      { gatewayId: ["사용 가능한 게이트웨이를 선택해 주세요."] },
    );
  }
}

function audit(
  database: AppDatabase,
  user: SessionUser,
  entityId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "PURGE",
  requestId: string,
  before: Facility | null,
  after: Facility | null,
) {
  database
    .prepare(
      `INSERT INTO audit_logs
       (id, tenant_id, actor_id, entity_type, entity_id, action,
        before_json, after_json, request_id, created_at)
       VALUES (?, ?, ?, 'FACILITY', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      user.tenantId,
      user.id,
      entityId,
      action,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      requestId,
      new Date().toISOString(),
    );
}

function duplicateError(error: unknown): never {
  if (isSqliteConstraint(error, "SQLITE_CONSTRAINT_UNIQUE")) {
    if (
      error instanceof Error &&
      error.message.includes(
        "facilities.tenant_id, facilities.gateway_id, facilities.node_number, facilities.channel_number",
      )
    ) {
      throw new AppError(
        409,
        "DUPLICATE_GATEWAY_ENDPOINT",
        "이미 다른 설비가 사용 중인 게이트웨이 노드·채널입니다.",
        {
          gatewayId: ["이미 다른 설비가 사용 중인 연결 위치입니다."],
          nodeNumber: ["게이트웨이 안에서 노드·채널 조합은 고유해야 합니다."],
          channelNumber: ["게이트웨이 안에서 노드·채널 조합은 고유해야 합니다."],
        },
      );
    }
    throw new AppError(
      409,
      "DUPLICATE_FACILITY_CODE",
      "이미 사용 중인 설비 코드입니다.",
      { code: ["이미 사용 중인 설비 코드입니다."] },
    );
  }
  throw error;
}

export function listFacilities(
  user: SessionUser,
  query: FacilityListQuery,
  database?: AppDatabase,
): PaginatedFacilities {
  const db = dbFor(database);
  const where = ["f.tenant_id = ?"];
  const params: Array<string | number> = [user.tenantId];

  if (query.deleted === "exclude") where.push("f.deleted_at IS NULL");
  if (query.deleted === "only") where.push("f.deleted_at IS NOT NULL");
  if (query.q) {
    const escaped = query.q.replace(/[\\%_]/g, "\\$&");
    where.push(
      `(f.name LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR f.code LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR f.process_name LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR f.group_name LIKE ? ESCAPE '\\' COLLATE NOCASE)`,
    );
    const value = `%${escaped}%`;
    params.push(value, value, value, value);
  }
  if (query.status) {
    where.push("f.status = ?");
    params.push(query.status);
  }
  if (query.controlMode) {
    where.push("f.control_mode = ?");
    params.push(query.controlMode);
  }
  if (query.processName) {
    where.push("f.process_name = ?");
    params.push(query.processName);
  }
  if (query.gatewayId) {
    where.push("f.gateway_id = ?");
    params.push(query.gatewayId);
  }
  if (query.from) {
    where.push("f.updated_at >= ?");
    params.push(query.from);
  }
  if (query.to) {
    where.push("f.updated_at <= ?");
    params.push(query.to);
  }

  const sortColumns: Record<FacilityListQuery["sort"], string> = {
    updatedAt: "f.updated_at",
    createdAt: "f.created_at",
    name: "f.name COLLATE NOCASE",
    code: "f.code COLLATE NOCASE",
    priority: "f.priority",
    processName: "f.process_name COLLATE NOCASE",
  };
  const whereSql = where.join(" AND ");
  const total = (
    db
      .prepare(`SELECT COUNT(*) AS total FROM facilities f WHERE ${whereSql}`)
      .get(...params) as { total: number }
  ).total;
  const offset = (query.page - 1) * query.limit;
  const items = db
    .prepare(
      `${facilitySelect}
       WHERE ${whereSql}
       ORDER BY ${sortColumns[query.sort]} ${query.order.toUpperCase()}, f.id ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, query.limit, offset) as Facility[];

  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export function findFacility(
  user: SessionUser,
  id: string,
  includeDeleted = false,
  database?: AppDatabase,
) {
  return getFacility(id, user.tenantId, includeDeleted, database);
}

export function createFacility(
  user: SessionUser,
  input: FacilityCreateInput,
  requestId: string,
  database?: AppDatabase,
) {
  const db = dbFor(database);
  const data = facilityCreateSchema.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();

  try {
    return db.transaction(() => {
      assertGateway(data.gatewayId, user.tenantId, db);
      db.prepare(
        `INSERT INTO facilities
         (id, tenant_id, code, name, process_name, group_name, priority,
          base_temperature, peak_control_percent, gateway_id, node_number,
          channel_number, control_mode, status, version, created_at, created_by,
          updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      ).run(
        id,
        user.tenantId,
        data.code,
        data.name,
        data.processName,
        data.groupName,
        data.priority,
        data.baseTemperature,
        data.peakControlPercent,
        data.gatewayId,
        data.nodeNumber,
        data.channelNumber,
        data.controlMode,
        data.status,
        now,
        user.id,
        now,
        user.id,
      );
      const created = getFacility(id, user.tenantId, false, db);
      audit(db, user, id, "CREATE", requestId, null, created);
      return created;
    }).immediate();
  } catch (error) {
    return duplicateError(error);
  }
}

export function updateFacility(
  user: SessionUser,
  id: string,
  input: FacilityUpdateInput,
  requestId: string,
  database?: AppDatabase,
) {
  const db = dbFor(database);
  const patch = facilityUpdateSchema.parse(input);
  const before = getFacility(id, user.tenantId, true, db);
  if (before.deletedAt) {
    throw new AppError(
      409,
      "FACILITY_DELETED",
      "삭제된 설비는 복구 후 수정할 수 있습니다.",
    );
  }
  const merged = facilityCreateSchema.parse({
    code: before.code,
    name: patch.name ?? before.name,
    processName: patch.processName ?? before.processName,
    groupName: patch.groupName ?? before.groupName,
    priority: patch.priority ?? before.priority,
    baseTemperature: patch.baseTemperature ?? before.baseTemperature,
    peakControlPercent:
      patch.peakControlPercent ?? before.peakControlPercent,
    gatewayId:
      patch.gatewayId === undefined ? before.gatewayId : patch.gatewayId,
    nodeNumber:
      patch.nodeNumber === undefined ? before.nodeNumber : patch.nodeNumber,
    channelNumber:
      patch.channelNumber === undefined
        ? before.channelNumber
        : patch.channelNumber,
    controlMode: patch.controlMode ?? before.controlMode,
    status: patch.status ?? before.status,
  });
  const now = new Date().toISOString();

  try {
    return db.transaction(() => {
      assertGateway(merged.gatewayId, user.tenantId, db);
      const result = db.prepare(
        `UPDATE facilities SET
           code = ?, name = ?, process_name = ?, group_name = ?, priority = ?,
           base_temperature = ?, peak_control_percent = ?, gateway_id = ?,
           node_number = ?, channel_number = ?, control_mode = ?, status = ?,
           version = version + 1, updated_at = ?, updated_by = ?
         WHERE id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NULL`,
      ).run(
        merged.code,
        merged.name,
        merged.processName,
        merged.groupName,
        merged.priority,
        merged.baseTemperature,
        merged.peakControlPercent,
        merged.gatewayId,
        merged.nodeNumber,
        merged.channelNumber,
        merged.controlMode,
        merged.status,
        now,
        user.id,
        id,
        user.tenantId,
        patch.version,
      );
      if (result.changes === 0) {
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "다른 사용자가 먼저 수정했습니다. 최신 정보를 다시 불러와 주세요.",
        );
      }
      const updated = getFacility(id, user.tenantId, false, db);
      audit(db, user, id, "UPDATE", requestId, before, updated);
      return updated;
    }).immediate();
  } catch (error) {
    if (error instanceof AppError) throw error;
    return duplicateError(error);
  }
}

export function deleteFacility(
  user: SessionUser,
  id: string,
  expectedVersion: number,
  requestId: string,
  database?: AppDatabase,
) {
  const db = dbFor(database);
  const { version } = facilityVersionSchema.parse({ version: expectedVersion });
  const before = getFacility(id, user.tenantId, true, db);
  if (before.deletedAt) return before;
  const now = new Date().toISOString();

  return db.transaction(() => {
    const result = db.prepare(
      `UPDATE facilities
       SET deleted_at = ?, deleted_by = ?, updated_at = ?, updated_by = ?,
           version = version + 1
       WHERE id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NULL`,
    ).run(now, user.id, now, user.id, id, user.tenantId, version);
    if (result.changes !== 1) {
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "다른 사용자가 먼저 변경했습니다. 최신 정보를 다시 불러와 주세요.",
      );
    }
    const deleted = getFacility(id, user.tenantId, true, db);
    audit(db, user, id, "DELETE", requestId, before, deleted);
    return deleted;
  }).immediate();
}

export function restoreFacility(
  user: SessionUser,
  id: string,
  expectedVersion: number,
  requestId: string,
  database?: AppDatabase,
) {
  const db = dbFor(database);
  const { version } = facilityVersionSchema.parse({ version: expectedVersion });
  const before = getFacility(id, user.tenantId, true, db);
  if (!before.deletedAt) return before;
  const now = new Date().toISOString();

  try {
    return db.transaction(() => {
      assertGateway(before.gatewayId, user.tenantId, db);
      const result = db.prepare(
        `UPDATE facilities
         SET deleted_at = NULL, deleted_by = NULL, updated_at = ?, updated_by = ?,
             version = version + 1
         WHERE id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NOT NULL`,
      ).run(now, user.id, id, user.tenantId, version);
      if (result.changes !== 1) {
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "다른 사용자가 먼저 변경했습니다. 최신 정보를 다시 불러와 주세요.",
        );
      }
      const restored = getFacility(id, user.tenantId, false, db);
      audit(db, user, id, "RESTORE", requestId, before, restored);
      return restored;
    }).immediate();
  } catch (error) {
    if (error instanceof AppError) throw error;
    return duplicateError(error);
  }
}

export function purgeFacility(
  user: SessionUser,
  id: string,
  confirmation: { code: string; version: number },
  requestId: string,
  database?: AppDatabase,
) {
  const db = dbFor(database);
  const before = getFacility(id, user.tenantId, true, db);
  if (!before.deletedAt) {
    throw new AppError(
      409,
      "PURGE_REQUIRES_DELETE",
      "먼저 설비를 소프트 삭제해 주세요.",
    );
  }
  if (
    confirmation.code.toUpperCase() !== before.code.toUpperCase() ||
    confirmation.version !== before.version
  ) {
    throw new AppError(
      409,
      "PURGE_CONFIRMATION_MISMATCH",
      "설비 코드 또는 버전이 최신 정보와 일치하지 않습니다.",
    );
  }

  db.transaction(() => {
    audit(db, user, id, "PURGE", requestId, before, null);
    const result = db
      .prepare(
        `DELETE FROM facilities
         WHERE id = ? AND tenant_id = ? AND version = ? AND deleted_at IS NOT NULL`,
      )
      .run(id, user.tenantId, confirmation.version);
    if (result.changes !== 1) {
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "다른 사용자가 먼저 변경했습니다. 최신 정보를 다시 불러와 주세요.",
      );
    }
  }).immediate();
}

export function listGateways(
  user: SessionUser,
  database?: AppDatabase,
): GatewayOption[] {
  return (
    dbFor(database)
      .prepare(
        `SELECT id, code, name, status, rtu, lte, source
         FROM gateways
         WHERE tenant_id = ?
         ORDER BY status ASC, name COLLATE NOCASE ASC`,
      )
      .all(user.tenantId) as Array<{
      id: string;
      code: string;
      name: string;
      status: GatewayOption["status"];
      rtu: string | null;
      lte: number;
      source: GatewayOption["source"];
    }>
  ).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    rtu: row.rtu,
    lte: row.lte === 1,
    source: row.source,
  }));
}

export function listProcesses(user: SessionUser, database?: AppDatabase) {
  return dbFor(database)
    .prepare(
      `SELECT DISTINCT process_name AS processName
       FROM facilities
       WHERE tenant_id = ? AND deleted_at IS NULL
       ORDER BY process_name COLLATE NOCASE ASC`,
    )
    .all(user.tenantId) as Array<{ processName: string }>;
}
