import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, username: string) {
  await page.goto("/");
  await page.getByPlaceholder("아이디").fill(username);
  await page.getByPlaceholder("비밀번호").fill("demo");
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/main\.html$/);
}

test.describe.serial("주요설비 CRUD", () => {
  const code = `E2E-${Date.now()}`;

  test("목록 → 등록 → 상세 → 수정 → 삭제 → 복구 흐름", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/facilities");
    await expect(
      page.getByRole("heading", { name: "주요설비 관리" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "+ 설비 등록" }).click();
    await page.getByLabel("설비 코드").fill(code);
    await page.getByLabel("설비 이름").fill("E2E 검증 설비");
    await page.getByLabel("공정 이름").fill("E2E 공정");
    await page.getByLabel("그룹 이름").fill("검증 그룹");
    await page.getByRole("spinbutton", { name: "우선순위" }).fill("21");
    await page.getByLabel("기본 설정 온도 (℃)").fill("120");
    await page.getByLabel("피크 제어 수치 (%)").fill("35");
    await page.getByLabel("게이트웨이").selectOption({ index: 1 });
    await page.getByLabel("노드 번호").fill("6");
    await page.getByLabel("채널 번호").fill("2");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "새 설비를 등록했습니다.",
    );

    await page.getByRole("textbox", { name: "검색" }).fill(code);
    await page.getByRole("button", { name: "조회" }).click();
    const row = page.getByRole("row").filter({ hasText: code });
    await expect(row).toContainText("E2E 검증 설비");

    await row.getByRole("button", { name: "상세" }).click();
    await expect(
      page.getByRole("heading", { name: "설비 상세" }),
    ).toBeVisible();
    await expect(page.getByLabel("설비 이름")).toHaveValue("E2E 검증 설비");
    await page.getByRole("button", { name: "닫기", exact: true }).click();

    await row.getByRole("button", { name: "수정" }).click();
    await page.getByLabel("설비 이름").fill("E2E 수정 설비");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "설비 정보를 수정했습니다.",
    );
    await expect(
      page.getByRole("row").filter({ hasText: code }),
    ).toContainText("E2E 수정 설비");

    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "삭제" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      "설비를 삭제했습니다.",
    );
    await expect(page.getByRole("row").filter({ hasText: code })).toHaveCount(0);

    await page.getByLabel("데이터").selectOption("only");
    await page.getByRole("button", { name: "조회" }).click();
    const deletedRow = page.getByRole("row").filter({ hasText: code });
    await expect(deletedRow).toContainText("삭제됨");
    await deletedRow.getByRole("button", { name: "복구" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "복구", exact: true })
      .click();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "설비를 복구했습니다.",
    );

    await page.getByLabel("데이터").selectOption("exclude");
    await page.getByRole("button", { name: "조회" }).click();
    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "삭제" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    await page.getByLabel("데이터").selectOption("only");
    await page.getByRole("button", { name: "조회" }).click();
    await page
      .getByRole("row")
      .filter({ hasText: code })
      .getByRole("button", { name: "영구 삭제" })
      .click();
    await page.getByLabel(/확인을 위해 설비 코드/).fill(code);
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "영구 삭제", exact: true })
      .click();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "설비를 영구 삭제했습니다.",
    );
  });

  test("조회자는 변경 작업과 삭제 데이터에 접근할 수 없음", async ({
    page,
  }) => {
    await login(page, "viewer");
    await page.goto("/admin/facilities");
    await expect(page.getByText("조회 담당자")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "+ 설비 등록" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("데이터")).toBeDisabled();
    await expect(page.getByRole("button", { name: "수정" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "삭제" })).toHaveCount(0);
  });

  test("모바일에서 카드 목록과 상세 창을 사용할 수 있음", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "admin");
    await page.goto("/admin/facilities");
    await expect(
      page.getByRole("heading", { name: "주요설비 관리" }),
    ).toBeVisible();
    const firstCard = page.locator("article").first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByRole("button", { name: "상세" }).click();
    await expect(
      page.getByRole("heading", { name: "설비 상세" }),
    ).toBeVisible();
    await expect(page.getByLabel("설비 이름")).toBeVisible();
  });

  test("두 사용자의 서로 다른 필드 수정이 충돌 후 보존됨", async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      baseURL: "http://localhost:3456",
    });
    const contextB = await browser.newContext({
      baseURL: "http://localhost:3456",
    });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    try {
      await login(pageA, "admin");
      await login(pageB, "operator");
      await pageA.goto("/admin/facilities");
      await pageB.goto("/admin/facilities");

      const rowA = pageA.getByRole("row").filter({ hasText: "F-DC-01" });
      const rowB = pageB.getByRole("row").filter({ hasText: "F-DC-01" });
      await rowA.getByRole("button", { name: "수정" }).click();
      await rowB.getByRole("button", { name: "수정" }).click();

      const originalName = await pageA.getByLabel("설비 이름").inputValue();
      const originalTemperature = await pageA
        .getByLabel("기본 설정 온도 (℃)")
        .inputValue();
      const changedTemperature = String(Number(originalTemperature) + 1);
      const changedName = `${originalName} 동시검증`;

      await pageA
        .getByLabel("기본 설정 온도 (℃)")
        .fill(changedTemperature);
      await pageB.getByLabel("설비 이름").fill(changedName);
      await pageA.getByRole("button", { name: "저장" }).click();
      await expect(pageA.locator('[aria-live="polite"]')).toHaveText(
        "설비 정보를 수정했습니다.",
      );

      await pageB.getByRole("button", { name: "저장" }).click();
      await expect(
        pageB.locator('div[role="alert"]').filter({
          hasText: "최신 버전을 불러왔습니다",
        }),
      ).toBeVisible();
      await pageB.getByRole("button", { name: "저장" }).click();
      await expect(pageB.locator('[aria-live="polite"]')).toHaveText(
        "설비 정보를 수정했습니다.",
      );

      await pageA.reload();
      await rowA.getByRole("button", { name: "상세" }).click();
      await expect(pageA.getByLabel("설비 이름")).toHaveValue(changedName);
      await expect(pageA.getByLabel("기본 설정 온도 (℃)")).toHaveValue(
        changedTemperature,
      );
      await pageA.getByRole("button", { name: "닫기", exact: true }).click();

      await rowA.getByRole("button", { name: "수정" }).click();
      await pageA.getByLabel("설비 이름").fill(originalName);
      await pageA
        .getByLabel("기본 설정 온도 (℃)")
        .fill(originalTemperature);
      await pageA.getByRole("button", { name: "저장" }).click();
      await expect(pageA.locator('[aria-live="polite"]')).toHaveText(
        "설비 정보를 수정했습니다.",
      );
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("삭제 확인창이 키보드 포커스를 내부에 유지함", async ({ page }) => {
    await login(page, "operator");
    await page.goto("/admin/facilities");
    await page
      .getByRole("row")
      .filter({ hasText: "F-DC-02" })
      .getByRole("button", { name: "삭제" })
      .click();
    const dialog = page.getByRole("alertdialog");
    const confirmButton = dialog.getByRole("button", {
      name: "삭제",
      exact: true,
    });
    const cancelButton = dialog.getByRole("button", { name: "취소" });
    await expect(confirmButton).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(cancelButton).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("설비 편집창의 역방향 포커스도 내부에 유지함", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/facilities");
    await page.getByRole("button", { name: "+ 설비 등록" }).click();
    const dialog = page.getByRole("dialog");
    const heading = dialog.getByRole("heading", { name: "설비 등록" });
    await expect(heading).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "저장" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
});
