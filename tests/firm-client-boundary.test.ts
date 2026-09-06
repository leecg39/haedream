import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("fit-mocks firm module boundary", () => {
  it("client-shared firm.ts 는 firm-rows.json 을 import 하지 않는다", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/fit-mocks/firm.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'].*firm-rows\.json["']/);
    expect(source).not.toMatch(/import\s+.*firm-rows\.json/);
    expect(source).not.toMatch(/export const FIRM_ROWS\b/);
  });
});
