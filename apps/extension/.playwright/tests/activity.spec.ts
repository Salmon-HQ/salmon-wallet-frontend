/**
 * Activity flow: open the Activity surface from home and return, via the
 * data-testid contract (home-activity-button, activity-list/activity-empty, activity-detail-sheet,
 * screen-header-back-button). If the test wallet has history, also steps into
 * the first row's detail — which replaces the list inside the same surface
 * rather than stacking a dialog on it — and steps back out to the list.
 * Skips when salmon-api is unreachable.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opens the activity list and returns home via the data-testid contract', async ({ popup }) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);

  await popup.getByTestId('home-activity-button').click();
  await expect(
    popup.getByTestId('activity-list').or(popup.getByTestId('activity-empty'))
  ).toBeVisible({ timeout: 20_000 });

  // If there is history, step into a row's detail and step back to the list.
  const row = popup.getByTestId('activity-tx-row').first();
  if (await row.count()) {
    await row.click();
    // The detail is a sheet over the list (spec 028): Escape drops it and the
    // list is still there underneath, the surface still open.
    await expect(popup.getByTestId('activity-detail-sheet')).toBeVisible();
    await popup.keyboard.press('Escape');
    await expect(popup.getByTestId('activity-detail-sheet')).toHaveCount(0, { timeout: 10_000 });
    await expect(popup.getByTestId('activity-list')).toBeVisible();
    await expect(popup.getByTestId('home-screen')).toHaveCount(0);
  }

  await popup.getByTestId('screen-header-back-button').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible();
});
