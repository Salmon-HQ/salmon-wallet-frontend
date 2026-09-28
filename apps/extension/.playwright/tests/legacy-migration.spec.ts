/**
 * A v2 install whose owner never set a password is migrated encrypted.
 *
 * The migration used to carry that state across as it stood and write the seed
 * phrases to chrome.storage.local in cleartext, with no path back. It now
 * refuses until a password is supplied, and has one write path, always
 * encrypted.
 *
 * Seeds a fresh, dedicated profile with the legacy record through the service
 * worker, so nothing else in the suite is touched. The seed is never printed:
 * every assertion on stored values is a boolean.
 */
import { test, expect } from '../fixtures';
import { isBackendUp, requireSecrets } from '../env';

test.use({ profileName: 'legacy-migration', freshProfile: true });

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('migrates a password-less v2 wallet only once a password is chosen, and encrypts it', async ({
  context,
  extensionId,
}) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  requireSecrets(['SALMON_TEST_PASSWORD', 'SALMON_TEST_SEED_A', 'SALMON_TEST_WALLET_A_ADDR']);
  test.setTimeout(3 * 60_000);

  const seed = process.env.SALMON_TEST_SEED_A ?? '';
  const legacy = {
    passwordRequired: false,
    lastNumber: 1,
    wallets: [
      {
        address: process.env.SALMON_TEST_WALLET_A_ADDR,
        path: "m/44'/501'/0'/0'",
        chain: 'SOLANA',
        mnemonic: seed,
      },
    ],
  };

  const [worker] = context.serviceWorkers();
  await worker.evaluate(async (record) => {
    await chrome.storage.local.set({ salmon_wallets: JSON.stringify(record) });
  }, legacy);

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // The wallet asks for a password rather than migrating in cleartext — and
  // it asks on the lock screen, not onboarding, so the v2 wallet is not
  // silently abandoned.
  const lockInput = page.getByTestId('lock-password-input');
  await expect(lockInput).toBeVisible({ timeout: 30_000 });
  // Nothing has been written yet: the legacy record is still the only copy.
  const before = await worker.evaluate(() =>
    chrome.storage.local.get(['salmon_wallets', 'salmon_mnemonics'])
  );
  expect(before.salmon_wallets).toBeDefined();
  expect(before.salmon_mnemonics).toBeUndefined();
  // Evidence for the open copy question: this user never had a password.
  await page.screenshot({ path: test.info().outputPath('legacy-password-prompt.png') });

  await lockInput.fill(process.env.SALMON_TEST_PASSWORD ?? '');
  await page.getByTestId('lock-unlock-button').click();
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 60_000 });

  const after = await worker.evaluate(() =>
    chrome.storage.local.get(['salmon_wallets', 'salmon_mnemonics'])
  );
  const stored = String(after.salmon_mnemonics ?? '');
  expect(stored.length > 0).toBe(true);
  expect(JSON.parse(stored).isEncrypted === true).toBe(true);
  expect(stored.includes(seed)).toBe(false);
  expect(after.salmon_wallets === undefined).toBe(true);
});
