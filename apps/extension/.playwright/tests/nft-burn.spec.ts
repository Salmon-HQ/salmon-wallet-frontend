/**
 * Burning an NFT, on devnet: the fixture NFT global-setup keeps in Wallet A is
 * destroyed, and the next run mints another.
 *
 * Opt-in via SALMON_E2E_ONCHAIN=1, like the on-chain analytics spec: it changes
 * state on chain (devnet only — the guard refuses anything else) and depends on
 * the public devnet RPC.
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { assertDevnet, fixtureNftCard, selectDevnet, unlockOrRecover, waitHome } from '../helpers';

const ONCHAIN = process.env.SALMON_E2E_ONCHAIN === '1';

// On-chain confirmation is the slow part.
const CONFIRM_TIMEOUT_MS = 180_000;

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('burns the fixture NFT on devnet after the irreversible warning', async ({ popup }) => {
  test.setTimeout(6 * 60_000);
  test.skip(!ONCHAIN, 'burns an NFT on devnet — set SALMON_E2E_ONCHAIN=1');
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');

  await unlockOrRecover(popup);
  await waitHome(popup);
  await selectDevnet(popup);
  await assertDevnet(popup);

  await popup.getByTestId('portfolio-tab-nfts').click();
  const card = fixtureNftCard(popup);
  await expect(card).toBeVisible({ timeout: 60_000 });
  const cardTestId = (await card.getAttribute('data-testid')) ?? '';
  await card.click();

  await popup.getByTestId('nft-detail-burn-button').click();
  await expect(popup.getByTestId('nft-burn-screen')).toBeVisible();
  await expect(popup.getByTestId('nft-burn-irreversible-notice')).toBeVisible();
  // Confirm arms once the burn is prepared.
  const confirm = popup.getByTestId('nft-burn-confirm-button');
  await expect(confirm).toBeEnabled({ timeout: 60_000 });
  await confirm.click();

  // The receipt proves the burn landed; its Continue stays disabled while the
  // collection refetches.
  const receipt = popup.getByTestId('tx-success-continue-button');
  await expect(receipt).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
  await expect(popup.getByTestId('nft-burn-error')).toHaveCount(0);
  await expect(receipt).toBeEnabled({ timeout: CONFIRM_TIMEOUT_MS });
  await receipt.click();

  // Back on the collection, the burned NFT is gone from it.
  await expect(popup.getByTestId('portfolio-tab-nfts')).toBeVisible({ timeout: 30_000 });
  await expect(popup.getByTestId(cardTestId)).toHaveCount(0, { timeout: 60_000 });
});
