import { expect, test, type Page } from "@playwright/test";

const eggfitSettings = [
  ["사용자관리", "/fit/user"],
  ["알람설정", "/fit/notify"],
  ["게이트웨이 관리", "/fit/gate-node"],
  ["복합제어기 관리", "/fit/gateway"],
  ["시퀀스제어", "/fit/sequence"],
  ["RTU관리", "/fit/gate-rtu"],
  ["모드버스 계측", "/fit/device"],
  ["실시간데이터", "/fit/net"],
  ["통신상태 불량", "/fit/bad"],
] as const;

// 정적 ABC 페이지(stat/firm/main.html)의 환경설정 메뉴는 10개 전부 ABC 셸
// (/abc/*)로만 연결된다 — 에그핏(/fit/*) 페이지와 교차 링크하지 않는다.
const rootSettings = [
  ["대시보드 화면설정", "/abc/widget-set"],
  ["사용자관리", "/abc/user"],
  ["알람설정", "/abc/notify"],
  ["게이트웨이 관리", "/abc/gate-node"],
  ["복합제어기 관리", "/abc/gateway"],
  ["시퀀스제어", "/abc/sequence"],
  ["RTU관리", "/abc/gate-rtu"],
  ["모드버스 계측", "/abc/device"],
  ["실시간데이터", "/abc/net"],
  ["통신상태 불량", "/abc/bad"],
] as const;

// 병렬 실행 중 하이드레이션이 늦어 첫 클릭이 유실될 수 있어,
// 열릴 때까지 재시도한다. .tb-set 의 onClick 은 openSettings 단방향이라 안전하다.
async function openSettingsMenu(page: Page) {
  const button = page.locator(".tb-set");
  const nav = page.locator(".tbSetNav");
  await expect(async () => {
    await button.click();
    await expect(nav).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 15_000 });
}

test.describe("EggFit 환경설정 셸 유지", () => {
  test("환경설정 9개 항목이 모두 /fit 내부 EggFit 셸로 이동함", async ({ page }) => {
    // 9개 페이지를 순회하므로 병렬 부하를 고려해 넉넉한 제한을 둔다.
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1904, height: 913 });

    for (const [label, path] of eggfitSettings) {
      await page.goto("/fit/peak");
      await openSettingsMenu(page);

      const link = page.locator(".tbSetNav").getByRole("link", {
        name: label,
        exact: true,
      });
      await expect(link).toHaveAttribute("href", path);
      await link.click();

      await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
      await expect(page.locator("#platformLogo")).toBeVisible();
      await expect(page.locator("#platformLogo")).toHaveAttribute(
        "src",
        "/fit/assets/img/egfit_top_logo.svg",
      );
      await expect(page.locator("#navigation")).toBeVisible();
      await expect(page.locator('nav[aria-label="WATT 주요 메뉴"]')).toHaveCount(0);
      await expect(page.getByRole("img", { name: "ABC EMS Platform" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "도움말", exact: true })).toHaveCount(0);

      await openSettingsMenu(page);
      const menuHrefs = await page.locator(".tbSetNav a").evaluateAll((links) =>
        links.map((link) => link.getAttribute("href")),
      );
      expect(menuHrefs).toHaveLength(eggfitSettings.length);
      expect(menuHrefs.every((href) => href?.startsWith("/fit/"))).toBe(true);
    }
  });

  test("root 대시보드 환경설정 메뉴도 404 없이 각 플랫폼 화면으로 이동함", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const rootPages = ["/stat.html", "/firm.html", "/main.html"] as const;

    for (const rootPage of rootPages) {
      await page.goto(rootPage);
      const menu = page.locator("#topBar .tbSetNav");
      await expect(menu.locator('a[href="/abc/widget-set"]')).toBeAttached();

      const settingsLinks = menu.locator('a[href^="/abc/"]');
      await expect(settingsLinks).toHaveCount(rootSettings.length);
      // ABC 메뉴는 에그핏(/fit/*)으로 연결되는 항목이 하나도 없어야 한다.
      await expect(menu.locator('a[href^="/fit/"]')).toHaveCount(0);

      for (const [label, path] of rootSettings) {
        const link = menu.locator(`a[href="${path}"]`).filter({ hasText: label });
        await expect(link).toHaveCount(1);
        const response = await request.get(path);
        expect(response.status(), `${rootPage} → ${path}`).toBe(200);
      }
    }
  });

  test("대시보드 화면설정은 /widget-set ABC EMS 셸에서 동작함", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/widget-set");

    await expect(page).toHaveURL(/\/widget-set$/);
    await expect(
      page.getByRole("heading", { name: "대시보드 화면설정", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: "ABC EMS Platform" })).toBeVisible();
    await expect(page.locator('nav[aria-label="WATT 주요 메뉴"]')).toBeVisible();
    await expect(page.locator("#platformLogo")).toHaveCount(0);

    await page.getByLabel("1줄에 보여질 위젯 갯수").selectOption("4");
    await page.getByRole("button", { name: "설정 저장" }).click();
    await expect(page.getByRole("status")).toContainText("저장");

    await page.goto("/fit/widget-set");
    await expect(page).toHaveURL(/\/widget-set$/);
  });
});
