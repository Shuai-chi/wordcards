import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173/wordcards/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },
  // 讓 Playwright 自動啟動 dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/wordcards/',
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
