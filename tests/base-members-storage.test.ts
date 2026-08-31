import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const BASE_FILES = [
  "public/assets/js/base.js",
  "public/watt/assets/js/base.js",
  "public/fit/assets/js/base.js",
] as const;

type RuntimeVio = {
  _members: unknown;
  setFirmInfo: () => unknown;
};

function initializeBase(
  baseFile: string,
  storedMembers: string | null,
  extraStorage: Record<string, string> = {},
) {
  const source = readFileSync(new URL(`../${baseFile}`, import.meta.url), "utf8");
  const values = new Map<string, string>([
    ["fid", "121"],
    ["firmName", "대산금속"],
    ...Object.entries(extraStorage),
  ]);
  if (storedMembers !== null) values.set("members", storedMembers);

  const icon = { href: "" };
  const firmSelect = {
    innerHTML: "",
    replaceChildren: vi.fn(),
  };
  const document = {
    addEventListener: vi.fn(),
    createDocumentFragment: vi.fn(() => ({ appendChild: vi.fn() })),
    createElement: vi.fn(() => ({
      appendChild: vi.fn(),
      selected: false,
      textContent: "",
      value: "",
    })),
    getElementById: vi.fn((id: string) => id === "firmSelect" ? firmSelect : null),
    querySelector: vi.fn(() => icon),
  };
  const warn = vi.fn();
  const context: Record<string, unknown> = {
    console: { warn },
    document,
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, String(value)),
    },
    sessionStorage: {
      getItem: () => "test-token",
    },
    window: {
      document,
      location: {
        hostname: "localhost",
        href: "http://localhost/peak.html",
      },
    },
  };

  runInNewContext(`${source}\nglobalThis.__vio = vio;`, context);
  const vio = context.__vio as RuntimeVio;
  return {
    members: vio._members,
    setFirmInfo: () => vio.setFirmInfo(),
    values,
    warn,
  };
}

describe.each(BASE_FILES)("%s members 복원", (baseFile) => {
  it("손상된 JSON을 빈 목록으로 복구하고 초기화를 계속함", () => {
    const result = initializeBase(baseFile, "{broken-json");

    expect(result.members).toEqual([]);
    expect(result.warn).toHaveBeenCalledOnce();
  });

  it("배열이 아닌 JSON을 빈 목록으로 정규화함", () => {
    const result = initializeBase(baseFile, '{"fid":121}');

    expect(result.members).toEqual([]);
    expect(result.warn).not.toHaveBeenCalled();
  });

  it("정상 업체 배열을 그대로 복원함", () => {
    const members = [{ fid: 121, name: "대산금속" }];
    const result = initializeBase(baseFile, JSON.stringify(members));

    expect(result.members).toEqual(members);
    expect(result.warn).not.toHaveBeenCalled();
  });

  it("특수 계정 분기도 손상된 JSON을 안전하게 복구함", async () => {
    const result = initializeBase(baseFile, "{broken-json", { authId: "123123" });
    result.warn.mockClear();

    await expect(
      Promise.resolve().then(() => result.setFirmInfo()),
    ).resolves.toBeUndefined();
    expect(result.warn).toHaveBeenCalledOnce();
    expect(result.values.get("fid")).toBe("98");
  });
});
