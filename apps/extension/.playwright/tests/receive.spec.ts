/**
 * Receive sheet smoke test: opens from Home and closes again, selecting by the
 * data-testid contract (home-receive-button, receive-sheet, receive-copy-button).
 * The sheet is a native <dialog> (spec 028): it closes on Escape, and leaves
 * the DOM after its exit beat. No copying to clipboard, no on-chain calls.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opens and closes the receive sheet via the data-testid contract', async ({ popup }) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);

  await popup.getByTestId('home-receive-button').click();
  await expect(popup.getByTestId('receive-sheet')).toBeVisible();
  await expect(popup.getByTestId('receive-copy-button')).toBeVisible();

  await popup.keyboard.press('Escape');
  await expect(popup.getByTestId('receive-sheet')).toHaveCount(0, { timeout: 10_000 });
  await expect(popup.getByTestId('home-screen')).toBeVisible();
});
