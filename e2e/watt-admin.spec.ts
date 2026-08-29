import { expect, test } from "@playwright/test";

const pages = [
  ["/widget-set", "대시보드 화면설정"],
  ["/fit/user", "사용자관리"],
  ["/fit/notify", "알람설정"],
  ["/fit/gate-node", "게이트웨이 관리"],
  ["/fit/gateway", "복합제어기 관리"],
  ["/fit/sequence", "시퀀스 제어"],
  ["/fit/gate-rtu", "RTU 관리"],
  ["/fit/device", "모드버스 계측"],
  ["/fit/net", "실시간 데이터"],
  ["/fit/bad", "통신상태 불량"],
] as const;

test.describe("WATT 관리 화면 클론", () => {
  for (const [path, title] of pages) {
    test(`${title} 화면을 렌더링함`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.locator("#contentsArea")).toBeVisible();
    });
  }

  test("관리 표 검색과 편집 모달이 동작함", async ({ page }) => {
    await page.goto("/fit/gate-rtu");
    await page.getByRole("textbox", { name: "검색" }).fill("4106");
    await expect(page.getByRole("cell", { name: "4106", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "4105", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "추가" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "취소" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("위젯 설정을 변경하고 저장함", async ({ page }) => {
    await page.goto("/widget-set");
    await page.getByLabel("1줄에 보여질 위젯 갯수").selectOption("4");
    const sector = page.getByRole("checkbox", {
      name: /분야별 에너지 사용량/,
    });
    await sector.check();
    await page.getByRole("button", { name: "설정 저장" }).click();
    await expect(page.getByRole("status")).toContainText("저장");
  });

  test("특수 화면의 주요 제어가 동작함", async ({ page }) => {
    await page.goto("/fit/net");
    await page.getByRole("button", { name: /업데이트 멈춤/ }).click();
    await expect(page.getByRole("button", { name: /업데이트 재개/ })).toBeVisible();

    await page.goto("/fit/bad");
    await page.getByLabel("분류").selectOption({ label: "제어설비" });
    await page.getByRole("button", { name: "조회" }).click();
    await expect(page.getByRole("status")).toContainText(
      "조회된 제어설비 통신 불량 설비가 없습니다.",
    );
  });

  test("모바일에서 셸과 핵심 관리 열을 표시함", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/fit/gateway");
    await expect(page.getByRole("button", { name: "메뉴" })).toBeVisible();
    for (const header of ["GATE", "이름", "모드", "순위"]) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }
  });
});
