import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type {
  EnergyCorrectionDto,
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
  readonly unit: EnergyUnit;
  readonly value: number | null;
  readonly calculationVersion?: string;
  /** 값이 바뀌면 이전 행을 corrections 에 보존한다. */
  readonly correctionReason?: string;
  readonly correctedBy?: string;
}

/** 동일 canonical 키 재처리 결과. 행 수는 늘지 않는다. */
export type UpsertMeasurementOutcome = "inserted" | "unchanged" | "corrected";

export interface UpsertMeasurementResult extends EnergyMeasurementDto {
  readonly outcome: UpsertMeasurementOutcome;
}

const METER_POINT_RE = /^[A-Za-z0-9_./:-]{1,64}$/;
const SOURCES = new Set<EnergySource>(["DEMO", "MEASURED", "ESTIMATED"]);
const UNITS = new Set<EnergyUnit>(["kW", "kWh"]);
/** Z 또는 명시적 ±hh:mm 오프셋만 허용. timezone 없는 로컬 시각은 환경별 해석이 달라진다. */
const OBSERVED_AT_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

/** 동일 순간의 +09:00 / Z 입력이 한 키로 모이도록 UTC canonical ISO(Z)로 정규화한다. */
export function canonicalizeObservedAt(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError(422, "INVALID_OBSERVED_AT", "측정 시각이 필요합니다.");
  }
  if (!OBSERVED_AT_RE.test(trimmed)) {
    throw new AppError(
      422,
      "INVALID_OBSERVED_AT",
      "측정 시각은 Z 또는 ±hh:mm 오프셋이 있는 ISO-8601 이어야 합니다.",
    );
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    throw new AppError(422, "INVALID_OBSERVED_AT", "측정 시각 형식이 올바르지 않습니다.");
  }
  return new Date(ms).toISOString();
}

export function assertValidMeterPoint(meterPoint: string): string {
  const value = meterPoint.trim();
  if (!METER_POINT_RE.test(value)) {
    throw new AppError(422, "INVALID_METER_POINT", "측정점 식별자가 올바르지 않습니다.");
  }
  return value;
}

export function assertValidValue(value: number | null): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(422, "INVALID_VALUE", "측정값이 올바르지 않습니다.");
  }
  return value;
}

/** null 구분. 숫자 -0 과 0 은 동일 측정값으로 본다 (`===`). */
export function measurementValuesEqual(
  a: number | null,
  b: number | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a === b;
}

function staleThresholdMs() {
  return Number(process.env.ENERGY_STALE_MS ?? 6 * 60 * 60 * 1000);
}

/**
 * quality 는 입력으로 덮어쓰지 않는다. source·observedAt·value 로부터만 유도한다.
 * 파싱 불가 observedAt 은 MEASURED 로 위장하지 않고 NO_DATA 이다.
 */
export function deriveQuality(
  source: EnergySource,
  observedAt: string | null,
  value: number | null,
): EnergyQuality {
  if (value == null || !observedAt) return "NO_DATA";
  if (source === "DEMO") return "DEMO";
  if (source === "ESTIMATED") return "ESTIMATED";
  const observedMs = Date.parse(observedAt);
  if (!Number.isFinite(observedMs)) return "NO_DATA";
  const age = Date.now() - observedMs;
  if (age > staleThresholdMs()) return "STALE";
  return "MEASURED";
}

function requireTenantFirmAccess(tenantId: string, fid: number, db: AppDatabase) {
  const access = db
    .prepare(
      `SELECT 1 AS ok FROM tenant_firm_access
       WHERE tenant_id = ? AND fid = ?`,
    )
    .get(tenantId, fid) as { ok: number } | undefined;
  if (!access) {
    throw new AppError(
      403,
      "FIRM_ACCESS_DENIED",
      "해당 조직에 연결되지 않은 업체에는 계측값을 저장할 수 없습니다.",
    );
  }
  const firm = db.prepare(`SELECT 1 AS ok FROM firms WHERE fid = ?`).get(fid) as
    | { ok: number }
    | undefined;
  if (!firm) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }
}

export function findExistingMeasurement(
  tenantId: string,
  fid: number,
  meterPoint: string,
  observedAt: string,
  unit: EnergyUnit,
  db: AppDatabase = getDb(),
) {
  return db
    .prepare(
      `SELECT id, value_real AS value, source, quality, ingested_at AS ingestedAt,
              calculation_version AS calculationVersion
       FROM energy_measurements
       WHERE tenant_id = ? AND fid = ? AND meter_point = ? AND observed_at = ? AND unit = ?`,
    )
    .get(tenantId, fid, meterPoint, observedAt, unit) as
    | {
        id: string;
        value: number | null;
        source: EnergySource;
        quality: EnergyQuality;
        ingestedAt: string;
        calculationVersion: string;
      }
    | undefined;
}

/** dry-run 분류용. DB 를 변경하지 않는다. */
export function classifyMeasurementUpsert(
  input: UpsertMeasurementInput,
  db: AppDatabase = getDb(),
): UpsertMeasurementOutcome {
  if (!SOURCES.has(input.source)) {
    throw new AppError(422, "INVALID_SOURCE", "출처 값이 올바르지 않습니다.");
  }
  if (!UNITS.has(input.unit)) {
    throw new AppError(422, "INVALID_UNIT", "단위가 올바르지 않습니다.");
  }
  const meterPoint = assertValidMeterPoint(input.meterPoint);
  const observedAt = canonicalizeObservedAt(input.observedAt);
  const value = assertValidValue(input.value);
  const quality = deriveQuality(input.source, observedAt, value);
  const calculationVersion = input.calculationVersion ?? "v1";
  const existing = findExistingMeasurement(
    input.tenantId,
    input.fid,
    meterPoint,
    observedAt,
    input.unit,
    db,
  );
  if (!existing) return "inserted";
  const changed =
    !measurementValuesEqual(existing.value, value) ||
    existing.source !== input.source ||
    existing.quality !== quality ||
    existing.calculationVersion !== calculationVersion;
  return changed ? "corrected" : "unchanged";
}

/** 동일 키 재처리 시 값이 덮어써지고 행 수는 늘어나지 않는다. 정정 시 이력을 남긴다. */
export function upsertMeasurement(
  input: UpsertMeasurementInput,
  db: AppDatabase = getDb(),
): UpsertMeasurementResult {
  if (!SOURCES.has(input.source)) {
    throw new AppError(422, "INVALID_SOURCE", "출처 값이 올바르지 않습니다.");
  }
  if (!UNITS.has(input.unit)) {
    throw new AppError(422, "INVALID_UNIT", "단위가 올바르지 않습니다.");
  }

  const meterPoint = assertValidMeterPoint(input.meterPoint);
  const observedAt = canonicalizeObservedAt(input.observedAt);
  const value = assertValidValue(input.value);
  requireTenantFirmAccess(input.tenantId, input.fid, db);

  const ingestedAt = new Date().toISOString();
  const quality = deriveQuality(input.source, observedAt, value);
  const calculationVersion = input.calculationVersion ?? "v1";

  return db.transaction(() => {
    const existing = findExistingMeasurement(
      input.tenantId,
      input.fid,
      meterPoint,
      observedAt,
      input.unit,
      db,
    );

    const changed =
      existing &&
      (!measurementValuesEqual(existing.value, value) ||
        existing.source !== input.source ||
        existing.quality !== quality ||
        existing.calculationVersion !== calculationVersion);

    // unchanged: write 자체를 건너뛰어 ingested_at·correction 을 불변으로 유지한다.
    if (existing && !changed) {
      return {
        fid: input.fid,
        meterPoint,
        observedAt,
        ingestedAt: existing.ingestedAt,
        source: existing.source,
        quality: existing.quality,
        unit: input.unit,
        value: existing.value,
        calculationVersion: existing.calculationVersion,
        outcome: "unchanged" as const,
      };
    }

    const outcome: UpsertMeasurementOutcome = !existing ? "inserted" : "corrected";

    if (changed && existing) {
      db.prepare(
        `INSERT INTO energy_measurement_corrections
         (id, measurement_id, tenant_id, fid, meter_point, observed_at,
          previous_value, previous_source, previous_quality, previous_unit,
          previous_ingested_at, previous_calculation_version,
          corrected_at, corrected_by, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        existing.id,
        input.tenantId,
        input.fid,
        meterPoint,
        observedAt,
        existing.value,
        existing.source,
        existing.quality,
        input.unit,
        existing.ingestedAt,
        existing.calculationVersion,
        ingestedAt,
        input.correctedBy ?? null,
        input.correctionReason ??
          (existing.calculationVersion !== calculationVersion &&
          measurementValuesEqual(existing.value, value) &&
          existing.source === input.source
            ? `calculation_version ${existing.calculationVersion} → ${calculationVersion}`
            : "value correction"),
      );
    }

    const id = existing?.id ?? randomUUID();
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
      id,
      input.tenantId,
      input.fid,
      meterPoint,
      observedAt,
      ingestedAt,
      input.source,
      quality,
      input.unit,
      value,
      calculationVersion,
    );

    return {
      fid: input.fid,
      meterPoint,
      observedAt,
      ingestedAt,
      source: input.source,
      quality,
      unit: input.unit,
      value,
      calculationVersion,
      outcome,
    };
  })();
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

export function listCorrections(
  tenantId: string,
  fid: number,
  meterPoint: string,
  db: AppDatabase = getDb(),
): EnergyCorrectionDto[] {
  return db
    .prepare(
      `SELECT id, measurement_id AS measurementId, observed_at AS observedAt,
              previous_value AS previousValue, previous_source AS previousSource,
              previous_quality AS previousQuality,
              previous_calculation_version AS previousCalculationVersion,
              corrected_at AS correctedAt,
              reason
       FROM energy_measurement_corrections
       WHERE tenant_id = ? AND fid = ? AND meter_point = ?
       ORDER BY corrected_at ASC`,
    )
    .all(tenantId, fid, meterPoint) as EnergyCorrectionDto[];
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

/** 누적 계량기 구간 산출. 리셋(감소) 구간은 해당 구간값을 null 로 두고 이력을 유지한다. */
export function intervalFromCumulative(
  readings: readonly { observedAt: string; value: number | null }[],
): Array<{ observedAt: string; intervalValue: number | null; reset: boolean }> {
  const out: Array<{
    observedAt: string;
    intervalValue: number | null;
    reset: boolean;
  }> = [];
  for (let index = 0; index < readings.length; index += 1) {
    const current = readings[index]!;
    if (index === 0 || current.value == null || readings[index - 1]!.value == null) {
      out.push({ observedAt: current.observedAt, intervalValue: null, reset: false });
      continue;
    }
    const previous = readings[index - 1]!.value!;
    if (current.value < previous) {
      out.push({ observedAt: current.observedAt, intervalValue: null, reset: true });
      continue;
    }
    out.push({
      observedAt: current.observedAt,
      intervalValue: current.value - previous,
      reset: false,
    });
  }
  return out;
}

/** 정확히 15분 경계(UTC 분∈{0,15,30,45}, 초=0)인지 검사한다. */
export function isExactFifteenMinuteBoundary(isoUtc: string): boolean {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    date.getUTCMinutes() % 15 === 0
  );
}
