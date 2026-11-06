import { describe, expect, it } from "vitest";
import { formatSeoulDateTime } from "@/features/pilot/format";

describe("formatSeoulDateTime", () => {
  it("formats an afternoon reading in Seoul time with 오후", () => {
    expect(formatSeoulDateTime("2026-09-06T13:00:00.000Z")).toBe(
      "2026. 9. 6. 오후 10:00",
    );
  });

  it("formats a morning reading with 오전 and padded minutes", () => {
    expect(formatSeoulDateTime("2026-09-05T23:07:00.000Z")).toBe(
      "2026. 9. 6. 오전 8:07",
    );
  });

  it("shows midnight as 오전 12 and noon as 오후 12", () => {
    expect(formatSeoulDateTime("2026-09-05T15:00:00.000Z")).toBe(
      "2026. 9. 6. 오전 12:00",
    );
    expect(formatSeoulDateTime("2026-09-06T03:05:00.000Z")).toBe(
      "2026. 9. 6. 오후 12:05",
    );
  });

  it("never emits runtime-dependent AM/PM markers", () => {
    expect(formatSeoulDateTime("2026-09-06T13:00:00.000Z")).not.toMatch(
      /AM|PM/,
    );
  });

  it("returns a dash for missing or invalid values", () => {
    expect(formatSeoulDateTime(null)).toBe("-");
    expect(formatSeoulDateTime(undefined)).toBe("-");
    expect(formatSeoulDateTime("")).toBe("-");
    expect(formatSeoulDateTime("not-a-date")).toBe("-");
  });
});
