import { expect, test, type Page } from "@playwright/test";
import { loginToFit } from "./fit-auth";

async function assertNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("FIT 업체관리 모바일·접근성", () => {
  for (const width of [360, 390, 768, 1280] as const) {
    test(`${width}px에서 검색·편집 모달·Escape 닫기가 동작함`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width, height: 844 });
      await loginToFit(page, "operator");
      await page.goto("/fit/firm");
      await assertNoPageOverflow(page);

      await page.locator(".firmSearchInput").fill("성신금속");
      await expect(page.locator("#deskList tr")).toHaveCount(1);

      if (width <= 768) {
        await expect(page.locator(".firmCardList .firmCard").first()).toBeVisible();
      }

      await page.locator("[data-act='add']").click();
      await expect(page.locator("#modal")).not.toHaveClass(/disable/);
      await expect(page.locator("#edit-firmName")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.locator("#modal")).toHaveClass(/disable/);
      await assertNoPageOverflow(page);
    });
  }

  test("키보드만으로 추가 모달을 열고 Escape 로 닫을 수 있음", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginToFit(page, "operator");
    await page.goto("/fit/firm");
    await page.locator("[data-act='add']").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    await expect(page.locator("#edit-firmName")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal")).toHaveClass(/disable/);
  });
});
