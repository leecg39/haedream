import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  clearRateLimitsForTests,
  enforceRateLimit,
  readJson,
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

describe("JSON request limits", () => {
  it("accepts valid JSON and rejects malformed JSON", async () => {
    await expect(
      readJson(
        new NextRequest("http://localhost/api/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: true }),
        }),
      ),
    ).resolves.toEqual({ ok: true });

    await expect(
      readJson(
        new NextRequest("http://localhost/api/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{broken",
        }),
      ),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_JSON" });
  });

  it("rejects an oversized JSON request before parsing", async () => {
    await expect(
      readJson(
        new NextRequest("http://localhost/api/test", {
          method: "POST",
          headers: {
            "content-length": String(65 * 1024),
            "content-type": "application/json",
          },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("rejects non-JSON media types", async () => {
    await expect(
      readJson(
        new NextRequest("http://localhost/api/test", {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 415, code: "UNSUPPORTED_MEDIA_TYPE" });
  });
});
