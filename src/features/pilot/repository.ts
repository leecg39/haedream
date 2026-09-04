import type { AppDatabase } from "@/lib/db";
import { getDb } from "@/lib/db";
import {
  PILOT_GATEWAY_ID,
  PILOT_TENANT_ID,
} from "@/features/pilot/constants";
import type {
  ControlPoint,
  PilotGateway,
  PilotSnapshot,
  Reading,
  ReadingsQuery,
} from "@/features/pilot/types";

function dbFor(database?: AppDatabase) {
  return database ?? getDb();
}

function asBoolean(value: unknown) {
  return value === 1 || value === true;
}

function mapGateway(row: {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  rtu: string | null;
  lte: number;
  source: "mock" | "rtu" | null;
}): PilotGateway {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    status: row.status,
    rtu: row.rtu,
    lte: asBoolean(row.lte),
    source: row.source,
  };
}

function mapPoint(row: {
  id: string;
  tenant_id: string;
  gateway_id: string;
  tag: string;
  meter: string;
  enabled: number;
  source: "mock" | "rtu";
}): ControlPoint {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    gatewayId: row.gateway_id,
    tag: row.tag,
    meter: row.meter,
    enabled: asBoolean(row.enabled),
    source: row.source,
  };
}

function mapReading(row: {
  id: string;
  tenant_id: string;
  point_id: string;
  observed_at: string;
  interval: "1h";
  kwh: number | null;
  kw: number | null;
  voltage: number | null;
  amperage: number | null;
  source: "mock" | "rtu";
}): Reading {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    pointId: row.point_id,
    observedAt: row.observed_at,
    interval: row.interval,
    kWh: row.kwh,
    kW: row.kw,
    V: row.voltage,
    A: row.amperage,
    source: row.source,
  };
}

export function listPilotGateways(
  query: { tenantId?: string; source?: "mock" | "rtu"; id?: string },
  database?: AppDatabase,
): PilotGateway[] {
  const where = ["tenant_id = ?"];
  const params: Array<string> = [query.tenantId ?? PILOT_TENANT_ID];
  if (query.source) {
    where.push("source = ?");
    params.push(query.source);
  }
  if (query.id) {
    where.push("id = ?");
    params.push(query.id);
  }
  return dbFor(database)
    .prepare(
      `SELECT id, tenant_id, code, name, status, rtu, lte, source
       FROM gateways
       WHERE ${where.join(" AND ")}
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all(...params)
    .map((row) => mapGateway(row as Parameters<typeof mapGateway>[0]));
}

export function getPilotGateway(
  id = PILOT_GATEWAY_ID,
  tenantId = PILOT_TENANT_ID,
  database?: AppDatabase,
) {
  return (
    listPilotGateways({ id, tenantId }, database)[0] ?? null
  );
}

export function listControlPoints(
  query: Pick<ReadingsQuery, "gatewayId" | "enabledOnly" | "tenantId" | "source"> = {},
  database?: AppDatabase,
): ControlPoint[] {
  const where = ["tenant_id = ?"];
  const params: Array<string | number> = [query.tenantId ?? PILOT_TENANT_ID];
  if (query.gatewayId) {
    where.push("gateway_id = ?");
    params.push(query.gatewayId);
  }
  if (query.source) {
    where.push("source = ?");
    params.push(query.source);
  }
  if (query.enabledOnly) {
    where.push("enabled = 1");
  }
  return dbFor(database)
    .prepare(
      `SELECT id, tenant_id, gateway_id, tag, meter, enabled, source
       FROM control_points
       WHERE ${where.join(" AND ")}
       ORDER BY tag COLLATE NOCASE ASC`,
    )
    .all(...params)
    .map((row) => mapPoint(row as Parameters<typeof mapPoint>[0]));
}

export function listReadings(
  query: ReadingsQuery = {},
  database?: AppDatabase,
): Reading[] {
  const where = ["r.tenant_id = ?"];
  const params: Array<string> = [query.tenantId ?? PILOT_TENANT_ID];
  if (query.source) {
    where.push("r.source = ?");
    params.push(query.source);
  }
  if (query.pointId) {
    where.push("r.point_id = ?");
    params.push(query.pointId);
  }
  if (query.gatewayId) {
    where.push("p.gateway_id = ?");
    params.push(query.gatewayId);
  }
  if (query.enabledOnly) {
    where.push("p.enabled = 1");
  }
  if (query.from) {
    where.push("r.observed_at >= ?");
    params.push(query.from);
  }
  if (query.to) {
    where.push("r.observed_at <= ?");
    params.push(query.to);
  }

  return dbFor(database)
    .prepare(
      `SELECT r.id, r.tenant_id, r.point_id, r.observed_at, r.interval,
              r.kwh, r.kw, r.voltage, r.amperage, r.source
       FROM point_readings r
       INNER JOIN control_points p
         ON p.id = r.point_id AND p.tenant_id = r.tenant_id
       WHERE ${where.join(" AND ")}
       ORDER BY r.observed_at ASC`,
    )
    .all(...params)
    .map((row) => mapReading(row as Parameters<typeof mapReading>[0]));
}

export function getPilotSnapshot(
  query: ReadingsQuery = {},
  database?: AppDatabase,
): PilotSnapshot {
  const source = query.source ?? "mock";
  const tenantId = query.tenantId ?? PILOT_TENANT_ID;
  const gatewayId = query.gatewayId ?? PILOT_GATEWAY_ID;
  const points = listControlPoints(
    { tenantId, gatewayId, source, enabledOnly: query.enabledOnly },
    database,
  );
  const readings = listReadings(
    { ...query, tenantId, gatewayId, source },
    database,
  );
  return {
    source,
    gateway: getPilotGateway(gatewayId, tenantId, database),
    points,
    latestReading: readings.at(-1) ?? null,
    readings,
  };
}
