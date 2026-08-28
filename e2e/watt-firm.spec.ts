import { expect, test } from "@playwright/test";

test.describe("Watt 업체관리 /firm.html", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/firm.html");
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
  });

  test("로그인 리다이렉트 없이 영상의 1,654건 업체관리 화면을 렌더링함", async ({ page }) => {
    await expect(page).toHaveURL(/\/firm\.html$/);
    await expect(page).toHaveTitle("업체관리");
    await expect(page.locator("#leftnav .leftNav")).toBeVisible();
    await expect(page.locator("#topBar .topRightArea")).toBeVisible();
    await expect(page.locator("#firm")).toHaveClass(/active/);
    await expect(page.locator("#contentsArea")).toBeVisible();
    await expect(page.locator("#deskLimit")).toHaveText("1 - 50 / 1,654");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(50);

    const first = page.locator("#deskList tr[data-fid]").first();
    await expect(first.locator("td").nth(0)).toHaveText("1661");
    await expect(first.locator("td").nth(1)).toHaveText("(주)알앤텍_2");
    await expect(first.locator("td").nth(2)).toHaveText("IGL1");
    await expect(first.locator("td").nth(3)).toHaveText("0927031098");
    await expect(page.locator("#chargeLink")).toHaveAttribute("href", "/fit/rate-plan");
    await expect(page.locator("#researchLink")).toHaveAttribute("href", "/fit/research");
  });

  test("검색·서비스 필터·정렬·50건 페이지 이동이 동작함", async ({ page }) => {
    await page.locator("#deskInput").fill("성신금속");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(1);
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("성신금속");
    await expect(page.locator("#deskLimit")).toHaveText("1 - 1 / 1");

    await page.locator("#deskInput").fill("");
    await page.locator("#serviceType").selectOption("3");
    const lowRows = page.locator("#deskList tr[data-fid]");
    await expect(lowRows).toHaveCount(50);
    expect(await lowRows.evaluateAll((rows) => rows.every((row) => row.children.item(11)?.textContent === "저압"))).toBe(true);

    await page.locator("#serviceType").selectOption("0");
    await page.locator("#deskSort th[data-sort='fid']").click();
    const ids = await page.locator("#deskList tr[data-fid]").evaluateAll((rows) =>
      rows.map((row) => Number(row.children.item(0)?.textContent)),
    );
    expect(ids).toEqual([...ids].sort((a, b) => a - b));

    await page.locator("#deskPages .deskPage").filter({ hasText: /^2$/ }).click();
    await expect(page.locator("#deskLimit")).toHaveText("51 - 100 / 1,654");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(50);
  });

  test("추가·수정·취소 업체관리 모달이 영상 크기와 필드 구성을 유지함", async ({ page }) => {
    await page.locator("[data-act='add']").click();
    const modalBox = page.locator("#modal .modalBox");
    await expect(modalBox).toBeVisible();
    await expect(page.locator("#modal .editTitle")).toHaveText("업체관리");
    await expect(page.locator("#modal .editForm input, #modal .editForm select")).toHaveCount(28);
    const contentBox = await page.locator("#modal .modalContent").boundingBox();
    expect(contentBox).not.toBeNull();
    expect(contentBox!.width).toBeGreaterThanOrEqual(820);
    expect(contentBox!.width).toBeLessThanOrEqual(840);

    await page.locator("#edit-firmName").fill("QA 테스트 업체");
    await page.locator("#edit-contract").selectOption("IGL1");
    await page.locator("#edit-kepcoNo").fill("1234567890");
    await page.locator("#edit-bone").fill("QAEMS01");
    await page.locator("#edit-manager").fill("김테스트");
    await page.locator("#edit-serviceType").selectOption("1");
    await page.locator("#modalActDone").click();
    await expect(modalBox).toBeHidden();
    await expect(page.locator(".firmDemoToast")).toContainText("확인 되었습니다.");

    await page.locator("#deskInput").fill("QA 테스트 업체");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(1);
    const added = page.locator("#deskList tr[data-fid]").first();
    await expect(added).toContainText("1234567890");
    await added.click();
    await expect(page.locator("#edit-firmName")).toHaveValue("QA 테스트 업체");
    await page.locator("#edit-memo").fill("수정 확인");
    await page.locator("#modalActDone").click();
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("수정 확인");

    await page.locator("#deskList tr[data-fid]").first().click();
    await page.locator("#edit-firmName").fill("취소된 이름");
    await page.locator("#modalActCancel").click();
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("QA 테스트 업체");
  });

  test("엑셀·인쇄와 요금표·한전수집 화면 이동이 동작함", async ({ page, context }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.locator("[data-act='excel']").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("업체관리.xlsx");
    await expect.poll(async () => Boolean(await download.path())).toBe(true);

    await page.evaluate(() => {
      window.print = () => { document.body.dataset.printCalled = "true"; };
    });
    await page.locator("[data-act='print']").click();
    await expect(page.locator("body")).toHaveAttribute("data-print-called", "true");
    await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");

    const ratePagePromise = context.waitForEvent("page");
    await page.locator("#chargeLink").click();
    const ratePage = await ratePagePromise;
    await ratePage.waitForLoadState("domcontentloaded");
    await expect(ratePage).toHaveURL(/\/fit\/rate-plan$/);
    await expect(ratePage.getByRole("heading", { name: "전기 요금 비교" })).toBeVisible();
    await ratePage.close();

    const researchPagePromise = context.waitForEvent("page");
    await page.locator("#researchLink").click();
    const researchPage = await researchPagePromise;
    await researchPage.waitForLoadState("domcontentloaded");
    await expect(researchPage).toHaveURL(/\/fit\/research$/);
    await expect(researchPage.getByRole("heading", { name: "한전데이터 수집" })).toBeVisible();
    await researchPage.close();
  });
});

test.describe("/fit/firm steering", () => {
  test("편집 팝업 가로 폭을 1904px 뷰포트의 1/3로 표시함", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");
    await page.locator("[data-act='add']").click();
    const modalBox = await page.locator("#modal .modalBox").boundingBox();
    const modalContent = await page.locator("#modal .modalContent").boundingBox();
    expect(modalBox).not.toBeNull();
    expect(modalContent).not.toBeNull();
    expect(modalBox!.width).toBeGreaterThanOrEqual(625);
    expect(modalBox!.width).toBeLessThanOrEqual(645);
    expect(modalContent!.width).toBeGreaterThanOrEqual(620);
    expect(modalContent!.width).toBeLessThanOrEqual(640);
    const gridColumns = await page.locator("#modal .editForm").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(/\\s+/).filter(Boolean),
    );
    expect(gridColumns).toHaveLength(1);
  });
});
