import { describe, expect, it } from "vitest";
import {
  facilityCreateSchema,
  facilityListQuerySchema,
  facilityUpdateSchema,
} from "@/features/facilities/schema";

const valid = {
  code: " dc-main_01 ",
  name: "  다이캐스팅 메인  ",
  processName: " 주조 공정 ",
  groupName: " 1라인 ",
  priority: "10",
  baseTemperature: "660",
  peakControlPercent: "40",
  gatewayId: null,
  nodeNumber: null,
  channelNumber: null,
  controlMode: "AUTO",
  status: "ACTIVE",
};

describe("facility schema", () => {
  it("normalizes strings, code, and numeric fields", () => {
    const result = facilityCreateSchema.parse(valid);
    expect(result).toMatchObject({
      code: "DC-MAIN_01",
      name: "다이캐스팅 메인",
      processName: "주조 공정",
      groupName: "1라인",
      priority: 10,
      baseTemperature: 660,
      peakControlPercent: 40,
    });
  });

  it("requires gateway, node, and channel together", () => {
    const result = facilityCreateSchema.safeParse({
      ...valid,
      gatewayId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.gatewayId?.[0]).toContain(
        "함께 입력",
      );
    }
  });

  it.each([
    ["priority", -1],
    ["priority", 255],
    ["baseTemperature", 1000],
    ["peakControlPercent", 101],
    ["nodeNumber", 11],
    ["channelNumber", 33],
  ])("rejects an out-of-range %s", (field, value) => {
    expect(
      facilityCreateSchema.safeParse({ ...valid, [field]: value }).success,
    ).toBe(false);
  });

  it.each([null, "", false, true])(
    "does not silently coerce %j into a required number",
    (value) => {
      expect(
        facilityCreateSchema.safeParse({ ...valid, priority: value }).success,
      ).toBe(false);
    },
  );

  it("requires a version and at least one change for updates", () => {
    expect(facilityUpdateSchema.safeParse({ name: "새 이름" }).success).toBe(
      false,
    );
    expect(facilityUpdateSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(
      facilityUpdateSchema.safeParse({ name: "새 이름", version: 1 }).success,
    ).toBe(true);
  });

  it("caps pagination and rejects arbitrary sort columns", () => {
    expect(
      facilityListQuerySchema.safeParse({ page: 1, limit: 101 }).success,
    ).toBe(false);
    expect(
      facilityListQuerySchema.safeParse({
        page: 1,
        limit: 10,
        sort: "DROP TABLE facilities",
      }).success,
    ).toBe(false);
  });

  it("normalizes offset date filters to UTC before querying", () => {
    const result = facilityListQuerySchema.parse({
      from: "2026-08-28T09:00:00+09:00",
      to: "2026-08-28T10:00:00+09:00",
    });
    expect(result.from).toBe("2026-08-28T00:00:00.000Z");
    expect(result.to).toBe("2026-08-28T01:00:00.000Z");
  });
});
