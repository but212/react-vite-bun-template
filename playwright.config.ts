import { defineConfig, devices } from '@playwright/test';

/**
 * 자세한 설정 문서는 https://playwright.dev/docs/test-configuration 참고.
 */
export default defineConfig({
  testDir: './tests-e2e',
  /* 각 파일의 테스트를 병렬로 실행합니다 */
  fullyParallel: true,
  /* CI 환경에서 test.only가 남아있으면 빌드를 실패시킵니다. */
  forbidOnly: !!process.env.CI,
  /* CI에서만 재시도 2회 */
  retries: process.env.CI ? 2 : 0,
  /* CI에서는 병렬 워커를 1개만 사용합니다 */
  workers: process.env.CI ? 1 : undefined,
  /* 사용할 리포터. https://playwright.dev/docs/test-reporters 참고 */
  reporter: 'html',
  /* 아래 프로젝트에 공통으로 적용할 설정입니다. https://playwright.dev/docs/api/class-testoptions 참고 */
  use: {
    /* page.goto('/')와 같은 액션에 사용할 기본 URL */
    baseURL: 'http://localhost:3000',

    /* 실패한 테스트를 재시도할 때 트레이스를 수집합니다. https://playwright.dev/docs/trace-viewer 참고 */
    trace: 'on-first-retry',
  },

  /* 주요 브라우저별 프로젝트 구성 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* 테스트 시작 전에 로컬 개발 서버를 실행합니다 */
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
