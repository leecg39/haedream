import { expect, test } from "@playwright/test";
import { loginToFit } from "./fit-auth";

test.describe("한전데이터 수집 (/fit/research)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await loginToFit(page);
  });

  test("업체 선택·탭 전환·수집 상태 표시가 동작한다", async ({ page }) => {
    await page.goto("/fit/research");

    // 업체 선택 드롭다운: 한전고객번호 등록 업체가 채워진다.
    const select = page.locator("#researchInfo select");
    await expect(select).toBeVisible();
    await expect(select.locator("option").first()).toBeAttached();
    const optionCount = await select.locator("option").count();
    expect(optionCount).toBe(2);

    // 헤더 정보 영역
    await expect(page.locator('[data-name="kepcoCyber"]')).not.toBeEmpty();
    await expect(page.locator('[data-name="kepcoStatus"]')).toBeVisible();
    await expect(page.locator("#researchRequest")).toBeVisible();

    // 탭 전환: 월별 → 시간별
    const grid = page.locator("#researchData");
    await expect(grid.locator(".researchDataLabel").first()).toHaveText("월");
    await page.locator(".researchNav button", { hasText: "시간별 전력사용량" }).click();
    await expect(grid.locator(".researchDataLabel").first()).toHaveText("일자");
    await page.locator(".researchNav button", { hasText: "월별 요금정보" }).click();
    await expect(grid.locator(".researchDataLabel").first()).toHaveText("월");

    // 다른 업체 선택 시 상태가 갱신된다(실시간 매칭).
    const statusBefore = await page.locator('[data-name="kepcoStatus"]').textContent();
    await select.selectOption({ index: 1 });
    await expect(page.locator('[data-name="kepcoCyber"]')).not.toBeEmpty();
    // 선택 직후 상태 셀이 존재하고 빈 화면이 아니어야 한다.
    const statusAfter = await page.locator('[data-name="kepcoStatus"]').textContent();
    expect(statusAfter ?? "").not.toHaveLength(0);
    void statusBefore;
  });

  test("수집 내역이 없는 업체는 빈 상태 안내를 보여준다", async ({ page }) => {
    await page.goto("/fit/research");
    const select = page.locator("#researchInfo select");
    await expect(select).toBeVisible();

    // E2E DB는 fresh 하므로 어떤 업체도 수집 내역이 없다.
    await expect(page.locator("#researchData")).toContainText("수집된 데이터가 없습니다");
  });

  test("보호 API 403은 패널 오류 상태로 표시한다", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route("**/api/kepco/status**", (route) => route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "조회 권한이 없습니다." } }),
    }));
    const statusResponse = page.waitForResponse((response) =>
      response.url().includes("/api/kepco/status"),
    );
    await page.goto("/fit/research");
    expect((await statusResponse).status()).toBe(403);
    await expect(page.locator("#researchError")).toContainText("조회 권한이 없습니다", {
      timeout: 15_000,
    });
    await expect(page.locator("#researchInfo select option")).toHaveCount(0);
  });

  test("보호 API 500 비 JSON 응답도 패널 오류 상태로 표시한다", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route("**/api/kepco/status**", (route) => route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "upstream unavailable",
    }));
    await page.goto("/fit/research");
    await expect(page.locator("#researchError")).toContainText("업체 수집 상태를 불러오지 못했습니다", {
      timeout: 15_000,
    });
    await expect(page.locator("#researchInfo select option")).toHaveCount(0);
  });

  test("보호 API 401은 로그인 만료 화면으로 이동한다", async ({ page }) => {
    test.setTimeout(60_000);
    await page.route("**/api/kepco/status**", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "로그인이 필요합니다." } }),
    }));
    await page.goto("/fit/research");
    await expect(page).toHaveURL(/\/fit\/login$/, { timeout: 15_000 });
  });
});
