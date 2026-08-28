import { expect, test } from "@playwright/test";

test.describe("5.58.58 WATT 환경설정 관리 영상 재현", () => {
  test("사용자 행을 권한별 입력 폼에서 수정함", async ({ page }) => {
    await page.goto("/fit/user");

    await expect(page.getByRole("cell", { name: "admin001", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "관리자 수정" }).click();

    const dialog = page.getByRole("dialog", { name: "사용자관리" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^권한/).selectOption({ label: "운영자" });
    await dialog.getByLabel("연락처").fill("010-9876-5432");
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("status")).toContainText("저장");
    await expect(page.getByRole("cell", { name: "운영자", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "010-9876-5432", exact: true })).toBeVisible();
  });

  test("업체 필터로 노드 게이트웨이를 찾고 노드 타입을 수정함", async ({ page }) => {
    await page.goto("/fit/gate-node");

    await page.getByLabel("게이트웨이 관리 업체").selectOption({ label: "대산금속" });
    await page.getByRole("textbox", { name: "게이트웨이 관리 검색" }).fill("4107");
    await expect(page.getByRole("cell", { name: "4107", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "다이캐스팅9 위 수정" }).click();

    const dialog = page.getByRole("dialog", { name: "노드 게이트웨이" });
    await dialog.locator("select").nth(1).selectOption("POWER");
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("status")).toContainText("저장");
    await expect(page.getByRole("cell", { name: "POWER", exact: true }).first()).toBeVisible();
  });

  test("복합제어기 필수값 오류와 중첩 그룹설정 후 추가를 처리함", async ({ page }) => {
    await page.goto("/fit/gateway");
    await page.getByRole("button", { name: "추가" }).click();

    const editor = page.getByRole("dialog", { name: "게이트웨이 제어" });
    await editor.getByRole("button", { name: "저장" }).click();
    await expect(editor.getByRole("alert", { name: "입력 오류" })).toContainText(
      "GATE 항목은 필수입니다.",
    );
    await expect(editor.getByLabel(/^GATE/)).toHaveAttribute("aria-invalid", "true");

    await editor.getByLabel(/^GATE/).fill("4999");
    await editor.getByLabel(/^이름/).fill("영상 테스트 제어기");
    await editor.getByLabel(/^노드/).fill("1");
    await editor.getByRole("button", { name: "그룹설정" }).click();

    const groupDialog = page.getByRole("dialog", { name: "그룹설정" });
    await groupDialog.getByLabel("그룹명").fill("영상 제어그룹");
    await groupDialog.getByRole("button", { name: "추가" }).click();
    await expect(editor.getByText("영상 제어그룹", { exact: true })).toBeVisible();

    await editor.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("status")).toContainText("추가");
    await page.getByRole("textbox", { name: "복합제어기 관리 검색" }).fill("4999");
    await expect(page.getByRole("cell", { name: "영상 테스트 제어기", exact: true })).toBeVisible();
  });

  test("시퀀스 행 편집과 전체 모드·ON/OFF 제어가 동작함", async ({ page }) => {
    await page.goto("/fit/sequence");

    await expect(page.getByRole("cell", { name: "다이캐스팅 피크 순차제어", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "모드전환" }).click();
    await expect(page.getByRole("cell", { name: "수동", exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "전체 OFF" }).click();
    await expect(page.getByRole("cell", { name: "OFF", exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "전체 ON" }).click();
    await expect(page.getByRole("cell", { name: "ON", exact: true })).toHaveCount(2);

    await page.getByRole("button", { name: "다이캐스팅 피크 순차제어 수정" }).click();
    const dialog = page.getByRole("dialog", { name: "시퀀스 제어" });
    await dialog.getByLabel(/^우선순위/).fill("7");
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("cell", { name: "7", exact: true })).toBeVisible();
  });

  test("RTU 추가의 필수값 오류를 보여주고 유효 입력을 저장함", async ({ page }) => {
    await page.goto("/fit/gate-rtu");
    await page.getByRole("button", { name: "추가" }).click();

    const dialog = page.getByRole("dialog", { name: "RTU" });
    await dialog.getByRole("button", { name: "저장" }).click();
    const alert = dialog.getByRole("alert", { name: "입력 오류" });
    await expect(alert).toContainText("RTU 항목은 필수입니다.");
    await expect(alert).toContainText("IP Address 항목은 필수입니다.");

    await dialog.getByLabel(/^RTU/).fill("4991");
    await dialog.getByLabel(/^이름/).fill("영상 테스트 RTU");
    await dialog.getByLabel(/^IP Address/).fill("115.94.112.220");
    await dialog.getByLabel(/^PORT/).fill("54991");
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("status")).toContainText("추가");
    await page.getByRole("textbox", { name: "RTU 관리 검색" }).fill("4991");
    await expect(page.getByRole("cell", { name: "영상 테스트 RTU", exact: true })).toBeVisible();
  });

  test("모드버스 계측 필수값을 검증하고 새 계측기를 저장함", async ({ page }) => {
    await page.goto("/fit/device");
    await page.getByRole("button", { name: "추가" }).click();

    const dialog = page.getByRole("dialog", { name: "모드버스 계측" });
    await dialog.getByRole("button", { name: "저장" }).click();
    await expect(dialog.getByRole("alert", { name: "입력 오류" })).toContainText(
      "LoadID 항목은 필수입니다.",
    );

    await dialog.getByLabel(/^LoadID/).fill("12999");
    await dialog.getByLabel(/^RTU/).fill("4106");
    await dialog.getByLabel(/^이름/).fill("영상 테스트 계측기");
    await dialog.getByLabel(/^LoadNumber/).fill("299");
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("status")).toContainText("추가");
    await page.getByRole("textbox", { name: "모드버스 계측 검색" }).fill("12999");
    await expect(page.getByRole("cell", { name: "영상 테스트 계측기", exact: true })).toBeVisible();
  });
});
