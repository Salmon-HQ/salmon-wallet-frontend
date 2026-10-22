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

// A CI run keeps no record that could carry a recovery phrase, because its
// report can be downloaded: a trace stores every value typed and a snapshot of
// every screen, with no masking documented (playwright.dev/docs/trace-viewer);
// the HTML report titles each fill step with the text filled (`Fill "<value>"`);
// and a failure screenshot can land on the recovery screen. Whether a run holds
// the test wallets' phrases depends on its secrets, so every CI run keeps all
// three off and the console log, where GitHub masks the secrets, is the record.
// Locally they stay on.
const keepsRecords = !process.env.CI;

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
  reporter: keepsRecords
    ? [
        ['list'],
        ['html', { outputFolder: path.join(suiteRoot, 'playwright-report'), open: 'never' }],
      ]
    : [['list']],
  use: {
    testIdAttribute: 'data-testid',
    // An action with no bound inherits the test's timeout — up to 15 minutes in
    // the slow specs — so a selector that matches nothing hangs instead of
    // failing. Actions that wait on real work pass their own timeout.
    actionTimeout: 30_000,
    trace: keepsRecords ? 'retain-on-failure' : 'off',
    screenshot: keepsRecords ? 'only-on-failure' : 'off',
    video: 'off',
  },
});
