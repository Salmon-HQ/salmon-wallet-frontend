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
 * THIS SPENDS REAL MONEY. Every transaction here is Solana mainnet, signed by
 * the seeded test wallets, paying real fees. Amounts are deliberately tiny
 * (0.0001 SOL sent) — the point is to prove the event fires, not to move
 * value. It is opt-in via SALMON_E2E_ONCHAIN=1 so nobody runs it by accident.
 *
 * The NFT is round-tripped A → B → A rather than sent one way. A one-way
 * transfer would strand "Mindfolk Founder #5154" in Wallet B, and it is the
 * fixture the Maestro suite and analytics-coverage.spec.ts both depend on —
 * that is exactly how the mobile flows broke before. Ending where it started
 * keeps this spec repeatable. `nft_sent` therefore fires twice, which is fine:
 * we assert it fired, not how often.
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
import { unlockOrRecover, waitHome } from '../helpers';
import type { Page, Request } from '@playwright/test';

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';
const ONCHAIN = process.env.SALMON_E2E_ONCHAIN === '1';

const NFT_MINT = 'CNM8WMZvQ15baEV1r4QEW1MPR3xwaotattgtA4abnDmV'; // Mindfolk Founder #5154

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

/** Send `NFT_MINT` from the ACTIVE account to `destination`. */
async function sendNft(popup: Page, destination: string): Promise<void> {
  await popup.getByTestId('tab-collectibles').click();
  // Generous: right after a transfer the DAS index needs a moment to report the
  // new owner, so the card can take a while to show up under the new wallet.
  await expect(popup.getByTestId(`nft-card-${NFT_MINT}`)).toBeVisible({
    timeout: CONFIRM_TIMEOUT_MS,
  });
  await popup.getByTestId(`nft-card-${NFT_MINT}`).click();

  await popup.getByTestId('nft-detail-send-button').click();
  await popup.getByTestId('input-address-input').fill(destination);

  const confirm = popup.getByTestId('nft-send-confirm-button');
  await expect(confirm).toBeEnabled({ timeout: 30_000 }); // address validation is async
  await confirm.click();

  // On success the dialog closes and the app navigates back to home.
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
}

test('every on-chain event in the catalog actually fires', async ({ popup }) => {
  test.setTimeout(900_000);
  test.skip(!ONCHAIN, 'spends real SOL on mainnet — set SALMON_E2E_ONCHAIN=1 to run');
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');
  test.skip(!process.env.SALMON_TEST_SEED_B, 'no second seed fixture (SALMON_TEST_SEED_B)');

  const walletA = process.env.SALMON_TEST_WALLET_A_ADDR ?? '';
  const walletB = process.env.SALMON_TEST_WALLET_B_ADDR ?? '';
  expect(walletA, 'SALMON_TEST_WALLET_A_ADDR is required').not.toBe('');
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

  // ── send_completed + first_send_completed — a real SOL transfer, A → B.
  await popup.getByTestId('home-send-button').click();
  await popup.getByTestId('send-token-row-SOL').click();
  await popup.getByTestId('send-recipient-input').fill(walletB);
  await popup.getByTestId('send-amount-input').fill(SEND_AMOUNT);
  const review = popup.getByTestId('send-review-button');
  await expect(review).toBeEnabled({ timeout: 30_000 }); // address validation is async
  await review.click();
  await popup.getByTestId('send-confirm-button').click();
  await dismissSuccess(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── nft_sent (1/2) — Wallet A hands the NFT to Wallet B.
  await popup.getByTestId('tab-home').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });
  await sendNft(popup, walletB);

  // Load Wallet B alongside A so it can sign the return leg. Importing rather
  // than clearing state, which would wipe Wallet A.
  await popup.getByTestId('wallet-header-settings-button').click();
  await popup.getByTestId('settings-item-accounts').click();
  await popup.getByTestId('account-add-button').click();
  await popup.getByTestId('account-add-method-import').click();
  await popup
    .getByTestId('account-add-seed-word-input-1')
    .fill(process.env.SALMON_TEST_SEED_B ?? '');
  await popup.getByTestId('account-add-seed-continue-button').click({ timeout: 30_000 });
  await popup.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(popup.getByTestId('account-add-button')).toBeVisible({ timeout: 120_000 });

  // Escape closes the whole drawer in one go, from any depth. Walking back out
  // of the panel stack does not work here: the panels are absolutely positioned
  // over the drawer chrome, so the close button is visible but covered, and an
  // outgoing panel's back button is deliberately wired to a no-op — the click
  // lands on a dead control and the run hangs with settings open.
  await popup.keyboard.press('Escape');
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── nft_sent (2/2) — Wallet B gives it back, restoring the fixture.
  await sendNft(popup, walletA);

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
