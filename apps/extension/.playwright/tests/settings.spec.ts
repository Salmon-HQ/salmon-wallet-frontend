/**
 * Settings flow: open the settings drawer from home, enter a couple of
 * read-only panels and return, then close — all via the data-testid contract
 * (wallet-header-settings-button, settings-item-<slug>, screen-header-back-button,
 * settings-close-button). Non-destructive: never touches backup-seed/private-key
 * (secret reveal) or the danger-zone remove actions. Skips when salmon-api is
 * unreachable, matching the other live specs.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opens settings, visits read-only panels, and closes via the data-testid contract', async ({
  popup,
}) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);

  // Open the settings drawer.
  await popup.getByTestId('wallet-header-settings-button').click();
  await expect(popup.getByTestId('settings-item-accounts')).toBeVisible({ timeout: 10_000 });

  // Security panel (read-only: change-password form, no secrets revealed).
  await popup.getByTestId('settings-item-security').click();
  await expect(popup.getByTestId('security-change-password-button')).toBeVisible({
    timeout: 10_000,
  });
  await popup.getByTestId('screen-header-back-button').click();
  // The panel-only control disappears once we pop back to the menu.
  await expect(popup.getByTestId('security-change-password-button')).toHaveCount(0, {
    timeout: 10_000,
  });

  // About panel (static links only).
  await popup.getByTestId('settings-item-about').click();
  await expect(popup.getByTestId('about-link-website')).toBeVisible({ timeout: 10_000 });
  await popup.getByTestId('screen-header-back-button').click();
  await expect(popup.getByTestId('about-link-website')).toHaveCount(0, { timeout: 10_000 });

  // Close the drawer and land back on home.
  await popup.getByTestId('settings-close-button').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 10_000 });
});
