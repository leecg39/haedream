import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("firm client boundary", () => {
  it("클라이언트 firm 모듈은 업체 JSON/FIRM_ROWS 를 값으로 포함하지 않는다", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/fit-mocks/firm.ts"),
      "utf8",
    );
    expect(source).not.toContain("firm-rows.json");
    expect(source).not.toMatch(/\bFIRM_ROWS\b/);
  });
});
