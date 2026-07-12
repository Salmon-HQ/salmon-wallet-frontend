/**
 * First-run analytics consent SCREEN e2e (extension popup).
 *
 * The opt-in consent is the final onboarding step ('analytics-consent' AuthStep),
 * shown once after password setup and before Success. This proves the screen
 * appears in the popup during onboarding, offers both choices, and that opting
 * in advances to Success and turns the Settings toggle ON.
 *
 * Runs against a fresh persistent profile (the suite deletes profiles/default to
 * force onboarding). Requires SALMON_TEST_SEED_A + SALMON_TEST_PASSWORD; skips
 * when the backend is unreachable (repo e2e policy).
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';

const seedA = (): string => process.env.SALMON_TEST_SEED_A ?? '';
const password = (): string => process.env.SALMON_TEST_PASSWORD ?? '';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('first-run consent screen appears in onboarding and opts in', async ({ popup }) => {
  test.setTimeout(120_000); // recover (client-side derivation + API) is slow
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');

  // Stub analytics ingest — opting in starts the flush timer.
  await popup.route('**/v1/events', (route) =>
    route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' }),
  );

  // The consent screen only shows during onboarding. The suite shares one
  // persistent profile, so a prior spec may have already onboarded it — the
  // popup then opens on the lock screen. Skip in that case (run this spec on a
  // fresh profile to exercise it).
  const alreadyOnboarded = await popup
    .getByTestId('lock-password-input')
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  test.skip(alreadyOnboarded, 'wallet already onboarded in this profile — consent screen only shows on fresh onboarding');

  // Fresh profile → onboarding. Recover up to the consent screen.
  await popup.getByTestId('select-recover-button').click({ timeout: 20_000 });
  await popup.getByTestId('recover-seed-input').fill(seedA());
  await popup.getByTestId('recover-next-button').click({ timeout: 30_000 });
  await popup.getByTestId('password-input').fill(password());
  await popup.getByTestId('password-confirm-input').fill(password());
  await popup.getByTestId('password-submit-button').click();

  // The consent screen is the final onboarding step, and offers both choices.
  const screen = popup.getByTestId('analytics-consent-screen');
  await expect(screen).toBeVisible({ timeout: 60_000 });
  await expect(popup.getByTestId('analytics-consent-accept')).toBeVisible();
  await expect(popup.getByTestId('analytics-consent-decline')).toBeVisible();

  // Accept → advances to Success, then into the wallet.
  await popup.getByTestId('analytics-consent-accept').click();
  await popup.getByTestId('success-go-to-wallet-button').click({ timeout: 60_000 });
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });

  // Opting in turned analytics ON: the Settings toggle reads checked.
  await popup.getByTestId('wallet-header-settings-button').click();
  const toggle = popup.getByTestId('settings-analytics-toggle');
  await toggle.scrollIntoViewIfNeeded().catch(() => {});
  await expect(toggle, 'accept turns analytics ON').toBeChecked({ timeout: 10_000 });
});
