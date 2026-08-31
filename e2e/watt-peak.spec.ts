import { expect, test } from "@playwright/test";

type FirmSummary = {
  fid: number;
  firmName: string;
};

test.describe("Watt 피크 업체 선택 /peak.html", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("accessToken")) {
        sessionStorage.setItem("accessToken", "e2e-demo");
      }
      if (!localStorage.getItem("fid")) {
        localStorage.setItem("fid", "121");
        localStorage.setItem("firmName", "대산금속");
        // 로그인 응답 목록이 1개여도 피크 화면은 DB 전체 목록으로 교체해야 한다.
        localStorage.setItem("members", JSON.stringify([{ fid: 121, name: "대산금속" }]));
      }
    });
  });

  test("DB 업체 전체를 스크롤·검색하고 선택 상태를 저장함", async ({ page }) => {
    const response = await page.request.get("/api/firm");
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: FirmSummary[] };
    expect(body.data.length).toBeGreaterThan(1_000);

    await page.goto("/peak.html");

    const firmSelect = page.locator("#firmSelect");
    await expect(firmSelect.locator("option")).toHaveCount(body.data.length);
    await expect(firmSelect).toHaveValue("121");
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText("대산금속");

    await page.locator("#firmSelect + .select2 .select2-selection").click();

    const results = page.locator(
      ".select2-container--open .select2-results__options",
    );
    await expect(results).toBeVisible();
    const scrollState = await results.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(scrollState.overflowY).toBe("auto");
    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

    const target = body.data.find((firm) => firm.fid !== 121);
    expect(target).toBeDefined();

    const search = page.locator(
      ".select2-container--open .select2-search__field",
    );
    await search.fill(target!.firmName);
    const targetOption = page
      .locator(".select2-container--open .select2-results__option")
      .getByText(target!.firmName, { exact: true });
    await expect(targetOption).toBeVisible();
    const reloaded = page.waitForEvent("load");
    await targetOption.click();
    await reloaded;

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("fid")))
      .toBe(String(target!.fid));
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("firmName")))
      .toBe(target!.firmName);
    await expect(firmSelect).toHaveValue(String(target!.fid));
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText(target!.firmName);
  });

  test("손상된 members 저장값이 있어도 DB 업체 선택을 초기화함", async ({ page }) => {
    const response = await page.request.get("/api/firm");
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: FirmSummary[] };

    await page.goto("/peak.html");
    await page.evaluate(() => localStorage.setItem("members", "{broken-json"));
    await page.reload();

    const firmSelect = page.locator("#firmSelect");
    await expect(firmSelect.locator("option")).toHaveCount(body.data.length);
    await expect(page.locator("#firmSelect + .select2")).toBeVisible();
  });
});


test.describe("Watt 대시보드 업체 선택 /wattMain.html", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1582, height: 814 });
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("accessToken")) {
        sessionStorage.setItem("accessToken", "e2e-demo");
      }
      if (!localStorage.getItem("fid")) {
        localStorage.setItem("fid", "121");
        localStorage.setItem("firmName", "대산금속");
        // 로그인 응답이 현재 테넌트만 포함해도 대시보드는 DB 업체 목록을 별도로 불러온다.
        localStorage.setItem("members", JSON.stringify([{ fid: 121, name: "대산금속" }]));
      }
    });
  });

  test("상단에서 DB 업체 전체를 스크롤·검색하고 선택함", async ({ page }) => {
    const response = await page.request.get("/api/firm");
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: FirmSummary[] };
    expect(body.data.length).toBeGreaterThan(1_000);

    await page.goto("/wattMain.html");

    const firmSelect = page.locator("#firmSelect");
    await expect(firmSelect.locator("option")).toHaveCount(body.data.length);
    await expect(firmSelect).toHaveValue("121");
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText("대산금속");

    await page.locator("#firmSelect + .select2 .select2-selection").click();
    const results = page.locator(
      ".select2-container--open .select2-results__options",
    );
    await expect(results).toBeVisible();
    const scrollState = await results.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(scrollState.overflowY).toBe("auto");
    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

    const target = body.data.find((firm) => firm.fid !== 121);
    expect(target).toBeDefined();
    await page
      .locator(".select2-container--open .select2-search__field")
      .fill(target!.firmName);
    const targetOption = page
      .locator(".select2-container--open .select2-results__option")
      .getByText(target!.firmName, { exact: true });
    await expect(targetOption).toBeVisible();

    const reloaded = page.waitForEvent("load");
    await targetOption.click();
    await reloaded;
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("fid")))
      .toBe(String(target!.fid));
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("firmName")))
      .toBe(target!.firmName);
    await expect(firmSelect).toHaveValue(String(target!.fid));
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText(target!.firmName);
  });
});
