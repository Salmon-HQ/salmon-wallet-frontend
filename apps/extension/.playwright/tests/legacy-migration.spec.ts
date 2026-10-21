/**
 * A v2 record with no password is refused, not migrated.
 *
 * No v2 install without a password is left to migrate, so such a record in
 * storage was put there by something other than the wallet. Migrating it would
 * make whatever is typed at the lock screen the password of seeds someone else
 * chose; the wallet stops on its init-error screen instead and writes nothing.
 *
 * Seeds a fresh, dedicated profile with the legacy record through the service
 * worker, so nothing else in the suite is touched. The phrase is the public
 * BIP39 test vector, never a funded one.
 */
import { test, expect } from '../fixtures';

test.use({ profileName: 'legacy-migration', freshProfile: true });

const PUBLIC_TEST_VECTOR =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test('refuses a password-less v2 wallet and leaves storage as it found it', async ({
  context,
  extensionId,
}) => {
  const legacy = {
    passwordRequired: false,
    lastNumber: 1,
    wallets: [
      {
        address: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
        path: "m/44'/501'/0'/0'",
        chain: 'SOLANA',
        mnemonic: PUBLIC_TEST_VECTOR,
      },
    ],
  };

  const [worker] = context.serviceWorkers();
  await worker.evaluate(async (record) => {
    await chrome.storage.local.set({ salmon_wallets: JSON.stringify(record) });
  }, legacy);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Neither the lock screen (which would take any password) nor onboarding
  // (which would write a new vault beside the record).
  await expect(page.getByTestId('wallet-init-error')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('lock-password-input')).toHaveCount(0);

  const after = await worker.evaluate(() =>
    chrome.storage.local.get(['salmon_wallets', 'salmon_mnemonics'])
  );
  expect(after.salmon_wallets).toBeDefined();
  expect(after.salmon_mnemonics).toBeUndefined();
});
