import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
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
    command:
      "npm run db:setup:e2e && DATABASE_PATH=data/solarsimz-e2e.db NEXT_DIST_DIR=.next-e2e npm run dev -- -p 3456",
    url: "http://localhost:3456",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
