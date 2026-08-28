import { expect, test } from "@playwright/test";

test.describe("통합관제 클론", () => {
  test("원본 통합관제의 핵심 영역과 상호작용을 렌더링함", async ({ page }) => {
    await page.goto("/fit/stat");

    await expect(page.locator("#contentsArea")).toBeVisible();
    await expect(page.locator(".controlCenterGrid")).toBeVisible();
    await expect(page.locator(".peakRealTime")).toBeVisible();
    await expect(page.locator("#map")).toBeVisible();
    await expect(page.locator(".firmList")).toBeVisible();
    await expect(page.locator(".peakHistory")).toBeVisible();
    await expect(page.locator(".chargeReduction")).toBeVisible();
    await expect(page.locator(".firmStatus")).toBeVisible();

    await expect(page.getByPlaceholder("업체명 검색")).toBeVisible();
    await expect(page.getByLabel("피크초과")).toBeVisible();
    await expect(page.getByLabel("피크근접")).toBeVisible();
    await expect(page.getByLabel("제어중")).toBeVisible();
    await expect(page.getByLabel("긴급")).toBeVisible();
    await expect(page.getByLabel("검토")).toBeVisible();
    await expect(page.getByRole("button", { name: "초기화" })).toBeVisible();
    await expect(page.getByLabel("정렬")).toBeVisible();

    await expect(page.locator(".firmListDataRow.active")).toHaveCount(15);
    await expect(page.locator("#peakHistory .dataRow")).toHaveCount(5);
    await expect(page.locator("#peakRank .chargeReductionDataRow")).toHaveCount(5);
  });

  test("업체 검색·필터·정렬·상세 오버레이가 동작함", async ({ page }) => {
    await page.goto("/fit/stat");

    await page.getByPlaceholder("업체명 검색").fill("대동중공업");
    await expect(page.locator(".firmListDataRow.active")).toHaveCount(1);
    await expect(page.locator(".firmListDataRow.active")).toContainText("대동중공업 창원2공장");

    await page.getByLabel("피크초과").check();
    await expect(page.locator(".firmListDataRow.active")).toHaveCount(1);
    await page.getByRole("button", { name: "초기화" }).click();
    await expect(page.locator(".firmListDataRow.active")).toHaveCount(15);

    await page.getByLabel("정렬").selectOption("peakRatio-0");
    await expect(page.locator(".firmListDataRow.active").first()).toContainText("대동중공업 창원2공장");

    await page.locator(".firmListDataRow.active").first().click();
    await expect(page.locator("#peakDetailWrap")).toBeVisible();
    await expect(page.locator(".peakDetailFirmName")).toHaveText("대동중공업 창원2공장");
    await expect(page.locator(".peakDetailRow")).toHaveCount(6);
    await page.locator(".overlayCloseButton").dispatchEvent("click");
    await expect(page.locator("#peakDetailWrap")).toHaveCount(0);
  });

  test("모바일에서 원본처럼 핵심 열만 유지하고 가로 스크롤을 제공함", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fit/stat");

    await expect(page.locator(".controlCenterGrid")).toBeVisible();
    await expect(page.locator(".firmListHeader")).toBeVisible();
    await expect(page.locator(".firmListHeader")).toContainText("업체명");
    await expect(page.locator(".firmListHeader")).toContainText("피크상태");
    await expect(page.locator(".firmListHeader")).toContainText("정확도");

    const list = page.locator(".firmList .kfeContent");
    await expect(list).toHaveCSS("overflow-x", "auto");
  });
});
