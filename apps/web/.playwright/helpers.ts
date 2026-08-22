/**
 * Flow helpers for the web Playwright suite. Mirrors the extension suite's
 * helpers (apps/extension/.playwright/helpers.ts) and selects by the same
 * shared data-testid contract (lock-*, select-recover-button, recover-*,
 * password-*, success-go-to-wallet-button) since web and extension render the
 * same packages/ui AuthFlow components.
 */
import { type Page } from '@playwright/test';

const password = (): string => process.env.SALMON_TEST_PASSWORD ?? '';
const seedA = (): string => process.env.SALMON_TEST_SEED_A ?? '';

export type EntryState = 'unlocked' | 'recovered' | 'home';

export type Consent = 'accept' | 'decline';

/**
 * @param consent - Which button to press on the first-run consent screen.
 *   Defaults to `decline`, so analytics stay OFF unless a spec asks for them.
 */
export async function unlockOrRecover(
  page: Page,
  { consent = 'decline' }: { consent?: Consent } = {}
): Promise<EntryState> {
  // Wait for the app to finish booting into one of the entry surfaces before
  // branching — otherwise the testid counts race the initial React mount.
  await page
    .getByTestId('lock-password-input')
    .or(page.getByTestId('select-recover-button'))
    .or(page.getByTestId('home-screen'))
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {});

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
    await page.getByTestId('recover-word-input-1').fill(seedA());
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
