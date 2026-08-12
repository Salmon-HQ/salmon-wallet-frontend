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

  // Entry → token select
  await popup.getByTestId('home-send-button').click();
  await expect(popup.getByTestId('send-token-search-input')).toBeVisible();

  // Pick SOL → address-amount step
  await popup.getByTestId('send-token-row-SOL').click();
  await expect(popup.getByTestId('send-recipient-input')).toBeVisible();
  await expect(popup.getByTestId('send-amount-input')).toBeVisible();

  // Fill amount (safe; we never confirm) and exercise a quick-fill control.
  await popup.getByTestId('send-amount-input').fill('0.001');
  await expect(popup.getByTestId('send-quickfill-MAX')).toBeVisible();

  // Cancel out — never reaches the irreversible confirm step.
  await popup.getByTestId('send-cancel-button').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible();
});
