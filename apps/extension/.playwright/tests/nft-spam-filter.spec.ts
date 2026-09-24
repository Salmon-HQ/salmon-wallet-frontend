/**
 * The NFT spam filter's client half: the backend decides what counts as spam
 * and hides it by default; the wallet asks for it (`includeSpam=true`) only
 * while "Show unverified tokens" is on.
 *
 * Asserted on the request the NFTs tab sends, not on which cards appear, so
 * the spec does not depend on any wallet holding spam airdrops. Read-only.
 */
import { test, expect } from '../fixtures';
import type { Page, Request } from '@playwright/test';
import { isBackendUp } from '../env';
import { closeSettings, unlockOrRecover, waitHome } from '../helpers';

// The toggle persists in the profile: start from a wiped one, where it is off.
test.use({ profileName: 'nft-spam-filter', freshProfile: true });

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

/** Open the NFTs tab and return the first NFT-list request it sends. */
async function nftRequestOnOpen(popup: Page): Promise<Request> {
  const request = popup.waitForRequest((r) => /\/v1\/[^/]+\/nft\?/.test(r.url()), {
    timeout: 30_000,
  });
  await popup.getByTestId('portfolio-tab-nfts').click();
  return request;
}

test('asks the backend for spam NFTs only while unverified tokens are shown', async ({ popup }) => {
  test.skip(!backendUp, 'salmon-api (127.0.0.1:3001) not reachable');
  await unlockOrRecover(popup);
  await waitHome(popup);

  const off = await nftRequestOnOpen(popup);
  expect(new URL(off.url()).searchParams.get('includeSpam')).toBeNull();
  await popup.getByTestId('portfolio-tab-portfolio').click();

  await popup.getByTestId('wallet-header-settings-button').click();
  const toggle = popup.getByTestId('settings-unverified-tokens-toggle');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await closeSettings(popup);

  const on = await nftRequestOnOpen(popup);
  expect(new URL(on.url()).searchParams.get('includeSpam')).toBe('true');
});
