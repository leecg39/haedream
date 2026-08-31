import { expect, test } from "@playwright/test";
import { stubMapTiles } from "./map-stub";

test.describe("Watt 통합관제 /stat.html", () => {
  test.beforeEach(async ({ page }) => {
    await stubMapTiles(page);
    await page.setViewportSize({ width: 2032, height: 1162 });
    await page.goto("/stat.html");
    await expect(page.locator("body")).toHaveAttribute("data-stat-demo-ready", "true");
    await expect(page.locator("#map")).toHaveAttribute("data-map-ready", "true");
    await expect(page.locator("#map .wattDemoMarkerHost").first()).toBeAttached();
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
    const total = counters
      .map((value) => Number(value.replace(/[^\d.-]/g, "")))
      .reduce((sum, value) => sum + value, 0);
    expect(total).toBeGreaterThan(0);
  });

  test("왼쪽 대시보드 카테고리의 시각·접근성 상태를 함께 전환함", async ({ page }) => {
    const dashboardCategory = page.locator("#navigation #main");
    const dashboardToggle = dashboardCategory.locator(":scope > a");
    const dashboardSubmenu = dashboardCategory.locator(":scope > .d2Nav");

    await expect(dashboardToggle).toHaveAttribute("aria-controls", "main-submenu");
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "false");
    await expect(dashboardSubmenu).toBeHidden();

    await dashboardToggle.click();

    await expect(dashboardCategory).toHaveClass(/\bactive\b/);
    await expect(page.locator("#stat")).not.toHaveClass(/\bactive\b/);
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "true");
    await expect(dashboardSubmenu).toBeVisible();
    await expect(dashboardSubmenu.getByRole("link")).toHaveText([
      "대시보드 위젯",
      "대시보드 전력메인",
      "태양광 대시보드",
    ]);

    await dashboardToggle.click();

    await expect(dashboardCategory).not.toHaveClass(/\bactive\b/);
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "false");
    await expect(dashboardSubmenu).toBeHidden();
  });

  test("업체 검색·상태 필터·정렬·초기화가 동작함", async ({ page }) => {
    await page.locator("#inputFirmName").fill("농협");
    const searchedRows = page.locator("#dataList .firmListDataRow.active");
    await expect.poll(() => searchedRows.count()).toBeGreaterThan(0);
    const searchedNames = await searchedRows.locator(".firmListfirmName").allTextContents();
    expect(searchedNames.every((name) => name.includes("농협"))).toBe(true);

    await page.locator(".filterButtons.reset").click();
    await expect(page.locator("#inputFirmName")).toHaveValue("");

    await page.locator("label:has(#inputEmergency)").click();
    await expect(page.locator("#inputEmergency")).toBeChecked();
    const emergencyRows = page.locator("#dataList .firmListDataRow.active");
    await expect.poll(() => emergencyRows.count()).toBeGreaterThan(0);
    const emergencyMarkers = await emergencyRows.evaluateAll((rows) =>
      rows.map((row) => row.firstElementChild?.className.startsWith("exclamation") ?? false),
    );
    expect(emergencyMarkers.every(Boolean)).toBe(true);

    await page.locator(".filterButtons.reset").click();
    await page.locator("#selectOrderBy").selectOption("kepcoRatio-1");
    const accuracies = await page.locator("#dataList .firmListDataRow.active").evaluateAll((rows) =>
      rows.map((row) => Number(row.children.item(9)?.children.item(0)?.textContent)),
    );
    expect(accuracies).toEqual([...accuracies].sort((a, b) => a - b));
  });

  test("업체 행과 지도 마커 상세, 지도 줌·이동, 환경설정 메뉴가 동작함", async ({ page }) => {
    const map = page.locator("#map");
    const panCount = async () => Number(await map.getAttribute("data-map-moved") ?? 0);

    // 마커는 겹쳐 있을 수 있어 좌표 클릭 대신 대상 마커에 직접 클릭 이벤트를 발생시킨다.
    await page.locator("#map .wattDemoMarkerHost").nth(20).dispatchEvent("click");
    await expect(page.locator(".wattCompanyPopup .mapFirmCard")).toBeVisible();
    await page.locator(".leaflet-popup-close-button").click();

    // 5초 실시간 갱신으로 행이 다시 그려지는 순간 클릭이 유실될 수 있어 재시도한다.
    const movedBeforeRow = await panCount();
    await expect(async () => {
      await page.locator("#dataList .firmListDataRow.active").first().click();
      await expect(page.locator("#dataList .firmListDataRow.selected")).toHaveCount(1, {
        timeout: 1_500,
      });
    }).toPass({ timeout: 15_000 });
    // Leaflet 은 팝업 닫힘 때 200ms 페이드 후 DOM 을 제거한다(fadeAnimation).
    // 페이드 중에는 닫힌 팝업도 visible 로 잡히므로 수량이 1개가 될 때까지 기다린다.
    await expect(page.locator(".wattCompanyPopup .mapFirmCard")).toHaveCount(1);
    await expect(page.locator(".wattCompanyPopup .mapFirmCard")).toBeVisible();

    // flyTo가 끝나 지도가 멈춘 뒤에 줌·드래그를 진행한다.
    await expect.poll(panCount).toBeGreaterThan(movedBeforeRow);
    await page.locator(".leaflet-popup-close-button").click();

    const zoomBefore = Number(await map.getAttribute("data-map-zoom"));
    await map.hover({ position: { x: 1150, y: 520 } });
    await page.mouse.wheel(0, -800);
    await expect.poll(async () => Number(await map.getAttribute("data-map-zoom"))).toBeGreaterThan(zoomBefore);
    const movedBeforeDrag = await panCount();
    await page.mouse.move(1350, 550);
    await page.mouse.down();
    await page.mouse.move(1450, 640, { steps: 8 });
    await page.mouse.up();
    await expect.poll(panCount).toBeGreaterThan(movedBeforeDrag);

    await page.locator(".tb-set > a").click();
    const settings = page.locator(".tbSetNav");
    await expect(settings).toBeVisible();
    await expect(settings.locator("a")).toHaveCount(11);
    const widgetSettings = settings.locator("a").first();
    await expect(widgetSettings).toHaveAttribute("href", "/abc/widget-set");
    await widgetSettings.click();
    await expect(page).toHaveURL(/\/abc\/widget-set$/);
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
