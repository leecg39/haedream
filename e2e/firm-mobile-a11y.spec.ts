import { expect, test, type Page } from "@playwright/test";
import { loginToFit } from "./fit-auth";

async function assertNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function openFirmEditor(page: Page, width: number) {
  if (width <= 768) {
    await page.locator(".firmCardList .firmCard").first().click();
  } else {
    await page.locator("#deskList tr").first().click();
  }
  await expect(page.locator("#modal")).not.toHaveClass(/disable/);
}

/**
 * 공유 e2e DB 를 오염시키지 않도록 신규 생성 대신
 * 기존 합성 업체를 수정→저장→재조회한다.
 */
async function editSaveAndRequery(page: Page, width: number) {
  await openFirmEditor(page, width);
  // 성신금속은 e2e 시드에서 can_view_pii=0 이라 memo 등 PII 는 저장되지 않는다.
  // 비PII 필드(serviceType)로 영속을 검증한다.
  await page.locator("#edit-serviceType").selectOption("2");
  await page.locator("#modalActDone").click();
  await expect(page.locator("#modal")).toHaveClass(/disable/, { timeout: 15_000 });
  await page.reload();
  await page.locator(".firmSearchInput").fill("성신금속");
  if (width <= 768) {
    await expect(page.locator(".firmCardList .firmCardName").filter({ hasText: "성신금속" })).toBeVisible();
  } else {
    await expect(page.locator("#deskList").getByText("성신금속")).toBeVisible();
  }
  await openFirmEditor(page, width);
  await expect(page.locator("#edit-serviceType")).toHaveValue("2");
  await page.locator("#edit-serviceType").selectOption("1");
  await page.locator("#modalActDone").click();
  await expect(page.locator("#modal")).toHaveClass(/disable/, { timeout: 15_000 });
}

test.describe("FIT 업체관리 모바일·접근성", () => {
  for (const width of [360, 390, 768, 1280] as const) {
    test(`${width}px operator 조회→편집→저장→재조회·가로넘침 없음`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 844 });
      await loginToFit(page, "operator");
      await page.goto("/fit/firm");
      await assertNoPageOverflow(page);

      await page.locator(".firmSearchInput").fill("성신금속");
      if (width <= 768) {
        await expect(page.locator(".firmCardList .firmCard").first()).toBeVisible();
        await expect(page.locator(".firmCardList .firmCardName").filter({ hasText: "성신금속" })).toBeVisible();
      } else {
        await expect(page.locator("#deskList").getByText("성신금속")).toBeVisible();
      }

      await editSaveAndRequery(page, width);
      await assertNoPageOverflow(page);

      await openFirmEditor(page, width);
      await page.keyboard.press("Escape");
      await expect(page.locator("#modal")).toHaveClass(/disable/);
      await assertNoPageOverflow(page);
    });
  }

  test("viewer 는 읽기전용이며 추가 버튼이 없다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginToFit(page, "viewer");
    await page.goto("/fit/firm");
    await expect(page.locator(".firmReadonlyNotice")).toBeVisible();
    await expect(page.locator("[data-act='add']")).toHaveCount(0);
    await assertNoPageOverflow(page);
  });

  test("키보드 Enter/Space/Tab/Escape 와 포커스 복귀", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginToFit(page, "operator");
    await page.goto("/fit/firm");

    const add = page.locator("[data-act='add']");
    await add.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    await expect(page.locator("#edit-firmName")).toBeFocused();

    await page.keyboard.press("Tab");
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal")).toHaveClass(/disable/);
    await expect(add).toBeFocused();

    await add.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal")).toHaveClass(/disable/);
  });

  test("데스크톱 1280 회귀: 검색·목록·모달", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await loginToFit(page, "operator");
    await page.goto("/fit/firm");
    await assertNoPageOverflow(page);
    await page.locator(".firmSearchInput").fill("성신금속");
    await expect(page.locator("#deskList tr")).toHaveCount(1);
    await page.locator("[data-act='add']").click();
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    await page.keyboard.press("Escape");
  });
});
