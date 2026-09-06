import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.E2E_PORT ?? 3456);
if (!Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65535) {
  throw new Error("E2E_PORT must be a valid TCP port.");
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // 동시에 돌아가는 다른 개발 세션과 CPU를 나눠 쓰므로 워커를 2개로 제한해
  // 지도 렌더링 같은 무거운 테스트의 간헐적 타임아웃을 방지한다.
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${e2ePort}`,
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
      `npm run db:setup:e2e && DATABASE_PATH=data/solarsimz-e2e.db NEXT_DIST_DIR=.next-e2e npm run build && DATABASE_PATH=data/solarsimz-e2e.db NEXT_DIST_DIR=.next-e2e RATE_LIMIT_DISABLED=true COOKIE_INSECURE=true npm run start -- -p ${e2ePort}`,
    url: `http://localhost:${e2ePort}`,
    // 이전 실행의 RATE_LIMIT_DISABLED 미설정 서버를 재사용하면 로그인 429가 난다.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
