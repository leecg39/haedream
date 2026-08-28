import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRateLimitsForTests,
  enforceRateLimit,
} from "@/lib/http";

describe("rate limit storage", () => {
  beforeEach(() => clearRateLimitsForTests());

  it("keeps an already-blocked account blocked when capacity is exhausted", () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      enforceRateLimit("login:account:121:admin", 10, 60_000);
    }
    for (let index = 0; index < 10_000; index += 1) {
      try {
        enforceRateLimit(`attack:${index}`, 1, 60_000);
      } catch {
        break;
      }
    }
    expect(() =>
      enforceRateLimit("login:account:121:admin", 10, 60_000),
    ).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() =>
      enforceRateLimit("brand-new-account", 10, 60_000),
    ).toThrowError(expect.objectContaining({ code: "RATE_LIMITED" }));
  });
});
