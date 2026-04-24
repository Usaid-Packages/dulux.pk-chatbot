import { defineConfig, devices } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { authStatePaths } from './e2e/fixtures/auth.fixture';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}/app/`;
const IS_CI = Boolean(process.env.CI);
const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: IS_CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: 'test-results/artifacts',
  webServer: {
    command: `yarn dev --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'setup-auth',
      testMatch: /.*auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium-smoke',
      grep: /@smoke|@rbac/,
      testIgnore: /.*auth\.setup\.ts/,
      dependencies: ['setup-auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePaths.anonymous,
      },
    },
    {
      name: 'chromium-full',
      testIgnore: /.*auth\.setup\.ts/,
      dependencies: ['setup-auth'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authStatePaths.anonymous,
      },
    },
    {
      name: 'firefox-full',
      testIgnore: /.*auth\.setup\.ts/,
      dependencies: ['setup-auth'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: authStatePaths.anonymous,
      },
    },
  ],
  globalTeardown: resolve(currentDir, 'e2e/fixtures/teardown.fixture.ts'),
});
