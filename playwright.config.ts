import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/ui/specs',
  outputDir: './test-results/ui',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report/ui', open: 'never' }], ['github']]
    : [['html', { outputFolder: 'playwright-report/ui', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  // chromium runs the whole suite; firefox and webkit run the @core subset so
  // cross-browser coverage stays honest without tripling CI time.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@core/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@core/ },
  ],

  webServer: {
    command: 'npm start',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
