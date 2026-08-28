import { expect, test } from "@playwright/test";

test.describe("Watt 통합관제 /stat.html", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 2032, height: 1162 });
    await page.goto("/stat.html");
    await expect(page.locator("body")).toHaveAttribute("data-stat-demo-ready", "true");
  });

  test("로그인 리다이렉트 없이 영상의 전체 패널과 고밀도 지도를 렌더링함", async ({ page }) => {
    await expect(page).toHaveURL(/\/stat\.html$/);
    await expect(page).toHaveTitle("통합관제");
    await expect(page.locator("#leftnav .leftNav")).toBeVisible();
    await expect(page.locator("#topBar .topRightArea")).toBeVisible();
    await expect(page.locator("#stat")).toHaveClass(/active/);
    await expect(page.locator("#contentsArea")).toBeVisible();

    await expect(page.locator("#map")).toHaveAttribute("data-map-ready", "true");
    await expect(page.locator("#map .wattDemoMarkerHost")).toHaveCount(480);
    await expect(page.locator("#dataList .firmListDataRow.active")).toHaveCount(10);
    await expect(page.locator("#realTimeCountWrap .countValue")).toHaveCount(8);
    await expect(page.locator("#peakHistory .dataRow")).toHaveCount(5);
    await expect(page.locator("#peakRank > :not(.disable)")).toHaveCount(5);
    await expect(page.locator("#networkStatusCircleText")).toHaveText("98%");

    const counters = await page.locator("#realTimeCountWrap .countValue").allTextContents();
    expect(counters.map(Number).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(0);
  });

  test("업체 검색·상태 필터·정렬·초기화가 동작함", async ({ page }) => {
    await page.locator("#inputFirmName").fill("농협");
    const searchedRows = page.locator("#dataList .firmListDataRow.active");
    await expect(searchedRows).toHaveCount(10);
    const searchedNames = await searchedRows.locator(".firmListfirmName").allTextContents();
    expect(searchedNames.every((name) => name.includes("농협"))).toBe(true);

    await page.locator(".filterButtons.reset").click();
    await expect(page.locator("#inputFirmName")).toHaveValue("");

    await page.locator("label:has(#inputEmergency)").click();
    await expect(page.locator("#inputEmergency")).toBeChecked();
    await expect(page.locator("#dataList .firmListDataRow.active")).toHaveCount(4);

    await page.locator(".filterButtons.reset").click();
    await page.locator("#selectOrderBy").selectOption("kepcoRatio-1");
    const accuracies = await page.locator("#dataList .firmListDataRow.active").evaluateAll((rows) =>
      rows.map((row) => Number(row.children.item(9)?.children.item(0)?.textContent)),
    );
    expect(accuracies).toEqual([...accuracies].sort((a, b) => a - b));
  });

  test("업체 행과 지도 마커 상세, 지도 줌·이동, 환경설정 메뉴가 동작함", async ({ page }) => {
    const firstRow = page.locator("#dataList .firmListDataRow.active").first();
    const firstId = await firstRow.getAttribute("data-firm-id");
    await firstRow.click();
    await expect(page.locator(".wattCompanyPopup .mapFirmCard")).toBeVisible();
    await expect(page.locator("#dataList .firmListDataRow.selected")).toHaveAttribute(
      "data-firm-id",
      firstId ?? "",
    );

    await page.locator(".leaflet-popup-close-button").click();
    await page.locator("#map .wattDemoMarkerHost").nth(20).click({ force: true });
    await expect(page.locator(".wattCompanyPopup .mapFirmCard")).toBeVisible();

    const map = page.locator("#map");
    const zoomBefore = Number(await map.getAttribute("data-map-zoom"));
    await map.hover({ position: { x: 1150, y: 520 } });
    await page.mouse.wheel(0, -800);
    await expect.poll(async () => Number(await map.getAttribute("data-map-zoom"))).toBeGreaterThan(zoomBefore);
    await page.mouse.move(1350, 550);
    await page.mouse.down();
    await page.mouse.move(1450, 640, { steps: 8 });
    await page.mouse.up();
    await expect(map).toHaveAttribute("data-map-moved", "true");

    await page.locator(".tb-set > a").click();
    const settings = page.locator(".tbSetNav");
    await expect(settings).toBeVisible();
    await expect(settings.locator("a")).toHaveCount(11);
    const widgetSettings = settings.locator("a").first();
    await expect(widgetSettings).toHaveAttribute("href", "/fit/widget-set");
    await widgetSettings.click();
    await expect(page).toHaveURL(/\/fit\/widget-set$/);
    await expect(page.getByRole("heading", { name: "대시보드 화면설정" })).toBeVisible();
    await page.goBack();
    await expect(page.locator("body")).toHaveAttribute("data-stat-demo-ready", "true");
  });

  test("5초마다 실시간 업체 전력 데이터를 갱신함", async ({ page }) => {
    const firstPower = page.locator("#dataList .firmListDataRow.active").first().locator(".firmListPeakWatt");
    const initialPower = await firstPower.textContent();
    const initialTick = Number(await page.locator("body").getAttribute("data-live-tick") ?? 0);

    await expect.poll(
      async () => Number(await page.locator("body").getAttribute("data-live-tick") ?? 0),
      { timeout: 7_500 },
    ).toBeGreaterThan(initialTick);
    await expect(firstPower).not.toHaveText(initialPower ?? "");
  });
});
