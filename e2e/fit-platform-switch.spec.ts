import { expect, test } from "@playwright/test";

test.describe("플랫폼 전환 드롭다운", () => {
  // 1340px 이하에서는 leftNav가 숨겨지므로 데스크톱 뷰포트를 사용한다.
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
  });

  test("에그핏 셸에서 상단 로고 드롭다운으로 두 플랫폼을 오감", async ({ page }) => {
    await page.goto("/fit/peak");

    // 하단 로고 버튼은 제거됐다.
    await expect(page.locator(".eggOnLogo")).toHaveCount(0);

    const button = page.getByRole("button", { name: "플랫폼 선택" });
    await expect(button).toBeVisible();
    await expect(button.locator("#platformLogo")).toHaveAttribute(
      "src",
      "/fit/assets/img/egfit_top_logo.svg",
    );

    await button.click();
    const menu = page.locator(".platformSwitchMenu");
    await expect(menu).toBeVisible();
    const abc = menu.getByRole("link", { name: "ABC EMS PLATFORM" });
    const egfit = menu.getByRole("link", { name: "에그핏" });
    await expect(abc).toHaveAttribute("href", "/main.html");
    await expect(egfit).toHaveAttribute("href", "/fit/peak");
    await expect(egfit).toHaveAttribute("aria-current", "page");

    // Escape 로 닫힌다.
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);

    // ABC EMS PLATFORM 선택 시 ABC 셸의 메인으로 이동한다.
    await button.click();
    await menu.getByRole("link", { name: "ABC EMS PLATFORM" }).click();
    await expect(page).toHaveURL(/\/(main|login)\.html$/);
  });

  test("ABC 셸에서도 동일한 드롭다운으로 에그핏으로 전환됨", async ({ page }) => {
    await page.goto("/widget-set");

    await expect(page.locator(".eggFitLogo")).toHaveCount(0);
    await expect(page.locator("#platformLogo")).toHaveCount(0);

    const button = page.getByRole("button", { name: "플랫폼 선택" });
    await expect(
      button.getByRole("img", { name: "ABC EMS Platform" }),
    ).toBeVisible();

    await button.click();
    const menu = page.locator(".platformSwitchMenu");
    await expect(menu.getByRole("link", { name: "ABC EMS PLATFORM" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await menu.getByRole("link", { name: "에그핏" }).click();
    await expect(page).toHaveURL(/\/fit\/peak$/);
    await expect(page.locator("#platformLogo")).toBeVisible();
  });
});
