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

// A CI run that holds the test wallets' recovery phrases keeps no record that
// could carry one, because its report can be downloaded: a trace stores every
// value typed and a snapshot of every screen, with no masking documented
// (playwright.dev/docs/trace-viewer); the HTML report titles each fill step
// with the text filled (`Fill "<value>"`); and a failure screenshot can land
// on the recovery screen. In that run all three are off and the console log,
// where GitHub masks the secrets, is the record. Locally, and in CI runs
// without the phrases (fork PRs), they stay on.
const holdsRecoveryPhrases =
  Boolean(process.env.CI) &&
  Boolean(process.env.SALMON_TEST_SEED_A || process.env.SALMON_TEST_SEED_B);

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
  reporter: holdsRecoveryPhrases
    ? [['list']]
    : [
        ['list'],
        ['html', { outputFolder: path.join(suiteRoot, 'playwright-report'), open: 'never' }],
      ],
  use: {
    testIdAttribute: 'data-testid',
    // An action with no bound inherits the test's timeout — up to 15 minutes in
    // the slow specs — so a selector that matches nothing hangs instead of
    // failing. Actions that wait on real work pass their own timeout.
    actionTimeout: 30_000,
    trace: holdsRecoveryPhrases ? 'off' : 'retain-on-failure',
    screenshot: holdsRecoveryPhrases ? 'off' : 'only-on-failure',
    video: 'off',
  },
});
