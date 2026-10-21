/**
 * A v2 record with no password is protected before it opens.
 *
 * Earlier releases migrated such a record into a cleartext vault; now the
 * wallet shows the record's addresses, so the owner can tell it is theirs, and
 * the create-password screen (two fields and the strength check). Nothing is
 * written until that password is set; then the record is migrated encrypted
 * under it.
 *
 * Seeds a fresh, dedicated profile with the legacy record through the service
 * worker, so nothing else in the suite is touched. The phrase is the public
 * BIP39 test vector, never a funded one.
 */
import { test, expect } from '../fixtures';
import { requireSecrets } from '../env';

test.use({ profileName: 'legacy-migration', freshProfile: true });

const PUBLIC_TEST_VECTOR =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const ADDRESS = 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk';

test('asks a password-less v2 wallet for a new password, then migrates it encrypted', async ({
  context,
  extensionId,
}) => {
  requireSecrets(['SALMON_TEST_PASSWORD']);
  test.setTimeout(3 * 60_000);

  const legacy = {
    passwordRequired: false,
    lastNumber: 1,
    wallets: [
      { address: ADDRESS, path: "m/44'/501'/0'/0'", chain: 'SOLANA', mnemonic: PUBLIC_TEST_VECTOR },
    ],
  };

  const [worker] = context.serviceWorkers();
  await worker.evaluate(async (record) => {
    await chrome.storage.local.set({ salmon_wallets: JSON.stringify(record) });
  }, legacy);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // The record's addresses, beside a new-password form — not the lock screen,
  // which would take any text as the password.
  const addresses = page.getByTestId('password-protect-addresses');
  await expect(addresses).toBeVisible({ timeout: 30_000 });
  await expect(addresses).toContainText(ADDRESS);
  await expect(page.getByTestId('lock-password-input')).toHaveCount(0);

  const before = await worker.evaluate(() =>
    chrome.storage.local.get(['salmon_wallets', 'salmon_mnemonics'])
  );
  expect(before.salmon_wallets).toBeDefined();
  expect(before.salmon_mnemonics).toBeUndefined();

  const password = process.env.SALMON_TEST_PASSWORD ?? '';
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('password-confirm-input').fill(password);
  await page.getByTestId('password-submit-button').click();
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 90_000 });

  const after = await worker.evaluate(() =>
    chrome.storage.local.get(['salmon_wallets', 'salmon_mnemonics'])
  );
  const stored = String(after.salmon_mnemonics ?? '');
  expect(JSON.parse(stored).isEncrypted === true).toBe(true);
  expect(stored.includes('abandon')).toBe(false);
  expect(after.salmon_wallets === undefined).toBe(true);
});
