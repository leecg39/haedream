import { expect, test } from "@playwright/test";

test.describe("통합관제 클론", () => {
  test("영상의 핵심 패널과 실제 위성 지도를 렌더링함", async ({ page }) => {
    await page.goto("/fit/stat");

    await expect(page.locator("#contentsArea")).toBeVisible();
    await expect(page.locator(".widget.firmData")).toBeVisible();
    await expect(page.locator(".rightsection")).toBeVisible();
    await expect(page.locator("#map.leaflet-container, #map .leaflet-container").first()).toBeVisible();
    await expect(page.locator("#map")).toHaveAttribute("data-map-state", "ready", { timeout: 20_000 });
    await expect(page.locator("#map .leaflet-tile-loaded").first()).toBeVisible();

    await expect(page.locator("#firmList .dataRow")).toHaveCount(15);
    await expect(page.getByText("참여 업체 수", { exact: true })).toBeVisible();
    await expect(page.getByText("총 누적 절감 금액", { exact: true })).toBeVisible();
    await expect(page.locator("#rankingChart .rankingRow")).toHaveCount(5);
    await expect(page.locator("#cs .alarmItem")).toHaveCount(6);
    await expect(page.locator("#map .leaflet-marker-icon")).toHaveCount(360);
    await expect(page.locator("#map .leaflet-marker-icon.leaflet-interactive")).toHaveCount(360);
    await expect(page.getByText("데모 환경에서는 지도를 불러오지 않습니다.")).toHaveCount(0);
  });

  test("표와 지도 깃발 선택·정렬·상세 팝업·지도 확대가 동작함", async ({ page }) => {
    await page.goto("/fit/stat");
    await expect(page.locator("#map .leaflet-marker-icon")).toHaveCount(360);

    const firstRow = page.locator("#firmList .dataRow").first();
    const firstName = await firstRow.locator(".firmName").textContent();
    await firstRow.click();
    await expect(page.locator("#firmList .dataRow.active")).toHaveCount(1);
    await expect(page.locator("#peakDetailWrap")).toBeVisible();
    await expect(page.locator(".peakDetailFirmName")).toHaveText(firstName ?? "");
    await expect(page.locator("#map .statMapMarker.isSelected")).toHaveCount(1);

    await page.locator(".overlayCloseButton").click();
    await expect(page.locator("#peakDetailWrap")).toBeHidden();

    await page.locator("#orderBy").selectOption("frugalMonthDESC");
    await expect(page.locator("#firmList .dataRow").first()).toContainText("대동중공업 창원2공장");

    await page.locator("#map .leaflet-marker-icon[title='한빛에너지 제1공장']").click();
    await expect(page.locator(".peakDetailFirmName")).toHaveText("한빛에너지 제1공장");

    const before = await page.locator("#map").getAttribute("data-map-zoom");
    await page.locator("#map .leaflet-control-zoom-in").click();
    await expect(page.locator("#map")).not.toHaveAttribute("data-map-zoom", before ?? "");
  });

  test("실시간 값과 기본 목록 순서를 5초 간격으로 갱신함", async ({ page }) => {
    await page.goto("/fit/stat");

    const panel = page.locator(".widget.firmData");
    const rows = page.locator("#firmList .dataRow");
    const initialTick = Number(await panel.getAttribute("data-live-tick"));
    const initialOrder = await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-fid")));
    const initialPowers = await rows.evaluateAll((items) =>
      items.map((item) => item.children.item(3)?.textContent),
    );

    await expect(page.locator(".liveUpdateBadge")).toContainText("LIVE 5s");
    await expect.poll(
      async () => Number(await panel.getAttribute("data-live-tick")),
      { timeout: 7_500 },
    ).toBeGreaterThan(initialTick);

    const updatedOrder = await rows.evaluateAll((items) => items.map((item) => item.getAttribute("data-fid")));
    const updatedPowers = await rows.evaluateAll((items) =>
      items.map((item) => item.children.item(3)?.textContent),
    );
    expect(updatedOrder).not.toEqual(initialOrder);
    expect(updatedPowers).not.toEqual(initialPowers);
    await expect(panel).not.toHaveAttribute("data-live-order", "source");
  });

  test("모바일에서 지도와 패널을 세로 배치하고 상세를 화면 안에 표시함", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fit/stat");

    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator(".widget.firmData")).toBeVisible();
    await expect(page.locator(".rightsection")).toHaveCSS("flex-direction", "column");

    await page.locator("#firmList .dataRow").first().click();
    const detail = page.locator("#peakDetailWrap");
    await expect(detail).toBeVisible();
    const box = await detail.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
