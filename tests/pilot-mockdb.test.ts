import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasesForTests, openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { seedPilotData } from "@/features/pilot/seed";
import { SESSION_COOKIE } from "@/lib/auth";
import { readFileSync } from "node:fs";
import {
  FORBIDDEN_DATA_SOURCE_ALIASES,
  FORBIDDEN_LABEL_TERMS,
  PILOT_GATEWAY_ID,
  PILOT_MAPPING,
  PILOT_POINT_DIN_ID,
  PILOT_POINT_PM_ID,
  PILOT_READING_FIELDS,
  PILOT_READING_HOURS,
  PILOT_TENANT_ID,
} from "@/features/pilot/constants";
import { serializePilotSnapshot } from "@/features/pilot/mains";
import {
  getPilotDashboardSnapshot,
  getReadings,
  resolveDataSource,
} from "@/features/pilot/source";
import { listControlPoints, listReadings } from "@/features/pilot/repository";
import { facilityCreateSchema } from "@/features/facilities/schema";
import { listGateways } from "@/features/facilities/repository";
import type { SessionUser } from "@/features/facilities/types";
import { POST as tokenPost } from "@/app/api/[...path]/route";
import { GET as mainsGet } from "@/app/api/[...path]/route";
import { GET as pilotGet } from "@/app/api/pilot/route";
import { GET as readingsGet } from "@/app/api/pilot/readings/route";
import { GET as gatewaysGet } from "@/app/api/gateways/route";

const admin: SessionUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: PILOT_TENANT_ID,
  username: "admin",
  name: "시스템 관리자",
  role: "ADMIN",
};

const origin = "http://localhost";

function request(url: string, cookie?: string) {
  return new NextRequest(`${origin}${url}`, {
    method: "GET",
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

describe("pilot MockDB", () => {
  let directory: string;
  let db: AppDatabase;
  const previousSource = process.env.DATA_SOURCE;
  const previousDatabase = process.env.DATABASE_PATH;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-pilot-"));
    const databasePath = path.join(directory, "test.db");
    process.env.DATABASE_PATH = databasePath;
    delete process.env.DATA_SOURCE;
    db = openDatabase(databasePath);
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    closeDatabasesForTests();
    rmSync(directory, { recursive: true, force: true });
    if (previousSource === undefined) delete process.env.DATA_SOURCE;
    else process.env.DATA_SOURCE = previousSource;
    if (previousDatabase === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousDatabase;
  });

  it("seeds the field-team gateway, points, and hourly mock readings", () => {
    const gateway = db
      .prepare(
        `SELECT id, rtu, lte, source FROM gateways WHERE id = ?`,
      )
      .get(PILOT_GATEWAY_ID) as {
      id: string;
      rtu: string;
      lte: number;
      source: string;
    };
    expect(gateway).toMatchObject({
      id: PILOT_MAPPING.gateway.id,
      rtu: PILOT_MAPPING.gateway.rtu,
      lte: 1,
      source: "mock",
    });
    const labeled = db
      .prepare(`SELECT code, name FROM gateways WHERE id = ?`)
      .get(PILOT_GATEWAY_ID) as { code: string; name: string };
    expect(labeled).toEqual({
      code: PILOT_GATEWAY_ID,
      name: PILOT_GATEWAY_ID,
    });

    const points = listControlPoints({ gatewayId: PILOT_GATEWAY_ID }, db);
    expect(points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: PILOT_POINT_PM_ID,
          tag: "PANEL_PM",
          meter: "Panel Power Meter",
          enabled: true,
          source: "mock",
        }),
        expect.objectContaining({
          id: PILOT_POINT_DIN_ID,
          tag: "DIN_TBD",
          meter: "DIN(형번미확정)",
          enabled: false,
          source: "mock",
        }),
      ]),
    );

    const readings = listReadings(
      { source: "mock", pointId: PILOT_POINT_PM_ID },
      db,
    );
    expect(readings).toHaveLength(PILOT_READING_HOURS);
    expect(readings.every((row) => row.source === "mock")).toBe(true);
    expect(readings.every((row) => row.interval === "1h")).toBe(true);
    for (const row of readings) {
      for (const field of PILOT_READING_FIELDS) {
        expect(row[field as "kWh" | "kW" | "V" | "A"]).toEqual(
          expect.any(Number),
        );
      }
    }
    expect(
      listReadings({ source: "mock", pointId: PILOT_POINT_DIN_ID }, db),
    ).toHaveLength(0);
  });

  it("can be re-run without duplicating mock readings", () => {
    seedPilotData(db);
    seedPilotData(db);
    expect(
      listReadings({ source: "mock", pointId: PILOT_POINT_PM_ID }, db),
    ).toHaveLength(PILOT_READING_HOURS);
    expect(
      (
        db
          .prepare(`SELECT COUNT(*) AS total FROM control_points WHERE id IN (?, ?)`)
          .get(PILOT_POINT_PM_ID, PILOT_POINT_DIN_ID) as { total: number }
      ).total,
    ).toBe(2);
  });

  it("returns mock readings through the data-source abstraction", () => {
    const rows = getReadings({ source: "mock" }, db);
    expect(rows.length).toBe(PILOT_READING_HOURS);
    expect(rows[0]?.source).toBe("mock");
    expect(resolveDataSource(null)).toBe("mock");

    const snapshot = getPilotDashboardSnapshot({ source: "mock" }, db);
    expect(snapshot.gateway?.id).toBe(PILOT_GATEWAY_ID);
    expect(snapshot.latestReading?.source).toBe("mock");
  });

  it("keeps mock labels neutral and rejects out-of-scope sources", () => {
    const snapshot = serializePilotSnapshot(
      getPilotDashboardSnapshot({ source: "mock" }, db),
    );
    const surfaceText = [
      JSON.stringify(snapshot),
      readFileSync(path.join(process.cwd(), "src/components/PilotSnapshot.tsx"), "utf8"),
      readFileSync(path.join(process.cwd(), "src/features/pilot/mapping.json"), "utf8"),
    ].join("\n");
    for (const term of FORBIDDEN_LABEL_TERMS) {
      expect(surfaceText).not.toContain(term);
    }
    expect(snapshot.gateway?.id).toBe(PILOT_GATEWAY_ID);
    expect(snapshot.points.map((point) => point.tag)).toEqual(
      expect.arrayContaining(["PANEL_PM", "DIN_TBD"]),
    );
    expect(snapshot.source).toBe("mock");

    for (const alias of FORBIDDEN_DATA_SOURCE_ALIASES) {
      expect(() => resolveDataSource(alias)).toThrowError(
        expect.objectContaining({ code: "SOURCE_OUT_OF_SCOPE" }),
      );
    }
  });

  it("stubs the rtu path instead of faking a protocol", () => {
    expect(() => getReadings({ source: "rtu" }, db)).toThrowError(
      expect.objectContaining({ code: "RTU_NOT_IMPLEMENTED", status: 501 }),
    );
    process.env.DATA_SOURCE = "rtu";
    expect(resolveDataSource()).toBe("rtu");
    expect(() => getPilotDashboardSnapshot({}, db)).toThrowError(
      expect.objectContaining({ code: "RTU_NOT_IMPLEMENTED" }),
    );
  });

  it("lists the pilot gateway on the existing facility gateway API", () => {
    const gateways = listGateways(admin, db);
    const pilot = gateways.find((item) => item.id === PILOT_GATEWAY_ID);
    expect(pilot).toMatchObject({
      id: PILOT_GATEWAY_ID,
      rtu: "KFE",
      lte: true,
      source: "mock",
    });
    expect(
      facilityCreateSchema.safeParse({
        code: "F-PILOT",
        name: "파일럿 연결 설비",
        processName: "파일럿",
        groupName: "",
        priority: 1,
        baseTemperature: 25,
        peakControlPercent: 10,
        gatewayId: PILOT_GATEWAY_ID,
        nodeNumber: 1,
        channelNumber: 1,
        controlMode: "AUTO",
        status: "ACTIVE",
      }).success,
    ).toBe(true);
  });

  it("serves mock readings on authenticated pilot APIs and mains sidecar", async () => {
    const login = await tokenPost(
      new NextRequest(`${origin}/api/tokens`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({ cf: "login", id: "admin", pw: "demo" }),
      }),
      { params: Promise.resolve({ path: ["tokens"] }) },
    );
    const cookie = login.cookies.get(SESSION_COOKIE)?.value;
    expect(cookie).toBeTruthy();

    const snapshotResponse = await pilotGet(request("/api/pilot", cookie));
    expect(snapshotResponse.status).toBe(200);
    const snapshotBody = (await snapshotResponse.json()) as {
      ok: boolean;
      data: {
        source: string;
        gateway: { id: string; source: string };
        points: Array<{ id: string; enabled: boolean }>;
        readings: Array<{ source: string; kWh: number }>;
      };
    };
    expect(snapshotBody.data.source).toBe("mock");
    expect(snapshotBody.data.gateway.id).toBe(PILOT_GATEWAY_ID);
    expect(snapshotBody.data.points).toHaveLength(2);
    expect(snapshotBody.data.readings.every((row) => row.source === "mock")).toBe(
      true,
    );

    const readingsResponse = await readingsGet(
      request("/api/pilot/readings?source=mock&pointId=pt-pm-01", cookie),
    );
    expect(readingsResponse.status).toBe(200);
    const readingsBody = (await readingsResponse.json()) as {
      data: { readings: unknown[] };
    };
    expect(readingsBody.data.readings).toHaveLength(PILOT_READING_HOURS);

    const rtuResponse = await readingsGet(
      request("/api/pilot/readings?source=rtu", cookie),
    );
    expect(rtuResponse.status).toBe(501);

    const gatewayResponse = await gatewaysGet(request("/api/gateways", cookie));
    const gatewayBody = (await gatewayResponse.json()) as {
      data: { gateways: Array<{ id: string; source: string | null }> };
    };
    expect(
      gatewayBody.data.gateways.some((item) => item.id === PILOT_GATEWAY_ID),
    ).toBe(true);

    const mainsResponse = await mainsGet(request("/api/mains/121"), {
      params: Promise.resolve({ path: ["mains", "121"] }),
    });
    const mains = (await mainsResponse.json()) as {
      pilot: { gateway: { id: string }; readings: unknown[] };
    };
    expect(mains.pilot.gateway.id).toBe(PILOT_GATEWAY_ID);
    expect(mains.pilot.readings.length).toBeGreaterThan(0);
  });
});
