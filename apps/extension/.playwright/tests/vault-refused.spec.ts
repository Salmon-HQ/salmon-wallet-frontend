/**
 * A save refused because the encrypted vault reads absent while wallets are
 * listed offers a way out: a dialog that says nothing was saved, and from it
 * the same two-step reset the lock screen has.
 *
 * The vault is removed through the service worker on a fresh, dedicated
 * profile, so nothing else in the suite is touched. Closing the dialog erases
 * nothing; only the reset's last confirmation does.
 */
import { test, expect } from '../fixtures';
import { isBackendUp, requireSecrets } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

test.use({ profileName: 'vault-refused', freshProfile: true });

test('a refused save offers the reset, and only its last confirmation erases', async ({
  context,
  popup,
}) => {
  test.skip(!(await isBackendUp()), 'salmon-api (127.0.0.1:3001) not reachable');
  requireSecrets(['SALMON_TEST_PASSWORD', 'SALMON_TEST_SEED_B']);
  test.setTimeout(4 * 60_000);

  await unlockOrRecover(popup);
  await waitHome(popup);

  const [worker] = context.serviceWorkers();
  await worker.evaluate(() => chrome.storage.local.remove('salmon_mnemonics'));
  const listed = () =>
    worker.evaluate(async () => {
      const { salmon_accounts: list } = await chrome.storage.local.get('salmon_accounts');
      return list != null;
    });

  await popup.getByTestId('wallet-header-settings-button').click();
  await popup.getByTestId('settings-item-accounts').click();
  await popup.getByTestId('account-add-button').click();
  await popup.getByTestId('account-add-method-import').click();
  await popup
    .getByTestId('account-add-seed-word-input-1')
    .fill(process.env.SALMON_TEST_SEED_B ?? '');
  await popup.getByTestId('account-add-seed-continue-button').click({ timeout: 30_000 });
  await popup.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });

  const reset = popup.getByTestId('vault-refused-reset-button');
  await expect(reset).toBeVisible({ timeout: 90_000 });

  await popup.getByTestId('vault-refused-close-button').click();
  await expect(reset).toHaveCount(0);
  expect(await listed()).toBe(true);

  await popup.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await reset.click({ timeout: 90_000 });
  const confirm = popup.getByTestId('confirm-dialog-confirm');
  // The warning's button and the last confirmation's share an id: wait for the
  // first to be gone, or the second click lands on it as it leaves.
  const warning = await confirm.elementHandle();
  await confirm.click();
  expect(await listed()).toBe(true);
  await warning?.waitForElementState('hidden');
  await confirm.click();

  await expect(popup.getByTestId('select-recover-button')).toBeVisible({ timeout: 30_000 });
  expect(await listed()).toBe(false);
});
