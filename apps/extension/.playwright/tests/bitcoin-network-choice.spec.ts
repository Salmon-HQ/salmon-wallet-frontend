/**
 * Bitcoin network choice (spec 045) on Wallet A, which holds Bitcoin: set up
 * "Solana only" and Home offers no Bitcoin; turn Bitcoin on in Settings and
 * the Bitcoin tab appears (the proof that the "absent" checks bite); stand on
 * it, turn Bitcoin off through the confirmation, and Home is back on Solana
 * with no Bitcoin. Read-only on chain.
 */
import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { isBackendUp } from '../env';
import { closeSettings, unlockOrRecover, waitHome } from '../helpers';

// The choice persists in the profile, and the question is asked only on a
// fresh setup: start from a wiped one.
test.use({ profileName: 'bitcoin-network-choice', freshProfile: true });

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

const BITCOIN_TAB = 'balance-chain-selector-option-bitcoin-mainnet';
const SOLANA_TAB = 'balance-chain-selector-option-solana-mainnet';

async function bitcoinToggle(popup: Page) {
  await popup.getByTestId('wallet-header-settings-button').click();
  const toggle = popup.getByTestId('settings-bitcoin-toggle');
  await toggle.scrollIntoViewIfNeeded();
  return toggle;
}

test('hides Bitcoin after "Solana only", shows it when turned on, hides it again after the confirmation', async ({
  popup,
}) => {
  test.setTimeout(180_000); // recover (client-side derivation + API) is slow
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');

  expect(await unlockOrRecover(popup, { networks: 'solana-only' })).toBe('recovered');
  await waitHome(popup);
  await expect(popup.getByTestId(/^balance-chain-selector-option-bitcoin/)).toHaveCount(0);
  await popup.screenshot({ path: test.info().outputPath('home-solana-only.png') });

  // On: applies at once, no confirmation.
  let toggle = await bitcoinToggle(popup);
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await closeSettings(popup);
  const bitcoinTab = popup.getByTestId(BITCOIN_TAB);
  await expect(bitcoinTab).toBeVisible({ timeout: 15_000 });
  await bitcoinTab.click();
  await expect(bitcoinTab).toHaveAttribute('aria-selected', 'true');
  await popup.screenshot({ path: test.info().outputPath('home-on-bitcoin.png') });

  // Off, standing on Bitcoin: Cancel keeps it on, confirming hides it.
  toggle = await bitcoinToggle(popup);
  await toggle.click();
  await expect(popup.getByText('Hide Bitcoin?')).toBeVisible();
  await popup.getByTestId('confirm-dialog-cancel').click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(popup.getByText('Hide Bitcoin?')).toBeVisible();
  await popup.getByTestId('confirm-dialog-confirm').click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await closeSettings(popup);

  await waitHome(popup);
  await expect(popup.getByTestId(/^balance-chain-selector-option-bitcoin/)).toHaveCount(0);
  // One main network left, so no chain row: the session stands on Solana.
  await expect(popup.getByTestId(SOLANA_TAB)).toHaveCount(0);
  await expect(popup.getByTestId('balance-eye-toggle')).toBeVisible();
  await popup.screenshot({ path: test.info().outputPath('home-back-on-solana.png') });
});
