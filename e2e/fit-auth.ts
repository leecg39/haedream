import { expect, type Page } from "@playwright/test";

export async function loginToFit(
  page: Page,
  username: "admin" | "operator" | "viewer" = "operator",
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/fit/login");
    await page.locator("#authId").fill(username);
    await page.locator("#authPasswd").fill("demo");
    await expect(page.locator("#authId")).toHaveValue(username);
    await expect(page.locator("#authPasswd")).toHaveValue("demo");
    await expect(page.locator("#actLogin")).toBeEnabled();

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/tokens") &&
        response.request().method() === "POST",
    );
    await page.locator("#actLogin").click();
    const loginResponse = await loginResponsePromise;

    if (loginResponse.ok()) {
      await page.waitForURL(/\/fit\/peak$/, { timeout: 30_000 });
      // 정적 Watt 페이지(base.js)는 아직 sessionStorage accessToken 을 본다.
      await page.evaluate(() => {
        sessionStorage.setItem("accessToken", "fit-session");
      });
      return;
    }

    if (loginResponse.status() === 429 && attempt < 3) {
      await page.waitForTimeout(1_500 * attempt);
      continue;
    }

    const payload = (await loginResponse.json().catch(() => null)) as
      | { error?: { message?: string }; msg?: string }
      | null;
    throw new Error(
      `FIT 로그인 실패: HTTP ${loginResponse.status()} ${
        payload?.error?.message ?? payload?.msg ?? loginResponse.statusText()
      }`,
    );
  }
}
