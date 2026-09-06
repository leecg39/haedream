import Database from "better-sqlite3";
import { performance } from "node:perf_hooks";
import { migrateDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { PILOT_CHECKLIST_KEYS, PILOT_GATEWAY_ID, PILOT_POINT_PM_ID, PILOT_TENANT_ID } from "@/features/pilot/constants";
import type { PilotInspectionRun } from "@/features/pilot/types";
import type { SessionUser } from "@/features/facilities/types";

export const NOW = "2026-09-06T15:30:00.000Z";
export const admin: SessionUser = {
  id: "11111111-1111-4111-8111-111111111111", tenantId: PILOT_TENANT_ID,
  username: "admin", name: "시스템 관리자", role: "ADMIN",
};
export const workloads = {
  inner: { runs: 32, readings: 2400, points: 16, limit: 20 },
  outer: { runs: 137, readings: 8760, points: 64, limit: 100 },
} as const;
export type Measurement = { queries: number; rows: number; work: number; ms: number };

export function prepareFixture(size: (typeof workloads)[keyof typeof workloads]) {
  let counting = false;
  let queries = 0;
  let rows = 0;
  const db = new Database(":memory:", {
    verbose: () => { if (counting) queries += 1; },
  });
  db.pragma("foreign_keys = ON");
  migrateDatabase(db);
  seedDatabase(db);
  // 이 연결은 평가 전용 메모리 DB다. 실제 data/*.db에는 접근하지 않는다.
  db.exec("DELETE FROM point_readings");
  const expectedRuns: PilotInspectionRun[] = [];
  db.transaction(() => {
    const run = db.prepare(`INSERT INTO pilot_inspection_runs
      (id, tenant_id, gateway_id, inspected_at, inspector_id, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, 'PASS', ?, ?)`);
    const item = db.prepare(`INSERT INTO pilot_inspection_items
      (id, run_id, item_key, result, note) VALUES (?, ?, ?, 'PASS', ?)`);
    for (let i = 0; i < size.runs; i += 1) {
      const id = `run-${i}`;
      const stamped = new Date(Date.parse(NOW) - i * 3600000).toISOString();
      run.run(id, PILOT_TENANT_ID, PILOT_GATEWAY_ID, stamped, admin.id, `검수 ${i}`, stamped);
      const items = [...PILOT_CHECKLIST_KEYS].sort().map((itemKey) => {
        const row = { id: `${id}-${itemKey}`, runId: id, itemKey, result: "PASS" as const, note: `항목 ${i}` };
        item.run(row.id, id, itemKey, row.note);
        return row;
      });
      expectedRuns.push({ id, tenantId: PILOT_TENANT_ID, gatewayId: PILOT_GATEWAY_ID,
        inspectedAt: stamped, inspectorId: admin.id, status: "PASS", notes: `검수 ${i}`, createdAt: stamped, items });
    }
    const point = db.prepare(`INSERT INTO control_points
      (id, tenant_id, gateway_id, tag, meter, enabled, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PM', 1, 'mock', ?, ?)`);
    for (let i = 0; i < size.points; i += 1) {
      point.run(`extra-${i}`, PILOT_TENANT_ID, PILOT_GATEWAY_ID, `EXTRA_${i}`, NOW, NOW);
    }
    const reading = db.prepare(`INSERT INTO point_readings
      (id, tenant_id, point_id, observed_at, interval, kwh, kw, voltage, amperage, source)
      VALUES (?, ?, ?, ?, '1h', 12, 6, 220, 3, ?)`);
    for (let i = 0; i < size.readings; i += 1) {
      reading.run(`reading-${i}`, PILOT_TENANT_ID, PILOT_POINT_PM_ID,
        new Date(Date.parse(NOW) - i * 3600000).toISOString(), "mock");
    }
    // 더 최신인 다른 관제점/데이터 소스는 summary 결과에 섞이면 안 된다.
    reading.run("other-point", PILOT_TENANT_ID, "extra-0", "2027-01-01T00:00:00.000Z", "mock");
    reading.run("other-source", PILOT_TENANT_ID, PILOT_POINT_PM_ID, "2028-01-01T00:00:00.000Z", "rtu");
  })();

  const measuredDb = new Proxy(db, {
    get(target, key) {
      if (key === "prepare") return (sql: string) => {
        const statement = target.prepare(sql);
        return new Proxy(statement, {
          get(stmt, method) {
            if (method === "all" || method === "get") return (...params: unknown[]) => {
              const value: unknown = Reflect.apply(stmt[method], stmt, params);
              if (counting) rows += Array.isArray(value) ? value.length : value === undefined ? 0 : 1;
              return value;
            };
            if (method === "iterate" || method === "raw" || method === "pluck") {
              throw new Error("동결된 행 계측은 all/get만 지원합니다.");
            }
            const value = Reflect.get(stmt, method);
            return typeof value === "function" ? value.bind(stmt) : value;
          },
        });
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as AppDatabase;

  function measure<T>(operation: (database: AppDatabase) => T) {
    queries = 0;
    rows = 0;
    counting = true;
    const start = performance.now();
    try {
      const value = operation(measuredDb);
      return { value, metric: { queries, rows, work: queries * 10 + rows, ms: performance.now() - start } };
    } finally {
      counting = false;
    }
  }
  return { db, measuredDb, measure, expectedRuns };
}
