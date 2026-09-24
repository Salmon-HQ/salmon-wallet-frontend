/**
 * Flow helpers shared across extension specs. Ported from scripts/lib.mjs.
 *
 * Both the lock path and the recover/onboarding path select by the stable
 * data-testid contract (lock-*, select-recover-button, recover-word-input-*,
 * recover-next-button, password-input/confirm, password-submit-button,
 * success-go-to-wallet-button).
 */
import { expect, type Page } from '@playwright/test';

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
  // Wait for whichever entry screen the popup opens on. Counting elements
  // instead answers before the popup has rendered and reads as "home".
  const passwordInput = page.getByTestId('lock-password-input');
  const recoverButton = page.getByTestId('select-recover-button');
  const home = page.getByTestId('home-screen');
  await passwordInput.or(recoverButton).or(home).first().waitFor({ timeout: 30_000 });

  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password());
    await page.getByTestId('lock-unlock-button').click();
    // Unlocked once the lock's own field is gone, however long the vault takes.
    await passwordInput.waitFor({ state: 'detached', timeout: 30_000 });
    return 'unlocked';
  }
  if (!(await recoverButton.isVisible())) return 'home';

  await recoverButton.click();
  // recover-next-button shows only once the seed validates.
  await page.getByTestId('recover-word-input-1').fill(seed);
  await page.getByTestId('recover-next-button').click({ timeout: 30_000 });
  await page.getByTestId('password-input').fill(password());
  await page.getByTestId('password-confirm-input').fill(password());
  await page.getByTestId('password-submit-button').click();
  // Key derivation runs before Success. Leaving Success presents the
  // first-run consent, the last onboarding step; a build without analytics
  // goes straight Home, so wait for whichever comes.
  await page.getByTestId('success-go-to-wallet-button').click({ timeout: 90_000 });
  // On the DOM the decline id names the header; its control is the header's
  // back arrow. Accept is the button itself.
  const consentScreen = page.getByTestId('analytics-consent-screen');
  const consentButton =
    consent === 'decline'
      ? page.getByTestId('analytics-consent-decline').getByTestId('screen-header-back-button')
      : page.getByTestId('analytics-consent-accept');
  await consentButton.or(home).first().waitFor({ timeout: 30_000 });
  if (await consentButton.isVisible()) {
    await consentButton.click();
    await consentScreen.waitFor({ state: 'detached', timeout: 30_000 });
  }
  return 'recovered';
}

export async function waitHome(page: Page): Promise<void> {
  await page.getByTestId('home-screen').waitFor({ state: 'visible', timeout: 30_000 });
}

/**
 * Close Settings, from any depth, and land back on home.
 *
 * Settings is a page with a stack of panels; each panel's back arrow pops one
 * level and the root's closes the page. Panels below the top one stay mounted,
 * arrows included, so only the visible arrow is clicked. A pop is ignored while
 * a panel is still animating, so each click is retried until Settings has
 * unmounted — which also clears the stack for the next open.
 */
export async function closeSettings(page: Page): Promise<void> {
  const settings = page.getByTestId('settings-screen');
  await expect(async () => {
    const back = page.getByTestId('screen-header-back-button').filter({ visible: true });
    if ((await back.count()) > 0) await back.last().click({ timeout: 2_000 });
    await expect(settings).toHaveCount(0, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });
}
