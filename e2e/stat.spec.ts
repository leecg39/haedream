import { expect, test } from "@playwright/test";
import { stubMapTiles } from "./map-stub";

test.describe("통합관제 클론", () => {
  test.beforeEach(async ({ page }) => {
    await stubMapTiles(page);
  });

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
    // 다른 개발 세션과 CPU를 나눠 쓰는 환경에서도 통과하도록 넉넉히 둔다.
    test.setTimeout(120_000);
    await page.goto("/fit/stat");
    await expect(page.locator("#map .leaflet-marker-icon")).toHaveCount(360);

    // 마커는 같은 기지국 좌표에 겹쳐 있어 좌표 클릭이 인접 마커에 가로막힐 수 있어
    // 대상 마커에 클릭 이벤트를 직접 발생시킨다.
    await page
      .locator("#map .leaflet-marker-icon[title='한빛에너지 제1공장']")
      .dispatchEvent("click");
    await expect(page.locator(".peakDetailFirmName")).toHaveText("한빛에너지 제1공장");
    await page.locator(".overlayCloseButton").click();
    await expect(page.locator("#peakDetailWrap")).toBeHidden();

    // 5초 실시간 갱신으로 행이 재정렬되는 순간 클릭이 유실될 수 있어 재시도한다.
    // 선택된 행(.active)은 재정렬돼도 같은 업체를 가리키므로, 선택 후에 이름을 읽는다.
    await expect(async () => {
      await page.locator("#firmList .dataRow").first().click();
      await expect(page.locator("#firmList .dataRow.active")).toHaveCount(1, { timeout: 1_500 });
    }).toPass({ timeout: 15_000 });
    const selectedName = await page
      .locator("#firmList .dataRow.active .firmName")
      .textContent();
    await expect(page.locator("#peakDetailWrap")).toBeVisible();
    await expect(page.locator(".peakDetailFirmName")).toHaveText(selectedName ?? "");
    await expect(page.locator("#map .statMapMarker.isSelected")).toHaveCount(1);

    await page.locator(".overlayCloseButton").click();
    await expect(page.locator("#peakDetailWrap")).toBeHidden();

    await page.locator("#orderBy").selectOption("frugalMonthDESC");
    await expect(page.locator("#firmList .dataRow").first()).toContainText("대동중공업 창원2공장");

    // 줌 컨트롤은 무작위 배치된 마커에 가려질 수 있으므로 휠로 확대한다.
    // 휠 이벤트는 마커 위에서도 지도 컨테이너로 버블링된다.
    const before = await page.locator("#map").getAttribute("data-map-zoom");
    await page.locator("#map").hover({ position: { x: 500, y: 400 } });
    await page.mouse.wheel(0, -800);
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
