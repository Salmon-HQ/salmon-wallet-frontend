/**
 * Playwright config for the Salmon web app e2e suite.
 *
 * Runs against the Vite dev server (auto-started via webServer). No extension
 * loading. Selection uses data-testid, aligned with the shared Testable
 * contract in packages/shared.
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTestEnv } from './env';

loadTestEnv();

const suiteRoot = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.SALMON_WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: path.join(suiteRoot, 'tests'),
  outputDir: path.join(suiteRoot, 'test-results'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(suiteRoot, 'playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Playwright waits forever for an unactionable element by default, so a
    // click on something permanently covered burns the whole test timeout in
    // silence instead of reporting what covered it. Bound it: no legitimate
    // click here needs 20s, and the slow ones pass their own timeout.
    actionTimeout: 20_000,
  },
  // Cross-engine coverage: every web spec runs on Chromium, Firefox and
  // WebKit (Safari). Browser binaries are installed via
  // `pnpm exec playwright install chromium firefox webkit`.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm --filter @salmon/web dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
