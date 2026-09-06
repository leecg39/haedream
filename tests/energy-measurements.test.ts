import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import {
  countMeasurements,
  deriveQuality,
  upsertMeasurement,
} from "@/features/energy/measurements.repository";
import { toEnergySeriesDto } from "@/features/energy/dashboard-dto.server";

describe("energy measurements quality boundary", () => {
  let directory: string;
  let db: AppDatabase;
  let tenantId: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-energy-"));
    db = openDatabase(path.join(directory, "test.db"));
    seedDatabase(db);
    tenantId = (
      db.prepare(`SELECT tenant_id AS tenantId FROM users WHERE username = 'operator'`).get() as {
        tenantId: string;
      }
    ).tenantId;
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (101, 1, '품질 업체')",
    ).run();
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("동일 원본 재처리는 행을 늘리지 않는다", () => {
    const observedAt = "2026-09-06T03:00:00.000+09:00";
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt,
        source: "MEASURED",
        quality: "MEASURED",
        unit: "kW",
        value: 12.5,
      },
      db,
    );
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt,
        source: "MEASURED",
        quality: "MEASURED",
        unit: "kW",
        value: 12.5,
      },
      db,
    );
    expect(countMeasurements(tenantId, 101, db)).toBe(1);
  });

  it("kW/kWh 와 NO_DATA/STALE/DEMO 품질을 구분한다", () => {
    expect(deriveQuality("DEMO", "2026-09-06T00:00:00.000Z", 1)).toBe("DEMO");
    expect(deriveQuality("MEASURED", null, null)).toBe("NO_DATA");
    expect(deriveQuality("MEASURED", "2000-01-01T00:00:00.000Z", 0)).toBe("STALE");
    expect(deriveQuality("MEASURED", new Date().toISOString(), 0)).toBe("MEASURED");

    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T04:00:00.000+09:00",
        source: "MEASURED",
        quality: "MEASURED",
        unit: "kWh",
        value: 100,
      },
      db,
    );
    const series = toEnergySeriesDto(tenantId, 101, "main", "kWh", db);
    expect(series.unit).toBe("kWh");
    expect(series.points).toHaveLength(1);
    expect(series.points[0]?.value).toBe(100);
    expect(series.quality).toBe("STALE");
  });
});
