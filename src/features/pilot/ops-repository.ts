import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  PILOT_BOM,
  PILOT_CHECKLIST_ITEMS,
  PILOT_GATEWAY_ID,
  PILOT_POINT_PM_ID,
  PILOT_TENANT_ID,
} from "@/features/pilot/constants";
import {
  inspectionCreateSchema,
  dailyConfirmationUpsertSchema,
} from "@/features/pilot/ops-schema";
import type {
  PilotAlarm,
  PilotBom,
  PilotChecklistKey,
  PilotDailyConfirmation,
  PilotInspectionItem,
  PilotInspectionRun,
  PilotItemResult,
  PilotOpsSummary,
  PilotRunStatus,
} from "@/features/pilot/types";
import { PILOT_CHECKLIST_KEYS } from "@/features/pilot/types";
import { listControlPoints, listReadings } from "@/features/pilot/repository";
import type { SessionUser } from "@/features/facilities/types";
import type { z } from "zod";

type AlarmRow = {
  id: string;
  tenant_id: string;
  gateway_id: string;
  point_id: string | null;
  type: PilotAlarm["type"];
  severity: PilotAlarm["severity"];
  title: string;
  message: string;
  observed_at: string;
  source: PilotAlarm["source"];
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
};

type RunRow = {
  id: string;
  tenant_id: string;
  gateway_id: string;
  inspected_at: string;
  inspector_id: string;
  status: PilotRunStatus;
  notes: string;
  created_at: string;
};

type ItemRow = {
  id: string;
  run_id: string;
  item_key: PilotChecklistKey;
  result: PilotItemResult;
  note: string;
};

type ConfirmRow = {
  id: string;
  tenant_id: string;
  gateway_id: string;
  confirm_date: string;
  reception_ok: number;
  alarm_reviewed: number;
  confirmed_by: string;
  confirmed_at: string;
  note: string;
};

function mapAlarm(row: AlarmRow): PilotAlarm {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    gatewayId: row.gateway_id,
    pointId: row.point_id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    observedAt: row.observed_at,
    source: row.source,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    createdAt: row.created_at,
  };
}

function mapItem(row: ItemRow): PilotInspectionItem {
  return {
    id: row.id,
    runId: row.run_id,
    itemKey: row.item_key,
    result: row.result,
    note: row.note,
  };
}

function mapRun(row: RunRow, items: PilotInspectionItem[]): PilotInspectionRun {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    gatewayId: row.gateway_id,
    inspectedAt: row.inspected_at,
    inspectorId: row.inspector_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    items,
  };
}

function mapConfirm(row: ConfirmRow): PilotDailyConfirmation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    gatewayId: row.gateway_id,
    confirmDate: row.confirm_date,
    receptionOk: row.reception_ok === 1,
    alarmReviewed: row.alarm_reviewed === 1,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    note: row.note,
  };
}

export function seoulConfirmDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function deriveRunStatus(results: PilotItemResult[]): PilotRunStatus {
  if (results.every((result) => result === "PASS" || result === "NA")) {
    return results.some((result) => result === "PASS") ? "PASS" : "PARTIAL";
  }
  if (results.every((result) => result === "FAIL")) return "FAIL";
  if (results.some((result) => result === "FAIL")) return "FAIL";
  return "PARTIAL";
}

export function listPilotAlarms(
  options: {
    tenantId?: string;
    gatewayId?: string;
    unackedOnly?: boolean;
    limit?: number;
  } = {},
  database?: AppDatabase,
): PilotAlarm[] {
  const db = database ?? getDb();
  const tenantId = options.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = options.gatewayId ?? PILOT_GATEWAY_ID;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const rows = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, point_id, type, severity, title, message,
              observed_at, source, acknowledged_at, acknowledged_by, created_at
       FROM pilot_alarms
       WHERE tenant_id = ?
         AND gateway_id = ?
         AND (? = 0 OR acknowledged_at IS NULL)
       ORDER BY observed_at DESC
       LIMIT ?`,
    )
    .all(tenantId, gatewayId, options.unackedOnly ? 1 : 0, limit) as AlarmRow[];
  return rows.map(mapAlarm);
}

export function countUnackedPilotAlarms(
  tenantId = PILOT_TENANT_ID,
  gatewayId = PILOT_GATEWAY_ID,
  database?: AppDatabase,
) {
  const db = database ?? getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM pilot_alarms
       WHERE tenant_id = ? AND gateway_id = ? AND acknowledged_at IS NULL`,
    )
    .get(tenantId, gatewayId) as { count: number };
  return row.count;
}

export function acknowledgePilotAlarm(
  alarmId: string,
  user: SessionUser,
  database?: AppDatabase,
): PilotAlarm {
  const db = database ?? getDb();
  const existing = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, point_id, type, severity, title, message,
              observed_at, source, acknowledged_at, acknowledged_by, created_at
       FROM pilot_alarms
       WHERE id = ? AND tenant_id = ?`,
    )
    .get(alarmId, user.tenantId) as AlarmRow | undefined;
  if (!existing) {
    throw new AppError(404, "ALARM_NOT_FOUND", "알람을 찾을 수 없습니다.");
  }
  if (existing.acknowledged_at) {
    return mapAlarm(existing);
  }
  const stamped = new Date().toISOString();
  db.prepare(
    `UPDATE pilot_alarms
     SET acknowledged_at = ?, acknowledged_by = ?
     WHERE id = ? AND tenant_id = ? AND acknowledged_at IS NULL`,
  ).run(stamped, user.id, alarmId, user.tenantId);
  const updated = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, point_id, type, severity, title, message,
              observed_at, source, acknowledged_at, acknowledged_by, created_at
       FROM pilot_alarms WHERE id = ?`,
    )
    .get(alarmId) as AlarmRow;
  return mapAlarm(updated);
}

function loadInspectionItems(
  runId: string,
  database: AppDatabase,
): PilotInspectionItem[] {
  const rows = database
    .prepare(
      `SELECT id, run_id, item_key, result, note
       FROM pilot_inspection_items
       WHERE run_id = ?
       ORDER BY item_key ASC`,
    )
    .all(runId) as ItemRow[];
  return rows.map(mapItem);
}

export function listPilotInspections(
  options: {
    tenantId?: string;
    gatewayId?: string;
    limit?: number;
  } = {},
  database?: AppDatabase,
): PilotInspectionRun[] {
  const db = database ?? getDb();
  const tenantId = options.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = options.gatewayId ?? PILOT_GATEWAY_ID;
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const runs = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, inspected_at, inspector_id, status, notes, created_at
       FROM pilot_inspection_runs
       WHERE tenant_id = ? AND gateway_id = ?
       ORDER BY inspected_at DESC
       LIMIT ?`,
    )
    .all(tenantId, gatewayId, limit) as RunRow[];
  return runs.map((run) => mapRun(run, loadInspectionItems(run.id, db)));
}

export function getPilotInspection(
  runId: string,
  tenantId: string,
  database?: AppDatabase,
): PilotInspectionRun | null {
  const db = database ?? getDb();
  const run = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, inspected_at, inspector_id, status, notes, created_at
       FROM pilot_inspection_runs
       WHERE id = ? AND tenant_id = ?`,
    )
    .get(runId, tenantId) as RunRow | undefined;
  if (!run) return null;
  return mapRun(run, loadInspectionItems(run.id, db));
}

export function createPilotInspection(
  user: SessionUser,
  input: z.infer<typeof inspectionCreateSchema>,
  database?: AppDatabase,
): PilotInspectionRun {
  const parsed = inspectionCreateSchema.parse(input);
  const keys = new Set(parsed.items.map((item) => item.itemKey));
  for (const key of PILOT_CHECKLIST_KEYS) {
    if (!keys.has(key)) {
      throw new AppError(
        422,
        "CHECKLIST_INCOMPLETE",
        `검수 항목이 부족합니다: ${key}`,
      );
    }
  }
  if (keys.size !== PILOT_CHECKLIST_KEYS.length) {
    throw new AppError(
      422,
      "CHECKLIST_DUPLICATE",
      "검수 항목 키가 중복되었거나 허용되지 않습니다.",
    );
  }

  const db = database ?? getDb();
  const gateway = db
    .prepare(
      `SELECT id FROM gateways WHERE id = ? AND tenant_id = ?`,
    )
    .get(parsed.gatewayId, user.tenantId) as { id: string } | undefined;
  if (!gateway) {
    throw new AppError(404, "GATEWAY_NOT_FOUND", "게이트웨이를 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();
  const runId = randomUUID();
  const status = deriveRunStatus(parsed.items.map((item) => item.result));

  db.transaction(() => {
    db.prepare(
      `INSERT INTO pilot_inspection_runs
       (id, tenant_id, gateway_id, inspected_at, inspector_id, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      runId,
      user.tenantId,
      parsed.gatewayId,
      now,
      user.id,
      status,
      parsed.notes,
      now,
    );
    const insertItem = db.prepare(
      `INSERT INTO pilot_inspection_items
       (id, run_id, item_key, result, note)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const item of parsed.items) {
      insertItem.run(
        randomUUID(),
        runId,
        item.itemKey,
        item.result,
        item.note ?? "",
      );
    }
  })();

  const created = getPilotInspection(runId, user.tenantId, db);
  if (!created) {
    throw new AppError(500, "INSPECTION_CREATE_FAILED", "검수 기록을 저장하지 못했습니다.");
  }
  return created;
}

export function getDailyConfirmation(
  options: {
    tenantId?: string;
    gatewayId?: string;
    confirmDate?: string;
  } = {},
  database?: AppDatabase,
): PilotDailyConfirmation | null {
  const db = database ?? getDb();
  const tenantId = options.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = options.gatewayId ?? PILOT_GATEWAY_ID;
  const confirmDate = options.confirmDate ?? seoulConfirmDate();
  const row = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, confirm_date, reception_ok, alarm_reviewed,
              confirmed_by, confirmed_at, note
       FROM pilot_daily_confirmations
       WHERE tenant_id = ? AND gateway_id = ? AND confirm_date = ?`,
    )
    .get(tenantId, gatewayId, confirmDate) as ConfirmRow | undefined;
  return row ? mapConfirm(row) : null;
}

export function listDailyConfirmations(
  options: {
    tenantId?: string;
    gatewayId?: string;
    limit?: number;
  } = {},
  database?: AppDatabase,
): PilotDailyConfirmation[] {
  const db = database ?? getDb();
  const tenantId = options.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = options.gatewayId ?? PILOT_GATEWAY_ID;
  const limit = Math.min(Math.max(options.limit ?? 14, 1), 90);
  const rows = db
    .prepare(
      `SELECT id, tenant_id, gateway_id, confirm_date, reception_ok, alarm_reviewed,
              confirmed_by, confirmed_at, note
       FROM pilot_daily_confirmations
       WHERE tenant_id = ? AND gateway_id = ?
       ORDER BY confirm_date DESC
       LIMIT ?`,
    )
    .all(tenantId, gatewayId, limit) as ConfirmRow[];
  return rows.map(mapConfirm);
}

export function upsertDailyConfirmation(
  user: SessionUser,
  input: z.infer<typeof dailyConfirmationUpsertSchema>,
  database?: AppDatabase,
): PilotDailyConfirmation {
  const parsed = dailyConfirmationUpsertSchema.parse(input);
  const db = database ?? getDb();
  const confirmDate = parsed.confirmDate ?? seoulConfirmDate();
  const gateway = db
    .prepare(`SELECT id FROM gateways WHERE id = ? AND tenant_id = ?`)
    .get(parsed.gatewayId, user.tenantId) as { id: string } | undefined;
  if (!gateway) {
    throw new AppError(404, "GATEWAY_NOT_FOUND", "게이트웨이를 찾을 수 없습니다.");
  }

  const now = new Date().toISOString();
  const existing = getDailyConfirmation(
    {
      tenantId: user.tenantId,
      gatewayId: parsed.gatewayId,
      confirmDate,
    },
    db,
  );
  const id = existing?.id ?? randomUUID();
  db.prepare(
    `INSERT INTO pilot_daily_confirmations
     (id, tenant_id, gateway_id, confirm_date, reception_ok, alarm_reviewed,
      confirmed_by, confirmed_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, gateway_id, confirm_date) DO UPDATE SET
       reception_ok = excluded.reception_ok,
       alarm_reviewed = excluded.alarm_reviewed,
       confirmed_by = excluded.confirmed_by,
       confirmed_at = excluded.confirmed_at,
       note = excluded.note`,
  ).run(
    id,
    user.tenantId,
    parsed.gatewayId,
    confirmDate,
    parsed.receptionOk ? 1 : 0,
    parsed.alarmReviewed ? 1 : 0,
    user.id,
    now,
    parsed.note ?? "",
  );

  const saved = getDailyConfirmation(
    {
      tenantId: user.tenantId,
      gatewayId: parsed.gatewayId,
      confirmDate,
    },
    db,
  );
  if (!saved) {
    throw new AppError(500, "CONFIRMATION_SAVE_FAILED", "일일 확인을 저장하지 못했습니다.");
  }
  return saved;
}

export function getPilotBom(): PilotBom {
  return {
    package: "A",
    gatewayId: PILOT_BOM.gatewayId,
    standardBom: PILOT_BOM.standardBom,
    optionalBom: PILOT_BOM.optionalBom,
    checklistKeys: PILOT_CHECKLIST_KEYS,
  };
}

export function getChecklistTemplate() {
  return PILOT_CHECKLIST_ITEMS.map((item) => ({ ...item }));
}

export function mappingMatchesPilot(database?: AppDatabase) {
  const points = listControlPoints(
    { gatewayId: PILOT_GATEWAY_ID, tenantId: PILOT_TENANT_ID },
    database,
  );
  const panel = points.find((point) => point.id === PILOT_POINT_PM_ID);
  return Boolean(
    panel &&
      panel.tag === "PANEL_PM" &&
      panel.enabled &&
      panel.gatewayId === PILOT_GATEWAY_ID,
  );
}

export function getPilotOpsSummary(
  options: {
    tenantId?: string;
    gatewayId?: string;
  } = {},
  database?: AppDatabase,
): PilotOpsSummary {
  const tenantId = options.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = options.gatewayId ?? PILOT_GATEWAY_ID;
  const inspections = listPilotInspections({ tenantId, gatewayId, limit: 1 }, database);
  const readings = listReadings(
    { tenantId, gatewayId, pointId: PILOT_POINT_PM_ID, source: "mock" },
    database,
  );
  return {
    unackedAlarmCount: countUnackedPilotAlarms(tenantId, gatewayId, database),
    latestInspection: inspections[0] ?? null,
    todayConfirmation: getDailyConfirmation({ tenantId, gatewayId }, database),
    latestReadingAt: readings.at(-1)?.observedAt ?? null,
    mappingOk: mappingMatchesPilot(database),
  };
}
