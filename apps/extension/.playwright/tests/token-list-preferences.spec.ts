/**
 * The token list preference (spec 044): "Token list" in Settings folds Home's
 * Solana list behind a "Show more" row. The spec counts the wallet's own rows
 * first, so it does not depend on how many tokens the test wallet holds, and
 * sets the choice back to All before it ends. Read-only on chain.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { isBackendUp } from '../env';
import { closeSettings, unlockOrRecover, waitHome } from '../helpers';

// The choice persists in the profile: start from a wiped one, where it is All.
test.use({ profileName: 'token-list-preferences', freshProfile: true });

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

/** Home's token rows; the sub-line inside each row carries its own id. */
const tokenRows = (popup: Page) => popup.getByTestId(/^token-row-(?!subline-)/);

async function pickCount(popup: Page, key: '3' | 'all'): Promise<void> {
  await popup.getByTestId('wallet-header-settings-button').click();
  await popup.getByTestId('settings-item-token-list').click();
  await popup.getByTestId(`token-list-count-${key}`).click();
  // Back to the Settings list: the row states the choice.
  await popup
    .getByTestId('settings-panel-tokenList')
    .getByTestId('screen-header-back-button')
    .click();
  await expect(popup.getByTestId('settings-item-token-list-value')).toHaveText(
    key === '3' ? '3 tokens' : 'All',
    { timeout: 10_000 }
  );
  await closeSettings(popup);
}

test('folds Home to three tokens behind "Show more", and back to all', async ({ popup }) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  await unlockOrRecover(popup);
  await waitHome(popup);

  await expect(tokenRows(popup).first()).toBeVisible({ timeout: 30_000 });
  const held = await tokenRows(popup).count();

  await pickCount(popup, '3');
  await expect(tokenRows(popup)).toHaveCount(Math.min(held, 3), { timeout: 10_000 });

  const foldRow = popup.getByTestId('token-list-fold-row');
  if (held > 3) {
    await expect(foldRow).toHaveText(new RegExp(`Show ${held - 3} more`));
    await expect(foldRow).toHaveAttribute('aria-expanded', 'false');
    await foldRow.click();
    await expect(tokenRows(popup)).toHaveCount(held);
    await expect(foldRow).toHaveAttribute('aria-expanded', 'true');
    await foldRow.click();
    await expect(tokenRows(popup)).toHaveCount(3);
  } else {
    await expect(foldRow).toHaveCount(0);
  }

  await pickCount(popup, 'all');
  await expect(tokenRows(popup)).toHaveCount(held, { timeout: 10_000 });
  await expect(foldRow).toHaveCount(0);
});
