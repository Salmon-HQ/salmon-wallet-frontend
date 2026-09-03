/**
 * Send flow (non-destructive): drives the entry → token-select → address-amount
 * steps via the data-testid contract, then CANCELS. It deliberately does not
 * click send-confirm-button (that submits a real on-chain transaction).
 *
 * Skips when salmon-api is unreachable.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('walks send entry → token → address-amount and cancels (no on-chain tx)', async ({
  popup,
}) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);

  // Entry → the recipient step, the token chosen from its row (spec 028: four steps).
  await popup.getByTestId('home-send-button').click();
  await expect(popup.getByTestId('send-recipient-screen')).toBeVisible();
  await popup.getByTestId('send-selected-token').click();
  await expect(popup.getByTestId('send-token-search-input')).toBeVisible();
  await popup.getByTestId('send-token-row-SOL').click();
  await expect(popup.getByTestId('send-token-search-input')).toHaveCount(0, { timeout: 10_000 });

  // Recipient: Wallet B (never confirmed). Continue → the amount step.
  await popup.getByTestId('send-recipient-input').fill(process.env.SALMON_TEST_WALLET_B_ADDR ?? '');
  await popup.getByTestId('send-continue-button').click({ timeout: 30_000 });
  await expect(popup.getByTestId('send-amount-screen')).toBeVisible();

  // Fill an amount (safe; we never confirm) and see the presets.
  await popup.getByTestId('send-amount-input').fill('0.001');
  await expect(popup.getByTestId('send-shortcuts')).toBeVisible();

  // Back out — never reaches the review, let alone the confirm.
  await popup.getByTestId('send-amount-screen').getByTestId('screen-header-back-button').click();
  await expect(popup.getByTestId('send-recipient-screen')).toBeVisible();
  await popup.getByTestId('send-recipient-screen').getByTestId('screen-header-back-button').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible();
});
