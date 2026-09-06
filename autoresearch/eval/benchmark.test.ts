import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, expect, it, vi } from "vitest";
import { acknowledgePilotAlarm, getDailyConfirmation, getPilotInspection, getPilotOpsSummary, listPilotInspections, mappingMatchesPilot, upsertDailyConfirmation, seoulConfirmDate } from "@/features/pilot/ops-repository";
import { PILOT_GATEWAY_ID, PILOT_POINT_PM_ID } from "@/features/pilot/constants";
import { admin, NOW, prepareFixture, workloads, type Measurement } from "./prepare";

const measurements: Record<string, Record<string, Measurement>> = {};
afterAll(() => {
  if (process.env.AUTORESEARCH_METRICS) {
    mkdirSync(path.dirname(process.env.AUTORESEARCH_METRICS), { recursive: true });
    writeFileSync(process.env.AUTORESEARCH_METRICS, JSON.stringify(measurements, null, 2) + "\n");
  }
});

for (const [name, size] of Object.entries(workloads)) {
  it(`${name}: 고정 응답·격리·최신성·멱등성을 보존하며 DB 작업량 측정`, () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const fixture = prepareFixture(size);
    const { db, measuredDb, measure, expectedRuns } = fixture;
    try {
      const inspection = measure((database) => listPilotInspections({ limit: size.limit }, database));
      expect(inspection.value).toEqual(expectedRuns.slice(0, size.limit));
      expect(listPilotInspections({ limit: 0 }, measuredDb)).toEqual(expectedRuns.slice(0, 1));
      expect(listPilotInspections({ limit: 500 }, measuredDb)).toEqual(expectedRuns.slice(0, 100));
      expect(listPilotInspections({ tenantId: "other" }, measuredDb)).toEqual([]);
      expect(listPilotInspections({ gatewayId: "missing" }, measuredDb)).toEqual([]);
      expect(getPilotInspection("run-0", admin.tenantId, measuredDb)).toEqual(expectedRuns[0]);
      expect(getPilotInspection("run-0", "other", measuredDb)).toBeNull();
      // 항목 없는 검수도 목록에서 사라지면 안 된다.
      db.prepare("DELETE FROM pilot_inspection_items WHERE run_id = 'run-1'").run();
      expect(listPilotInspections({ limit: 2 }, measuredDb)[1].items).toEqual([]);

      const summary = measure((database) => getPilotOpsSummary({}, database));
      expect(summary.value).toEqual({ unackedAlarmCount: 2, latestInspection: expectedRuns[0],
        todayConfirmation: null, latestReadingAt: NOW, mappingOk: true });
      expect(getPilotOpsSummary({ tenantId: "other" }, measuredDb).latestReadingAt).toBeNull();
      expect(getPilotOpsSummary({ gatewayId: "missing" }, measuredDb).latestReadingAt).toBeNull();
      db.prepare("DELETE FROM point_readings WHERE id = 'reading-0'").run();
      expect(getPilotOpsSummary({}, measuredDb).latestReadingAt)
        .toBe(new Date(Date.parse(NOW) - 3600000).toISOString());
      db.prepare("DELETE FROM point_readings WHERE point_id = ? AND source = 'mock'").run(PILOT_POINT_PM_ID);
      expect(getPilotOpsSummary({}, measuredDb).latestReadingAt).toBeNull();

      const mapping = measure((database) => mappingMatchesPilot(database));
      expect(mapping.value).toBe(true);
      db.prepare("UPDATE control_points SET enabled = 0 WHERE id = ?").run(PILOT_POINT_PM_ID);
      expect(mappingMatchesPilot(measuredDb)).toBe(false);
      db.prepare("UPDATE control_points SET enabled = 1, tag = 'panel_pm' WHERE id = ?").run(PILOT_POINT_PM_ID);
      expect(mappingMatchesPilot(measuredDb)).toBe(false);
      db.prepare("UPDATE control_points SET tag = 'PANEL_PM' WHERE id = ?").run(PILOT_POINT_PM_ID);
      expect(mappingMatchesPilot(measuredDb)).toBe(true);

      const input = { gatewayId: PILOT_GATEWAY_ID, receptionOk: true, alarmReviewed: false, note: "첫 확인" };
      const dailyCreate = measure((database) => upsertDailyConfirmation(admin, input, database));
      expect(dailyCreate.value).toMatchObject({ ...input, confirmDate: "2026-09-07", confirmedBy: admin.id, confirmedAt: NOW });
      const dailyUpdate = measure((database) => upsertDailyConfirmation(admin, { ...input, alarmReviewed: true, note: "재확인" }, database));
      expect(dailyUpdate.value).toEqual({ ...dailyCreate.value, alarmReviewed: true, note: "재확인" });
      expect(getDailyConfirmation({ tenantId: "other" }, measuredDb)).toBeNull();
      expect(() => upsertDailyConfirmation(admin, { ...input, gatewayId: "missing" }, measuredDb)).toThrow();
      expect(seoulConfirmDate(new Date("2026-09-06T14:59:59.999Z"))).toBe("2026-09-06");
      expect(seoulConfirmDate(new Date("2026-09-06T15:00:00.000Z"))).toBe("2026-09-07");

      expect(() => acknowledgePilotAlarm("alm-pilot-alarm-01", { ...admin, tenantId: "other" }, measuredDb)).toThrow();
      const ack = measure((database) => acknowledgePilotAlarm("alm-pilot-alarm-01", admin, database));
      expect(ack.value).toMatchObject({ id: "alm-pilot-alarm-01", acknowledgedAt: NOW, acknowledgedBy: admin.id });
      vi.setSystemTime("2026-09-07T00:00:00.000Z");
      const ackAgain = measure((database) => acknowledgePilotAlarm("alm-pilot-alarm-01", { ...admin, id: "22222222-2222-4222-8222-222222222222" }, database));
      expect(ackAgain.value).toEqual(ack.value);
      expect(() => acknowledgePilotAlarm("missing", admin, measuredDb)).toThrow();
      expect(getPilotOpsSummary({}, measuredDb).unackedAlarmCount).toBe(1);

      measurements[name] = Object.fromEntries(Object.entries({ inspection, summary, mapping, dailyCreate, dailyUpdate, ack, ackAgain })
        .map(([key, result]) => [key, result.metric]));
    } finally {
      db.close();
      vi.useRealTimers();
    }
  });
}
