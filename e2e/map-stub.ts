import type { Page } from "@playwright/test";

// Esri 위성 타일은 외부 네트워크 의존이라 병렬 실행 시 지연·실패가 잦다.
// E2E에서는 1x1 투명 PNG로 대체해 지도 로드를 결정적으로 만든다.
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export async function stubMapTiles(page: Page) {
  const fulfill = (route: import("@playwright/test").Route) =>
    route.fulfill({ contentType: "image/png", body: TRANSPARENT_PNG });
  await page.route("https://server.arcgisonline.com/**", fulfill);
  await page.route("https://services.arcgisonline.com/**", fulfill);
}
