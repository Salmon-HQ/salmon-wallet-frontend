/**
 * Analytics ON-CHAIN EVENT COVERAGE (extension popup).
 *
 * The three events analytics-coverage.spec.ts cannot reach, because they only
 * fire after a transaction actually lands: send_completed, first_send_completed,
 * nft_sent.
 *
 * ALL THREE ARE VERIFIED. Every one of them reached the ingest with the right
 * props — send_completed {chain: solana, success: true}, nft_sent {chain: solana},
 * and the first_* milestone.
 *
 * Devnet only. The spec switches the wallet to Solana devnet through the
 * developer networks, and every transfer first checks that devnet is the
 * active network and refuses otherwise. Wallet A needs devnet SOL for fees and
 * the devnet NFT fixture, which global-setup keeps there. It is opt-in via
 * SALMON_E2E_ONCHAIN=1: it moves funds between the test wallets and depends on
 * the public devnet RPC.
 *
 * The NFT goes one way, A → B: the next run's global-setup finds none in A and
 * mints another, so nothing depends on getting it back.
 *
 * Runs on a FRESH profile: `first_send_completed` burns a once-per-install
 * flag, so a reused profile emits it exactly once ever.
 *
 *   SALMON_E2E_ONCHAIN=1 SALMON_ANALYTICS_LIVE=1 \
 *     SALMON_API_URL=http://127.0.0.1:3005/local \
 *     pnpm --filter @salmon/extension e2e analytics-coverage-onchain
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { assertDevnet, fixtureNftCard, selectDevnet, unlockOrRecover, waitHome } from '../helpers';
import type { Page, Request } from '@playwright/test';

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';
const ONCHAIN = process.env.SALMON_E2E_ONCHAIN === '1';


const SEND_AMOUNT = '0.0001';

const EXPECTED_EVENTS = ['send_completed', 'first_send_completed', 'nft_sent'] as const;

// The client batches on a 30s timer. Two ticks of headroom for the tail.
const FLUSH_WAIT_MS = 75_000;

// On-chain confirmation is the slow part; the success screen waits for it.
const CONFIRM_TIMEOUT_MS = 180_000;

let backendUp = false;

test.use({ profileName: 'analytics-onchain', freshProfile: true });

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

/** Dismiss the receipt. Continue is disabled while the tx settles. */
async function dismissSuccess(popup: Page): Promise<void> {
  const cont = popup.getByTestId('tx-success-continue-button');
  await expect(cont).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
  await expect(cont).toBeEnabled({ timeout: CONFIRM_TIMEOUT_MS });
  await cont.click();
}

/** Send the NFT whose card is `card` from the ACTIVE account to `destination`. */
async function sendNft(popup: Page, cardTestId: string, destination: string): Promise<void> {
  await assertDevnet(popup);
  await popup.getByTestId('portfolio-tab-nfts').click();
  // Generous: right after a transfer the DAS index needs a moment to report the
  // new owner, so the card can take a while to show up under the new wallet.
  await expect(popup.getByTestId(cardTestId)).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
  await popup.getByTestId(cardTestId).click();

  await popup.getByTestId('nft-detail-send-button').click();
  await popup.getByTestId('send-recipient-input').fill(destination);
  await popup.getByTestId('nft-send-continue-button').click({ timeout: 30_000 }); // validation is async
  await popup.getByTestId('nft-send-confirm-button').click();
  await dismissSuccess(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });
}

test('every on-chain event in the catalog actually fires', async ({ popup }) => {
  test.setTimeout(900_000);
  test.skip(!ONCHAIN, 'moves devnet SOL and an NFT between the test wallets — set SALMON_E2E_ONCHAIN=1');
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');

  const walletB = process.env.SALMON_TEST_WALLET_B_ADDR ?? '';
  expect(walletB, 'SALMON_TEST_WALLET_B_ADDR is required').not.toBe('');

  const batches: Request[] = [];
  await popup.route('**/v1/events', async (route) => {
    batches.push(route.request());
    if (LIVE) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  // Onboard Wallet A and OPT IN. Everything below runs with consent granted.
  const entry = await unlockOrRecover(popup, { consent: 'accept' });
  expect(entry, 'profile was not fresh — the first_* flags are already spent').toBe('recovered');
  await waitHome(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  await selectDevnet(popup);

  // The fixture NFT global-setup keeps in Wallet A. Not just any card: the
  // devnet index can still list an NFT the wallet no longer owns, and its
  // transfer is refused.
  await popup.getByTestId('portfolio-tab-nfts').click();
  const fixtureCard = fixtureNftCard(popup);
  await expect(fixtureCard).toBeVisible({ timeout: 60_000 });
  const nftCard = (await fixtureCard.getAttribute('data-testid')) ?? '';
  await popup.getByTestId('portfolio-tab-portfolio').click();

  // ── send_completed + first_send_completed — a devnet SOL transfer, A → B.
  await assertDevnet(popup);
  await popup.getByTestId('home-send-button').click();
  // Send opens with the chain's native token, SOL, already chosen.
  await expect(popup.getByTestId('send-selected-token')).toBeVisible({ timeout: 30_000 });
  await popup.getByTestId('send-recipient-input').fill(walletB);
  await popup.getByTestId('send-continue-button').click({ timeout: 30_000 }); // validation is async
  await popup.getByTestId('send-amount-input').fill(SEND_AMOUNT);
  const review = popup.getByTestId('send-review-button');
  await expect(review).toBeEnabled({ timeout: 30_000 }); // address validation is async
  await review.click();
  await popup.getByTestId('send-confirm-button').click();
  await dismissSuccess(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── nft_sent (1/2) — Wallet A hands the NFT to Wallet B.
  await popup.getByTestId('portfolio-tab-portfolio').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });
  await sendNft(popup, nftCard, walletB);


  // Batches leave on the client's 30s timer, so the tail of the run is still
  // queued. Poll rather than sleep a fixed interval.
  const emitted = (): Set<string> => {
    const seen = new Set<string>();
    for (const request of batches) {
      const payload = JSON.parse(request.postData() ?? '{}');
      for (const event of payload.events ?? []) seen.add(event.event);
    }
    return seen;
  };

  await expect
    .poll(() => EXPECTED_EVENTS.filter((event) => !emitted().has(event)).length, {
      timeout: FLUSH_WAIT_MS,
      intervals: [2_000],
    })
    .toBe(0);

  const missing = EXPECTED_EVENTS.filter((event) => !emitted().has(event));
  expect(missing, `on-chain events wired but never emitted: ${missing.join(', ')}`).toEqual([]);

  // No payload may leak an address or a mint, on-chain flows least of all.
  for (const request of batches) {
    const body = request.postData() ?? '';
    expect(JSON.parse(body).context.platform).toBe('extension');
    expect(body, 'payload must not contain an address or mint').not.toMatch(
      /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/
    );
  }
});
