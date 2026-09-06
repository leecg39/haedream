import { expect, type Page } from "@playwright/test";

export async function loginToFit(
  page: Page,
  username: "admin" | "operator" | "viewer" = "operator",
) {
  await page.goto("/fit/login");
  await page.locator("#authId").fill(username);
  await page.locator("#authPasswd").fill("demo");
  await page.locator("#actLogin").click();
  await expect(page).toHaveURL(/\/fit\/peak$/);
}
