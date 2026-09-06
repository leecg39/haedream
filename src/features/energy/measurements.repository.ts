import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/lib/db";
import type {
  EnergyMeasurementDto,
  EnergyQuality,
  EnergySource,
  EnergyUnit,
} from "@/features/energy/types";

export interface UpsertMeasurementInput {
  readonly tenantId: string;
  readonly fid: number;
  readonly meterPoint: string;
  readonly observedAt: string;
  readonly source: EnergySource;
  readonly quality: EnergyQuality;
  readonly unit: EnergyUnit;
  readonly value: number | null;
  readonly calculationVersion?: string;
}

function staleThresholdMs() {
  return Number(process.env.ENERGY_STALE_MS ?? 6 * 60 * 60 * 1000);
}

export function deriveQuality(
  source: EnergySource,
  observedAt: string | null,
  value: number | null,
): EnergyQuality {
  if (value == null || !observedAt) return "NO_DATA";
  if (source === "DEMO") return "DEMO";
  if (source === "ESTIMATED") return "ESTIMATED";
  const age = Date.now() - new Date(observedAt).getTime();
  if (Number.isFinite(age) && age > staleThresholdMs()) return "STALE";
  return "MEASURED";
}

/** 동일 키 재처리 시 값이 덮어써지고 행 수는 늘 않는다. */
export function upsertMeasurement(
  input: UpsertMeasurementInput,
  db: AppDatabase = getDb(),
): EnergyMeasurementDto {
  const ingestedAt = new Date().toISOString();
  const quality = deriveQuality(input.source, input.observedAt, input.value);
  const calculationVersion = input.calculationVersion ?? "v1";
  db.prepare(
    `INSERT INTO energy_measurements
     (id, tenant_id, fid, meter_point, observed_at, ingested_at, source, quality, unit, value_real, calculation_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, fid, meter_point, observed_at, unit) DO UPDATE SET
       ingested_at = excluded.ingested_at,
       source = excluded.source,
       quality = excluded.quality,
       value_real = excluded.value_real,
       calculation_version = excluded.calculation_version`,
  ).run(
    randomUUID(),
    input.tenantId,
    input.fid,
    input.meterPoint,
    input.observedAt,
    ingestedAt,
    input.source,
    quality,
    input.unit,
    input.value,
    calculationVersion,
  );

  return {
    fid: input.fid,
    meterPoint: input.meterPoint,
    observedAt: input.observedAt,
    ingestedAt,
    source: input.source,
    quality,
    unit: input.unit,
    value: input.value,
    calculationVersion,
  };
}

export function listMeasurements(
  tenantId: string,
  fid: number,
  meterPoint: string,
  unit: EnergyUnit,
  db: AppDatabase = getDb(),
): EnergyMeasurementDto[] {
  const rows = db
    .prepare(
      `SELECT fid, meter_point AS meterPoint, observed_at AS observedAt,
              ingested_at AS ingestedAt, source, quality, unit,
              value_real AS value, calculation_version AS calculationVersion
       FROM energy_measurements
       WHERE tenant_id = ? AND fid = ? AND meter_point = ? AND unit = ?
       ORDER BY observed_at ASC`,
    )
    .all(tenantId, fid, meterPoint, unit) as Array<
    EnergyMeasurementDto & { value: number | null }
  >;
  return rows.map((row) => ({
    ...row,
    quality: deriveQuality(row.source, row.observedAt, row.value),
  }));
}

export function countMeasurements(
  tenantId: string,
  fid: number,
  db: AppDatabase = getDb(),
): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM energy_measurements
         WHERE tenant_id = ? AND fid = ?`,
      )
      .get(tenantId, fid) as { count: number }
  ).count;
}
