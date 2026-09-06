import "server-only";

import {
  deriveQuality,
  listMeasurements,
} from "@/features/energy/measurements.repository";
import type { EnergySeriesDto, EnergyUnit } from "@/features/energy/types";
import type { AppDatabase } from "@/lib/db";

export function toEnergySeriesDto(
  tenantId: string,
  fid: number,
  meterPoint: string,
  unit: EnergyUnit,
  db?: AppDatabase,
): EnergySeriesDto {
  const points = listMeasurements(tenantId, fid, meterPoint, unit, db);
  const latest = points.at(-1) ?? null;
  return {
    fid,
    meterPoint,
    unit,
    points,
    latestObservedAt: latest?.observedAt ?? null,
    quality: deriveQuality(
      latest?.source ?? "DEMO",
      latest?.observedAt ?? null,
      latest?.value ?? null,
    ),
  };
}
