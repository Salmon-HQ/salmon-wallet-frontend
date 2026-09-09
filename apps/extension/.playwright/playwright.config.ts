/**
 * Playwright config for the Salmon browser-extension e2e suite.
 *
 * Serial + single worker: the suite drives a persistent wallet profile and
 * some flows touch on-chain state, so parallelism is unsafe. Selection uses
 * data-testid (Playwright's default), aligned with the shared Testable
 * contract in packages/shared.
 */
import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTestEnv } from './env';

loadTestEnv();

const suiteRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(suiteRoot, 'tests'),
  outputDir: path.join(suiteRoot, 'test-results'),
  globalSetup: path.join(suiteRoot, 'global-setup.ts'),
  fullyParallel: false,
  workers: 1,
  // One retry on CI absorbs a cold-runner hiccup (a closed context, a slow first
  // paint) without hiding a real regression, which fails both times.
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(suiteRoot, 'playwright-report'), open: 'never' }],
  ],
  use: {
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
