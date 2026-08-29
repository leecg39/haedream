import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // 동시에 돌아가는 다른 개발 세션과 CPU를 나눠 쓰므로 워커를 2개로 제한해
  // 지도 렌더링 같은 무거운 테스트의 간헐적 타임아웃을 방지한다.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
  webServer: {
    // dev 모드는 병렬 실행 중 온디맨드 컴파일·HMR이 간섭해 지도 테스트가 간헐적으로
    // 실패했다. 프로덕션 빌드로 고정해 결정적으로 만든다.
    command:
      "npm run db:setup:e2e && DATABASE_PATH=data/solarsimz-e2e.db NEXT_DIST_DIR=.next-e2e npm run build && DATABASE_PATH=data/solarsimz-e2e.db NEXT_DIST_DIR=.next-e2e RATE_LIMIT_DISABLED=true npm run start -- -p 3456",
    url: "http://localhost:3456",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
