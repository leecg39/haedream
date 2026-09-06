import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabasesForTests, openDatabase, type AppDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { SESSION_COOKIE } from "@/lib/auth";
import { PILOT_CHECKLIST_KEYS, PILOT_GATEWAY_ID } from "@/features/pilot/constants";
import { POST as tokenPost } from "@/app/api/[...path]/route";
import { GET as alarmsGet } from "@/app/api/pilot/alarms/route";
import { POST as alarmAckPost } from "@/app/api/pilot/alarms/[id]/ack/route";
import {
  GET as inspectionsGet,
  POST as inspectionsPost,
} from "@/app/api/pilot/inspections/route";
import {
  GET as dailyGet,
  PUT as dailyPut,
} from "@/app/api/pilot/daily-confirmations/route";
import { GET as bomGet } from "@/app/api/pilot/bom/route";
import {
  countUnackedPilotAlarms,
  getPilotBom,
  mappingMatchesPilot,
} from "@/features/pilot/ops-repository";

const origin = "http://localhost";

async function login(id: string) {
  const response = await tokenPost(
    new NextRequest(`${origin}/api/tokens`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ cf: "login", id, pw: "demo" }),
    }),
    { params: Promise.resolve({ path: ["tokens"] }) },
  );
  const cookie = response.cookies.get(SESSION_COOKIE)?.value;
  expect(cookie).toBeTruthy();
  return cookie as string;
}

function getRequest(url: string, cookie: string) {
  return new NextRequest(`${origin}${url}`, {
    method: "GET",
    headers: { cookie: `${SESSION_COOKIE}=${cookie}` },
  });
}

function jsonRequest(url: string, cookie: string, method: string, body?: unknown) {
  return new NextRequest(`${origin}${url}`, {
    method,
    headers: {
      cookie: `${SESSION_COOKIE}=${cookie}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("pilot package A ops", () => {
  let directory: string;
  let db: AppDatabase;
  const previousDatabase = process.env.DATABASE_PATH;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-pilot-ops-"));
    const databasePath = path.join(directory, "test.db");
    process.env.DATABASE_PATH = databasePath;
    db = openDatabase(databasePath);
    seedDatabase(db);
  });

  afterEach(() => {
    db.close();
    closeDatabasesForTests();
    rmSync(directory, { recursive: true, force: true });
    if (previousDatabase === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousDatabase;
  });

  it("seeds mock disconnect/alarm inbox and mapping for operator drills", () => {
    expect(countUnackedPilotAlarms()).toBeGreaterThanOrEqual(2);
    expect(mappingMatchesPilot(db)).toBe(true);
    expect(getPilotBom().standardBom.length).toBeGreaterThan(0);
    expect(getPilotBom().checklistKeys).toEqual([...PILOT_CHECKLIST_KEYS]);
  });

  it("lets operator acknowledge alarms and blocks viewer ack", async () => {
    const operatorCookie = await login("operator");
    const list = await alarmsGet(getRequest("/api/pilot/alarms", operatorCookie));
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as {
      data: { alarms: Array<{ id: string; acknowledgedAt: string | null }> };
    };
    const target = listBody.data.alarms.find((row) => !row.acknowledgedAt);
    expect(target).toBeTruthy();

    const ack = await alarmAckPost(
      jsonRequest(`/api/pilot/alarms/${target!.id}/ack`, operatorCookie, "POST"),
      { params: Promise.resolve({ id: target!.id }) },
    );
    expect(ack.status).toBe(200);

    const viewerCookie = await login("viewer");
    const remaining = (
      (await (
        await alarmsGet(getRequest("/api/pilot/alarms?unackedOnly=1", viewerCookie))
      ).json()) as {
        data: { alarms: Array<{ id: string }> };
      }
    ).data.alarms[0];
    expect(remaining).toBeTruthy();
    const forbidden = await alarmAckPost(
      jsonRequest(
        `/api/pilot/alarms/${remaining.id}/ack`,
        viewerCookie,
        "POST",
      ),
      { params: Promise.resolve({ id: remaining.id }) },
    );
    expect(forbidden.status).toBe(403);
  });

  it("records the five-item inspection checklist", async () => {
    const cookie = await login("operator");
    const incomplete = await inspectionsPost(
      jsonRequest("/api/pilot/inspections", cookie, "POST", {
        gatewayId: PILOT_GATEWAY_ID,
        notes: "",
        items: [
          { itemKey: "rtu_485_led", result: "PASS", note: "" },
          { itemKey: "lte_link", result: "PASS", note: "" },
        ],
      }),
    );
    expect(incomplete.status).toBe(422);

    const created = await inspectionsPost(
      jsonRequest("/api/pilot/inspections", cookie, "POST", {
        gatewayId: PILOT_GATEWAY_ID,
        notes: "현장 1차 검수",
        items: PILOT_CHECKLIST_KEYS.map((itemKey) => ({
          itemKey,
          result: "PASS",
          note: "",
        })),
      }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as {
      data: { inspection: { status: string; items: unknown[] } };
    };
    expect(body.data.inspection.status).toBe("PASS");
    expect(body.data.inspection.items).toHaveLength(5);

    const listed = await inspectionsGet(
      getRequest("/api/pilot/inspections", cookie),
    );
    expect(listed.status).toBe(200);
  });

  it("upserts daily reception and alarm confirmation for today", async () => {
    const cookie = await login("admin");
    const saved = await dailyPut(
      jsonRequest("/api/pilot/daily-confirmations", cookie, "PUT", {
        gatewayId: PILOT_GATEWAY_ID,
        receptionOk: true,
        alarmReviewed: true,
        note: "Mock 48h 수신 확인",
      }),
    );
    expect(saved.status).toBe(200);
    const listed = await dailyGet(
      getRequest("/api/pilot/daily-confirmations", cookie),
    );
    const body = (await listed.json()) as {
      data: {
        confirmations: Array<{
          receptionOk: boolean;
          alarmReviewed: boolean;
        }>;
      };
    };
    expect(body.data.confirmations[0]).toMatchObject({
      receptionOk: true,
      alarmReviewed: true,
    });
  });

  it("serves mapping and BOM without portal labels", async () => {
    const cookie = await login("viewer");
    const response = await bomGet(getRequest("/api/pilot/bom", cookie));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        bom: { package: string; standardBom: unknown[] };
        mapping: { gateway: { id: string } };
        summary: { mappingOk: boolean };
      };
    };
    expect(body.data.bom.package).toBe("A");
    expect(body.data.mapping.gateway.id).toBe(PILOT_GATEWAY_ID);
    expect(body.data.summary.mappingOk).toBe(true);
    const text = JSON.stringify(body.data);
    expect(text).not.toMatch(/portal\.kfems|파워플래너|KEEP\+|요금|절감률/i);
  });
});
