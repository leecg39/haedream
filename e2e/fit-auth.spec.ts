import { expect, test } from "@playwright/test";
import { loginToFit } from "./fit-auth";

test.describe("FIT 인증과 권한 경계", () => {
  test("익명 보호 페이지는 로그인으로 이동하고 보호 API는 401이다", async ({ page }) => {
    await page.goto("/fit/peak");
    await expect(page).toHaveURL(/\/fit\/login$/);

    const response = await page.request.get("/api/firm");
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  });

  test("잘못된 로그인은 이동하거나 세션 쿠키를 만들지 않는다", async ({ page }) => {
    await page.goto("/fit/login");
    await page.locator("#authId").fill("operator");
    await page.locator("#authPasswd").fill("wrong-password");
    await page.locator("#actLogin").click();

    await expect(page).toHaveURL(/\/fit\/login$/);
    await expect(page.locator("#toastText")).toContainText("올바르지 않습니다");
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "solar_session")).toBe(false);
  });

  test("정상 로그인은 HttpOnly 세션을 만들고 허가 업체만 조회한다", async ({ page }) => {
    await loginToFit(page, "operator");
    const cookies = await page.context().cookies();
    const session = cookies.find((cookie) => cookie.name === "solar_session");
    expect(session?.httpOnly).toBe(true);

    const response = await page.request.get("/api/firm");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data: Array<{ fid: number }> };
    expect(body.data).toHaveLength(62);
    expect(body.data.some((row) => row.fid === 2_000_000_001)).toBe(true);
    expect(body.data.some((row) => row.fid === 2_000_000_002)).toBe(true);
    expect(body.data.some((row) => row.fid === 1661)).toBe(false);
  });

  test("VIEWER의 malformed 쓰기와 수집 요청은 모두 403이다", async ({ page }) => {
    await loginToFit(page, "viewer");
    await page.goto("/fit/firm");
    await expect(page.locator('[data-act="add"]')).toHaveCount(0);
    const firstFirm = page.locator("#deskList tr").first();
    await firstFirm.click();
    await expect(page.locator("#modal .modalBox")).not.toBeVisible();
    await page.goto("/fit/research");
    await expect(page.locator("#researchRequest")).toHaveCount(0);
    const headers = {
      "content-type": "application/json",
      origin: new URL(page.url()).origin,
    };
    const firm = await page.request.post("/api/firm", {
      headers,
      data: "{malformed",
    });
    expect(firm.status()).toBe(403);

    const collect = await page.request.post("/api/kepco/collect", {
      headers,
      data: "{malformed",
    });
    expect(collect.status()).toBe(403);
  });

  test("로그아웃은 서버 세션을 폐기해 같은 브라우저 API를 401로 만든다", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await loginToFit(page, "operator");
    await page.locator(".tb-logout a").click();
    await expect(page).toHaveURL(/\/fit\/login$/);
    const response = await page.request.get("/api/firm");
    expect(response.status()).toBe(401);
  });

  test("공개 firm.html은 익명 401 뒤에 업체 원문을 우회 렌더링하지 않는다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/firm.html");
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
    await expect(page.locator("body")).toHaveAttribute("data-firm-auth-required", "true");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(0);
    await expect(page.locator("#deskLimit")).toHaveText("0 - 0 / 0");
    await expect(page.getByRole("alert")).toContainText("로그인");
    await expect(page.locator('[data-act="add"]')).toHaveAttribute("aria-disabled", "true");
    await page.locator('[data-act="add"]').dispatchEvent("click");
    await expect(page.locator("#modal .modalBox")).not.toBeVisible();
  });

  test("VIEWER는 정적 firm.html에서도 로컬 편집 성공 UX를 사용할 수 없다", async ({ page }) => {
    await loginToFit(page, "viewer");
    await page.goto("/firm.html");
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
    await expect(page.locator('[data-act="add"]')).toHaveAttribute("aria-disabled", "true");
    await page.locator("#deskList tr[data-fid]").first().dispatchEvent("click");
    await expect(page.locator("#modal .modalBox")).not.toBeVisible();
  });

  test("정적 firm.html 로그아웃도 서버 세션을 폐기한다", async ({ page }) => {
    await loginToFit(page, "operator");
    await page.goto("/firm.html");
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
    await page.locator("#appLogout a").click();
    await expect(page).toHaveURL(/\/login\.html$/);
    const response = await page.request.get("/api/firm");
    expect(response.status()).toBe(401);
  });

  test("익명 ABC 화면은 공통 로그인으로 이동하고 허가 업체만 직렬화한다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/abc/user");
    await expect(page).toHaveURL(/\/$/);

    await loginToFit(page, "operator");
    const response = await page.goto("/abc/user");
    expect(response?.status()).toBe(200);
    await page.locator("#firmSelect").click();
    await expect(page.getByRole("option")).toHaveCount(62);
    const html = await page.content();
    expect(html).not.toContain("(주)알앤텍_2");
    expect(html).not.toContain('value="1661"');
  });
});
