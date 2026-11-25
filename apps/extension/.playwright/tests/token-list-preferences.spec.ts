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

async function pick(popup: Page, count: '3' | 'all', floor: '1' | 'off'): Promise<void> {
  await popup.getByTestId('wallet-header-settings-button').click();
  await popup.getByTestId('settings-item-token-list').click();
  await popup.getByTestId(`token-list-count-${count}`).click();
  await popup.getByTestId(`token-list-min-value-${floor}`).click();
  await popup.screenshot({
    path: test.info().outputPath(`token-list-${count}.png`),
    animations: 'disabled',
  });
  // Back to the Settings list: the row states the choice.
  await popup
    .getByTestId('settings-panel-tokenList')
    .getByTestId('screen-header-back-button')
    .click();
  await expect(popup.getByTestId('settings-item-token-list-value')).toHaveText(
    count === '3' ? /^3 tokens/ : 'All',
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

  // Wallet A holds three tokens, one of them dust: the $1 floor is what folds
  // a row there, the count what folds on a fuller wallet.
  await pick(popup, '3', '1');
  const foldRow = popup.getByTestId('token-list-fold-row');
  await expect(foldRow).toHaveAttribute('aria-expanded', 'false', { timeout: 10_000 });
  const shown = await tokenRows(popup).count();
  expect(shown).toBeLessThan(held);
  expect(shown).toBeLessThanOrEqual(3);
  await expect(foldRow).toHaveText(new RegExp(`Show ${held - shown} more token`));

  await popup.screenshot({
    path: test.info().outputPath('home-folded.png'),
    animations: 'disabled',
  });

  await foldRow.click();
  await expect(tokenRows(popup)).toHaveCount(held);
  await popup.screenshot({
    path: test.info().outputPath('home-unfolded.png'),
    animations: 'disabled',
  });
  await expect(foldRow).toHaveAttribute('aria-expanded', 'true');
  await foldRow.click();
  await expect(tokenRows(popup)).toHaveCount(shown);

  await pick(popup, 'all', 'off');
  await expect(tokenRows(popup)).toHaveCount(held, { timeout: 10_000 });
  await expect(foldRow).toHaveCount(0);
});
