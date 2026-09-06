import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import {
  canonicalizeObservedAt,
  countMeasurements,
  deriveQuality,
  intervalFromCumulative,
  isExactFifteenMinuteBoundary,
  listCorrections,
  listMeasurements,
  upsertMeasurement,
} from "@/features/energy/measurements.repository";
import { toEnergySeriesDto } from "@/features/energy/dashboard-dto.server";
import { AppError } from "@/lib/errors";

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
    db.prepare(
      `INSERT OR REPLACE INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, 101, 1, 1, ?)`,
    ).run(tenantId, new Date().toISOString());
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("동일 순간의 +09:00 와 Z 는 한 행으로 정규화된다", () => {
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T03:00:00.000+09:00",
        source: "MEASURED",
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
        observedAt: "2026-09-05T18:00:00.000Z",
        source: "MEASURED",
        unit: "kW",
        value: 12.5,
      },
      db,
    );
    expect(countMeasurements(tenantId, 101, db)).toBe(1);
    expect(listMeasurements(tenantId, 101, "main", "kW", db)[0]?.observedAt).toBe(
      "2026-09-05T18:00:00.000Z",
    );
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
        unit: "kW",
        value: 12.5,
      },
      db,
    );
    expect(countMeasurements(tenantId, 101, db)).toBe(1);
  });

  it("정정 시 이전 값이 corrections 에 보존된다", () => {
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T04:00:00.000+09:00",
        source: "MEASURED",
        unit: "kWh",
        value: 100,
      },
      db,
    );
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T04:00:00.000+09:00",
        source: "MEASURED",
        unit: "kWh",
        value: 105,
        correctionReason: "meter re-read",
      },
      db,
    );
    expect(countMeasurements(tenantId, 101, db)).toBe(1);
    const corrections = listCorrections(tenantId, 101, "main", db);
    expect(corrections).toHaveLength(1);
    expect(corrections[0]?.previousValue).toBe(100);
    expect(listMeasurements(tenantId, 101, "main", "kWh", db)[0]?.value).toBe(105);
  });

  it("kW/kWh·15분 경계·KST↔UTC·누락·리셋·품질을 구분한다", () => {
    expect(canonicalizeObservedAt("2026-09-06T00:15:00+09:00")).toBe(
      "2026-09-05T15:15:00.000Z",
    );
    expect(isExactFifteenMinuteBoundary("2026-09-05T15:15:00.000Z")).toBe(true);
    expect(isExactFifteenMinuteBoundary("2026-09-05T15:16:00.000Z")).toBe(false);

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
        unit: "kWh",
        value: 100,
      },
      db,
    );
    // 15분 뒤 누락 구간을 건너뛰고 30분 뒤 값
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T04:30:00.000+09:00",
        source: "MEASURED",
        unit: "kWh",
        value: 110,
      },
      db,
    );
    // 누적계량기 리셋
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T04:45:00.000+09:00",
        source: "MEASURED",
        unit: "kWh",
        value: 2,
      },
      db,
    );

    const series = toEnergySeriesDto(tenantId, 101, "main", "kWh", db);
    expect(series.unit).toBe("kWh");
    expect(series.points).toHaveLength(3);
    expect(series.quality).toBe("STALE");

    const intervals = intervalFromCumulative(
      series.points.map((point) => ({
        observedAt: point.observedAt,
        value: point.value,
      })),
    );
    expect(intervals[1]?.intervalValue).toBe(10);
    expect(intervals[2]?.reset).toBe(true);
    expect(intervals[2]?.intervalValue).toBeNull();
  });

  it("잘못된 timestamp/value/meterPoint 와 없는 fid 를 거부한다", () => {
    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 101,
          meterPoint: "bad point!",
          observedAt: "2026-09-06T00:00:00.000Z",
          source: "MEASURED",
          unit: "kW",
          value: 1,
        },
        db,
      ),
    ).toThrow(AppError);

    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 101,
          meterPoint: "main",
          observedAt: "not-a-date",
          source: "MEASURED",
          unit: "kW",
          value: 1,
        },
        db,
      ),
    ).toThrow(AppError);

    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 101,
          meterPoint: "main",
          observedAt: "2026-09-06T12:00:00",
          source: "MEASURED",
          unit: "kW",
          value: 1,
        },
        db,
      ),
    ).toThrow(AppError);

    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 101,
          meterPoint: "main",
          observedAt: "2026-09-06T00:00:00.000Z",
          source: "MEASURED",
          unit: "kW",
          value: Number.NaN,
        },
        db,
      ),
    ).toThrow(AppError);

    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 999_999_999,
          meterPoint: "main",
          observedAt: "2026-09-06T00:00:00.000Z",
          source: "MEASURED",
          unit: "kW",
          value: 1,
        },
        db,
      ),
    ).toThrow(AppError);
  });

  it("tenant_firm_access 없는 전역 firms 만으로는 저장을 거부한다", () => {
    db.prepare(
      "INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (202, 2, '미연결 업체')",
    ).run();
    expect(() =>
      upsertMeasurement(
        {
          tenantId,
          fid: 202,
          meterPoint: "main",
          observedAt: "2026-09-06T00:00:00.000Z",
          source: "MEASURED",
          unit: "kW",
          value: 1,
        },
        db,
      ),
    ).toThrow(AppError);
    expect(countMeasurements(tenantId, 202, db)).toBe(0);
  });

  it("calculation_version 만 바뀐 정정도 이력에 남는다", () => {
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T05:00:00.000Z",
        source: "MEASURED",
        unit: "kW",
        value: 7,
        calculationVersion: "v1",
      },
      db,
    );
    upsertMeasurement(
      {
        tenantId,
        fid: 101,
        meterPoint: "main",
        observedAt: "2026-09-06T05:00:00.000Z",
        source: "MEASURED",
        unit: "kW",
        value: 7,
        calculationVersion: "v2",
        correctionReason: "formula bump",
      },
      db,
    );
    const corrections = listCorrections(tenantId, 101, "main", db);
    expect(corrections).toHaveLength(1);
    expect(corrections[0]?.previousCalculationVersion).toBe("v1");
    expect(corrections[0]?.previousValue).toBe(7);
    expect(listMeasurements(tenantId, 101, "main", "kW", db)[0]?.calculationVersion).toBe(
      "v2",
    );
  });

  it("파싱 불가 observedAt 은 MEASURED 로 위장하지 않는다", () => {
    expect(deriveQuality("MEASURED", "not-a-date", 1)).toBe("NO_DATA");
  });
});
