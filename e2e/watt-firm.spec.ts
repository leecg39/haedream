import { expect, test } from "@playwright/test";
import { loginToFit } from "./fit-auth";

test.describe("Watt 업체관리 /firm.html", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await loginToFit(page, "operator");
    await page.goto("/firm.html");
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
  });

  test("로그인 세션에서 명시적으로 허가된 합성 업체 화면을 렌더링함", async ({ page }) => {
    await expect(page).toHaveURL(/\/firm\.html$/);
    await expect(page).toHaveTitle("업체관리");
    await expect(page.locator("#leftnav .leftNav")).toBeVisible();
    await expect(page.locator("#topBar .topRightArea")).toBeVisible();
    await expect(page.locator("#firm")).toHaveClass(/active/);
    await expect(page.locator("#contentsArea")).toBeVisible();
    await expect(page.locator("#deskLimit")).toHaveText("1 - 50 / 62");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(50);

    const first = page.locator("#deskList tr[data-fid]").first();
    await expect(first.locator("td").nth(0)).toHaveText("2000000001");
    await expect(first.locator("td").nth(1)).toHaveText("합성 데모 업체 A");
    await expect(first.locator("td").nth(2)).toHaveText("");
    await expect(first.locator("td").nth(3)).toHaveText("0000000001");
    await expect(page.locator("#chargeLink")).toHaveAttribute("href", "/fit/rate-plan");
    await expect(page.locator("#researchLink")).toHaveAttribute("href", "/fit/research");
  });

  test("상단에서 DB 업체 전체를 스크롤·검색하고 선택을 유지함", async ({ page }) => {
    const response = await page.request.get("/api/firm");
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as {
      data: Array<{ fid: number; firmName: string }>;
    };

    const firmSelect = page.locator("#firmSelect");
    await expect(firmSelect.locator("option")).toHaveCount(body.data.length);
    await expect(page.locator("#firmSelect + .select2")).toBeVisible();

    await page.locator("#firmSelect + .select2 .select2-selection").click();
    const results = page.locator(
      ".select2-container--open .select2-results__options",
    );
    await expect(results).toBeVisible();
    const scrollState = await results.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
    }));
    expect(scrollState.overflowY).toBe("auto");
    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);

    const target = body.data.find((firm) => firm.firmName === "합성 QA 업체 001");
    expect(target).toBeDefined();
    await page
      .locator(".select2-container--open .select2-search__field")
      .fill(target!.firmName);
    const targetOption = page
      .locator(".select2-container--open .select2-results__option")
      .getByText(target!.firmName, { exact: true });
    await expect(targetOption).toBeVisible();
    await targetOption.click();

    await expect(firmSelect).toHaveValue(String(target!.fid));
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("firmName")))
      .toBe(target!.firmName);
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText(target!.firmName);

    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
    await expect(page.locator("#firmSelect")).toHaveValue(String(target!.fid));
    await expect(
      page.locator("#firmSelect + .select2 .select2-selection__rendered"),
    ).toHaveText(target!.firmName);
  });

  test("왼쪽 대시보드 카테고리의 시각·접근성 상태를 함께 전환함", async ({ page }) => {
    const dashboardCategory = page.locator("#navigation #main");
    const dashboardToggle = dashboardCategory.locator(":scope > a");
    const dashboardSubmenu = dashboardCategory.locator(":scope > .d2Nav");

    await expect(dashboardToggle).toHaveAttribute("aria-controls", "main-submenu");
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "false");
    await expect(dashboardSubmenu).toBeHidden();

    await dashboardToggle.click();
    await expect(dashboardCategory).toHaveClass(/\bactive\b/);
    await expect(page.locator("#firm")).not.toHaveClass(/\bactive\b/);
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "true");
    await expect(dashboardSubmenu).toBeVisible();

    await dashboardToggle.click();
    await expect(dashboardCategory).not.toHaveClass(/\bactive\b/);
    await expect(dashboardToggle).toHaveAttribute("aria-expanded", "false");
    await expect(dashboardSubmenu).toBeHidden();
  });

  test("검색·서비스 필터·정렬·50건 페이지 이동이 동작함", async ({ page }) => {
    await page.locator("#deskInput").fill("성신금속");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(1);
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("성신금속");
    await expect(page.locator("#deskLimit")).toHaveText("1 - 1 / 1");

    await page.locator("#deskInput").fill("");
    await page.locator("#serviceType").selectOption("3");
    const lowRows = page.locator("#deskList tr[data-fid]");
    await expect(lowRows).toHaveCount(20);
    expect(await lowRows.evaluateAll((rows) => rows.every((row) => row.children.item(11)?.textContent === "저압"))).toBe(true);

    await page.locator("#serviceType").selectOption("0");
    await page.locator("#deskSort th[data-sort='fid']").click();
    const ids = await page.locator("#deskList tr[data-fid]").evaluateAll((rows) =>
      rows.map((row) => Number(row.children.item(0)?.textContent)),
    );
    expect(ids).toEqual([...ids].sort((a, b) => a - b));

    await page.locator("#deskPages .deskPage").filter({ hasText: /^2$/ }).click();
    await expect(page.locator("#deskLimit")).toHaveText("51 - 62 / 62");
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(12);
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

    const firmName = `QA 테스트 업체 ${Date.now()}`;
    await page.locator("#edit-firmName").fill(firmName);
    await page.locator("#edit-contract").selectOption("IGL1");
    await page.locator("#edit-kepcoNo").fill("1234567890");
    await page.locator("#edit-bone").fill("QAEMS01");
    await page.locator("#edit-manager").fill("김테스트");
    await page.locator("#edit-serviceType").selectOption("1");
    await page.locator("#modalActDone").click();
    await expect(modalBox).toBeHidden();
    await expect(page.locator(".firmDemoToast")).toContainText("확인 되었습니다.");

    await page.locator("#deskInput").fill(firmName);
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(1);
    const added = page.locator("#deskList tr[data-fid]").first();
    await expect(added).toContainText("1234567890");
    await added.click();
    await expect(page.locator("#edit-firmName")).toHaveValue(firmName);
    await page.locator("#edit-memo").fill("수정 확인");
    await page.locator("#modalActDone").click();
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("수정 확인");

    await page.locator("#deskList tr[data-fid]").first().click();
    await expect(page.locator("#edit-firmName")).toHaveValue(firmName);
    await page.locator("#edit-firmName").fill("취소된 이름");
    await page.locator("#modalActCancel").click();
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText(firmName);

    // 새로고침 후에도 DB 영속이 유지되는지 확인한다.
    await page.reload();
    await expect(page.locator("body")).toHaveAttribute("data-firm-demo-ready", "true");
    await page.locator("#deskInput").fill(firmName);
    await expect(page.locator("#deskList tr[data-fid]")).toHaveCount(1);
    await expect(page.locator("#deskList tr[data-fid]").first()).toContainText("수정 확인");
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
  test.beforeEach(async ({ page }) => {
    await loginToFit(page, "operator");
  });

  // 이전에는 편집 팝업을 뷰포트 1/3 폭·1열로 좁히는 override 를 두고 그 값을
  // 검증했다. 이후 레퍼런스 이미지 피드백으로 원본 deskLib.css 의 넓은 2열
  // 그리드(`.editForm{grid-template-columns:1fr 2.4fr 1fr 2.4fr}`)로 되돌렸으므로
  // 기대값도 함께 바꾼다.
  test("편집 팝업이 원본의 넓은 2열 그리드 폼으로 열림", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");
    await page.locator("[data-act='add']").click();
    const modalContent = await page.locator("#modal .modalContent").boundingBox();
    expect(modalContent).not.toBeNull();
    // 폭은 그리드 트랙(1fr 2.4fr 1fr 2.4fr) + gap + padding 이 정하는 콘텐츠 기반이다.
    expect(modalContent!.width).toBeGreaterThanOrEqual(700);
    expect(modalContent!.width).toBeLessThanOrEqual(900);
    // 라벨/입력 한 쌍이 두 벌 = 트랙 4개여야 2열 폼이다.
    const gridColumns = await page.locator("#modal .editForm").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(/\s+/).filter(Boolean),
    );
    expect(gridColumns).toHaveLength(4);
  });

  test("추가 버튼이 값이 채워지지 않은 빈 폼을 염", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");

    // 먼저 기존 업체를 편집으로 열어 폼에 값을 채운다.
    await page.locator("#deskList tr").first().click();
    await expect(page.locator("#edit-firmName")).not.toHaveValue("");
    await page.locator("#modalActCancel").click();

    // 그 다음 추가를 누르면 직전 값이 남지 않고 전부 비어 있어야 한다.
    await page.locator("[data-act='add']").click();
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    const filled = await page
      .locator("#modal .editForm input")
      .evaluateAll((elements) =>
        elements.filter((element) => (element as HTMLInputElement).value !== "").length,
      );
    expect(filled).toBe(0);
    await expect(page.locator("#edit-contract")).toHaveValue("");
  });

  test("목록 프레임이 페이지당 10행을 스크롤 없이 모두 보여줌", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");

    const frame = page.locator(".deskArea");
    // 페이지당 10행이 렌더되고 프레임에 10행 전부가 잘리지 않고 들어온다.
    await expect(page.locator("#deskList tr")).toHaveCount(10);
    const fully = await frame.evaluate((area) => {
      const box = area.getBoundingClientRect();
      const head = area.querySelector("#deskTable thead th")!.getBoundingClientRect();
      return [...area.querySelectorAll("#deskList tr")].filter((row) => {
        const rect = row.getBoundingClientRect();
        return rect.top >= head.bottom - 0.5 && rect.bottom <= box.top + area.clientHeight + 0.5;
      }).length;
    });
    expect(fully).toBe(10);
    // 내부 스크롤이 생기지 않아야 한다.
    expect(await frame.evaluate((area) => area.scrollHeight > area.clientHeight + 1)).toBe(false);
  });

  test("프레임 최상단 검색이 목록과 툴바 검색창에 함께 반영됨", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");

    await page.locator(".firmSearchInput").fill("성신금속");
    await expect(page.locator("#deskInput")).toHaveValue("성신금속");
    await expect(page.locator("#deskList tr")).toHaveCount(1);
    await expect(page.locator("#deskList tr td").nth(1)).toHaveText("성신금속");
  });

  test("FIT 업체 등록·수정이 API 영속 후 새로고침에도 유지됨", async ({ page }) => {
    await page.setViewportSize({ width: 1904, height: 913 });
    await page.goto("/fit/firm");

    const firmName = `FIT 영속 업체 ${Date.now()}`;
    await page.locator("[data-act='add']").click();
    await expect(page.locator("#modal")).not.toHaveClass(/disable/);
    await page.locator("#edit-firmName").fill(firmName);
    await page.locator("#edit-contract").selectOption("IGL1");
    await page.locator("#edit-serviceType").selectOption("1");
    await page.locator("#modalActDone").click();
    await expect(page.locator("#modal")).toHaveClass(/disable/);

    await page.locator(".firmSearchInput").fill(firmName);
    await expect(page.locator("#deskList tr")).toHaveCount(1);
    await page.locator("#deskList tr").first().click();
    await expect(page.locator("#edit-firmName")).toHaveValue(firmName);
    await page.locator("#edit-memo").fill("FIT 수정 메모");
    await page.locator("#modalActDone").click();
    await expect(page.locator("#modal")).toHaveClass(/disable/);
    await expect(page.locator("#deskList tr").first()).toContainText("FIT 수정 메모");

    await page.reload();
    await page.locator(".firmSearchInput").fill(firmName);
    await expect(page.locator("#deskList tr")).toHaveCount(1);
    await expect(page.locator("#deskList tr").first()).toContainText("FIT 수정 메모");
  });
});
