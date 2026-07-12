/**
 * First-run analytics consent SCREEN e2e (web).
 *
 * The opt-in consent is the final onboarding step (route `/auth/analytics-consent`),
 * shown once after password setup and before the Success screen. This proves:
 *  1. It appears once during onboarding, right after the password step.
 *  2. "Share anonymous data" (accept) advances to Success and turns the Settings
 *     toggle ON; it does not reappear after a reload + unlock.
 *  3. "Not now" (decline) advances to Success and leaves the Settings toggle OFF.
 *
 * The screen is engine-independent React/DOM while the recover flow is the slow,
 * flaky part — so this runs once on Chromium. Requires `SALMON_TEST_SEED_A` and
 * `SALMON_TEST_PASSWORD`. Skips when the backend is unreachable or fixtures are
 * absent (repo e2e policy).
 */
import { test, expect, type Page } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const seedA = (): string => process.env.SALMON_TEST_SEED_A ?? '';
const password = (): string => process.env.SALMON_TEST_PASSWORD ?? '';

let backendUp = false;
const haveWalletFixture = Boolean(process.env.SALMON_TEST_SEED_A && process.env.SALMON_TEST_PASSWORD);

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

/** Drives recovery up to (but not through) the consent screen. */
async function recoverToConsent(page: Page): Promise<void> {
  await page.getByTestId('select-recover-button').click({ timeout: 20_000 });
  await page.getByTestId('recover-seed-input').fill(seedA());
  await page.getByTestId('recover-next-button').click({ timeout: 30_000 });
  await page.getByTestId('password-input').fill(password());
  await page.getByTestId('password-confirm-input').fill(password());
  await page.getByTestId('password-submit-button').click();
  await page
    .getByTestId('analytics-consent-screen')
    .waitFor({ state: 'visible', timeout: 60_000 });
}

async function stubEvents(page: Page): Promise<void> {
  // Accepting consent starts the flush timer, which would otherwise POST here.
  await page.route('**/v1/events', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' }),
  );
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'engine-independent screen; run once on chromium to avoid 3× the slow recover');
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!haveWalletFixture, 'no seeded-wallet fixture (SALMON_TEST_SEED_A / SALMON_TEST_PASSWORD)');
});

test('accept: consent screen appears once, opts in, and never reappears', async ({ page }) => {
  test.setTimeout(180_000); // recover + reload/unlock cycle is slow
  await stubEvents(page);

  await page.goto('/');
  await recoverToConsent(page);

  // 1) Shown once during onboarding, after the password step.
  const screen = page.getByTestId('analytics-consent-screen');
  await expect(screen).toBeVisible();

  // 2) Accept → advances to Success, then into the wallet.
  await page.getByTestId('analytics-consent-accept').click();
  await page.getByTestId('success-go-to-wallet-button').click({ timeout: 60_000 });
  await waitHome(page);
  const home = page.getByTestId('home-screen');
  await expect(home).toBeVisible();

  // Does not reappear: reload boots into the lock screen (wallet persisted), and
  // onboarding — which owns the consent screen — never runs again.
  await page.reload();
  await unlockOrRecover(page);
  await waitHome(page);
  await expect(home).toBeVisible();
  await expect(screen).toHaveCount(0);

  // Accepting turned analytics ON: the Settings toggle reads checked.
  await page.getByTestId('wallet-header-settings-button').click();
  const toggle = page.getByTestId('settings-analytics-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle, 'accept turns analytics ON').toBeChecked();
});

test('decline: consent screen advances to the wallet with analytics left off', async ({ page }) => {
  test.setTimeout(180_000);
  await stubEvents(page);

  await page.goto('/');
  await recoverToConsent(page);

  const screen = page.getByTestId('analytics-consent-screen');
  await expect(screen).toBeVisible();

  // "Not now" → advances to Success, then into the wallet.
  await page.getByTestId('analytics-consent-decline').click();
  await page.getByTestId('success-go-to-wallet-button').click({ timeout: 60_000 });
  await waitHome(page);
  await expect(page.getByTestId('home-screen')).toBeVisible();

  // Declining left analytics OFF: the Settings toggle is unchecked.
  await page.getByTestId('wallet-header-settings-button').click();
  const toggle = page.getByTestId('settings-analytics-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle, 'decline leaves analytics OFF').not.toBeChecked();
});
