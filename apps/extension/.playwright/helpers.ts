/**
 * Flow helpers shared across extension specs. Ported from scripts/lib.mjs.
 *
 * Both the lock path and the recover/onboarding path select by the stable
 * data-testid contract (lock-*, select-recover-button, recover-word-input-*,
 * recover-next-button, password-input/confirm, password-submit-button,
 * success-go-to-wallet-button).
 */
import { type Page } from '@playwright/test';

const password = (): string => process.env.SALMON_TEST_PASSWORD ?? '';
const seedA = (): string => process.env.SALMON_TEST_SEED_A ?? '';

export type EntryState = 'unlocked' | 'recovered' | 'home';

export type Consent = 'accept' | 'decline';

/**
 * @param consent - Which button to press on the first-run consent screen.
 *   Defaults to `decline`, so analytics stay OFF unless a spec asks for them.
 * @param seed - Which wallet to recover. Defaults to Wallet A; pass
 *   SALMON_TEST_SEED_B when a spec needs Wallet B to sign.
 */
export async function unlockOrRecover(
  page: Page,
  { consent = 'decline', seed = seedA() }: { consent?: Consent; seed?: string } = {}
): Promise<EntryState> {
  const passwordInput = page.getByTestId('lock-password-input');
  if (await passwordInput.count()) {
    await passwordInput.fill(password());
    await page.getByTestId('lock-unlock-button').click();
    await page.waitForTimeout(3000);
    return 'unlocked';
  }

  const recoverButton = page.getByTestId('select-recover-button');
  if (await recoverButton.count()) {
    await recoverButton.click();
    // Auto-waiting actions (no fixed sleeps): each step waits for its target
    // to be actionable. recover-next-button is visibility-toggled until the
    // seed validates; success appears only after the creation loading screen.
    await page.getByTestId('recover-word-input-1').fill(seed);
    await page.getByTestId('recover-next-button').click({ timeout: 30_000 });
    await page.getByTestId('password-input').fill(password());
    await page.getByTestId('password-confirm-input').fill(password());
    await page.getByTestId('password-submit-button').click();
    // Success comes first; leaving it presents the first-run analytics
    // consent, which is the final onboarding step.
    await page
      .getByTestId('success-go-to-wallet-button')
      .click({ timeout: 60_000 })
      .catch(() => {});
    await page
      .getByTestId(`analytics-consent-${consent}`)
      .click({ timeout: 60_000 })
      .catch(() => {});
    return 'recovered';
  }

  return 'home';
}

export async function waitHome(page: Page): Promise<void> {
  await page
    .getByTestId('home-screen')
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {});
}
