import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * The API suite talks to the backend over HTTP only. It never starts a browser,
 * so it needs no browser binaries and runs in seconds.
 */
export default defineConfig({
  testDir: './tests/api/specs',
  outputDir: './test-results/api',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 20_000,
  expect: { timeout: 5_000 },

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report/api', open: 'never' }], ['github']]
    : [['html', { outputFolder: 'playwright-report/api', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { Accept: 'application/json' },
    trace: 'on-first-retry',
  },

  projects: [{ name: 'api' }],

  webServer: {
    command: 'npm start',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
