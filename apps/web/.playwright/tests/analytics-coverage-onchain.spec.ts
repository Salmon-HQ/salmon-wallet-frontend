/**
 * Analytics ON-CHAIN EVENT COVERAGE (web).
 *
 * The five events analytics-coverage.spec.ts cannot reach, because they only
 * fire after a transaction actually lands: send_completed, first_send_completed,
 * swap_completed, first_swap_completed, nft_sent.
 *
 * The extension twin (apps/extension/.playwright/tests/analytics-coverage-onchain.spec.ts)
 * drives the same shared UI against the same wallets; this is that flow on the
 * web shell. Read its header too — the caveats below are the same ones.
 *
 * READ THIS BEFORE RUNNING IT AGAIN. The spec is NOT self-sufficient: the swap
 * pair below has to be checked against what the wallet actually holds first.
 *
 * The token selector only offers what it offers — a token the wallet has spent
 * is simply not in the list, and the list itself loads asynchronously, so its
 * contents depend on the wallet's balance AND on a remote fetch. A hard-coded
 * pair is therefore a snapshot, not an invariant: every run that swaps moves the
 * balance and can invalidate the pair for the next one. On top of that the swap
 * enforces a $1.00 USD minimum, and Wallet A does not hold $1 of most things —
 * the quick-fill shortcuts size the leg off the live balance precisely so the
 * amount does not have to be guessed, but they cannot conjure a position that
 * is not there.
 *
 * THIS SPENDS REAL MONEY. Every transaction here is Solana mainnet, signed by
 * the seeded test wallets, paying real fees. Amounts are deliberately tiny
 * (0.0001 SOL sent, half the SOL balance swapped and swapped straight back) —
 * the point is to prove the event fires, not to move value. It is opt-in via
 * SALMON_E2E_ONCHAIN=1 so nobody runs it by accident.
 *
 * The NFT is round-tripped A → B → A rather than sent one way. A one-way
 * transfer would strand "Mindfolk Founder #5154" in Wallet B, and it is the
 * fixture the Maestro suite and analytics-coverage.spec.ts both depend on —
 * that is exactly how the mobile flows broke before. Ending where it started
 * keeps this spec repeatable. `nft_sent` therefore fires twice, which is fine:
 * we assert it fired, not how often.
 *
 * Each Playwright context starts with empty storage, so onboarding runs fresh
 * and the once-per-install `first_*` flags are unset — a reused wallet would
 * emit `first_send_completed` / `first_swap_completed` exactly once, ever.
 *
 *   SALMON_E2E_ONCHAIN=1 SALMON_ANALYTICS_LIVE=1 \
 *     SALMON_API_URL=http://127.0.0.1:3005/local \
 *     VITE_SALMON_ENV=production VITE_API_URL=http://localhost:3005/local \
 *     VITE_ANALYTICS_URL=http://localhost:3005/local \
 *     pnpm --filter @salmon/web e2e analytics-coverage-onchain
 */
import { test, expect, type Page, type Request } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';
const ONCHAIN = process.env.SALMON_E2E_ONCHAIN === '1';

const NFT_MINT = 'CNM8WMZvQ15baEV1r4QEW1MPR3xwaotattgtA4abnDmV'; // Mindfolk Founder #5154

const SEND_AMOUNT = '0.0001';

/**
 * ONE swap leg, not a round trip — and deliberately so.
 *
 * Both swap events fire on a single leg: `swap_completed` AND
 * `first_swap_completed`. A second, reversing leg would add no coverage; its
 * only job would be to restore the balance. But the return leg is where this
 * flow is fragile, for two infrastructure reasons that a single leg sidesteps
 * entirely:
 *   - The swap form's balance snapshot does not refresh within a session after a
 *     swap settles, so a return leg sized off the just-bought SOL reads the
 *     pre-swap balance and its quick-fill lands under the $1 minimum.
 *   - The just-bought token is not in the selector until the backend indexes the
 *     new balance, so a return leg that has to SELL it cannot even pick it.
 * The extension twin documents the same round trip as "not proven end to end —
 * treat as a manual spec." We take the reliable half.
 *
 * This makes the leg ONE-WAY, so it is a MANUAL spec: before running, look at
 * the wallet and size the leg to what it actually holds. The $1.00 USD minimum
 * is the constraint — a 50% quick-fill needs the sell token to be worth ≳ $2 so
 * half clears $1; MAX needs ≳ $1. Never type the amount: a fixed number drifts
 * with price until it silently falls under the minimum (the rule the Maestro
 * flow proved on mobile, flows/actions/swap/intra-solana-confirm.yaml). SOL is
 * the sell token here because it is the funded side; flip to USDC when USDC is.
 */
const SWAP = { from: 'SOL', to: 'USDC', quickfill: '50%' };

const EXPECTED_EVENTS = [
  'send_completed',
  'first_send_completed',
  'swap_completed',
  'first_swap_completed',
  'nft_sent',
] as const;

// The client batches on a 30s timer. Two ticks of headroom for the tail.
const FLUSH_WAIT_MS = 75_000;

// On-chain confirmation is the slow part; the success screen waits for it.
const CONFIRM_TIMEOUT_MS = 180_000;

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

/**
 * Pick a token in the selector modal, from the loaded LIST — never the featured
 * strip.
 *
 * Web's swap defaults to BTC (the first multi-chain token), so it opens in bridge
 * mode, and the token list is fetched asynchronously. Two things follow, both of
 * which the list row handles and the featured row does not:
 *
 *  1. The featured entry for a symbol can carry a different identity (native vs
 *     bridge address/chain) than the same symbol in the wallet's loaded `tokens`.
 *     Selecting it fails useSwapScreenLogic's reconciliation match, which then
 *     silently reverts the field to the default token (BTC) and clears the
 *     amount — exactly the "from = BTC, amount empty, Review disabled" state a
 *     naive featured click produced here. The list row's token comes straight
 *     from `tokens`, so it matches and sticks.
 *  2. The list rows are skeletons until the fetch settles, so waiting for one
 *     also guarantees the reconciliation has already run and will not clobber
 *     the selection afterwards.
 *
 * Matched case-insensitively: symbols come from the registries and their casing
 * is not ours to predict (BONK arrives as "Bonk").
 */
const selectToken = (page: Page, symbol: string) =>
  page
    .getByTestId(new RegExp(`^token-select-${symbol}$`, 'i'))
    .first()
    .click();

/** Dismiss a TransactionSuccessScreen. Continue is disabled while the tx settles. */
async function dismissSuccess(page: Page): Promise<void> {
  const cont = page.getByTestId('tx-success-continue-button');
  await expect(cont).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
  await expect(cont).toBeEnabled({ timeout: CONFIRM_TIMEOUT_MS });
  await cont.click();
}

/** Run the swap end to end, and land back on the swap form. */
async function doSwap(
  page: Page,
  { from, to, quickfill }: { from: string; to: string; quickfill: string }
): Promise<void> {
  await page.getByTestId('tab-swap').click();

  await page.getByTestId('swap-from-token').click();
  await selectToken(page, from);
  // Confirm the selection stuck before sizing the amount. The token dropdown's
  // aria-label reads "Select token: <symbol>"; if the reconciliation reverted us
  // to the default, this catches it immediately instead of leaving a
  // silently-disabled Review button to time out 60s later.
  await expect(page.getByTestId('swap-from-token')).toHaveAttribute(
    'aria-label',
    new RegExp(`:\\s*${from}$`, 'i'),
    { timeout: 15_000 }
  );

  await page.getByTestId('swap-to-token').click();
  await selectToken(page, to);
  await expect(page.getByTestId('swap-to-token')).toHaveAttribute(
    'aria-label',
    new RegExp(`:\\s*${to}$`, 'i'),
    { timeout: 15_000 }
  );

  await expect(page.getByTestId('swap-from-amount')).toBeVisible({ timeout: 20_000 });

  const review = page.getByTestId('swap-review-button');
  // Re-apply the quick-fill until the leg clears the $1.00 minimum and Review
  // enables. Review only turns on once a live Jupiter quote comes back and the
  // sized leg clears the minimum, so re-clicking absorbs the quote latency; if
  // it never enables, the balance is genuinely under the minimum and the on-screen
  // reason says so.
  await expect(async () => {
    await page.getByTestId(`swap-from-quickfill-${quickfill}`).click();
    await expect(review).toBeEnabled({ timeout: 6_000 });
  }).toPass({ timeout: 120_000, intervals: [4_000] });
  await review.click();

  await page.getByTestId('swap-confirm-button').click({ timeout: 40_000 });
  await dismissSuccess(page);
}

/** Send `NFT_MINT` from the ACTIVE account to `destination`. */
async function sendNft(page: Page, destination: string): Promise<void> {
  await page.getByTestId('tab-collectibles').click();
  // Generous: right after a transfer the DAS index needs a moment to report the
  // new owner, so the card can take a while to show up under the new wallet.
  await expect(page.getByTestId(`nft-card-${NFT_MINT}`)).toBeVisible({
    timeout: CONFIRM_TIMEOUT_MS,
  });
  await page.getByTestId(`nft-card-${NFT_MINT}`).click();

  await page.getByTestId('nft-detail-send-button').click();
  await page.getByTestId('input-address-input').fill(destination);

  const confirm = page.getByTestId('nft-send-confirm-button');
  await expect(confirm).toBeEnabled({ timeout: 30_000 }); // address validation is async
  await confirm.click();

  // On success the dialog closes and the app navigates back to home.
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: CONFIRM_TIMEOUT_MS });
}

test('every on-chain event in the catalog actually fires', async ({ page, browserName }) => {
  test.setTimeout(900_000);
  test.skip(!ONCHAIN, 'spends real SOL on mainnet — set SALMON_E2E_ONCHAIN=1 to run');
  // What is under test is the wiring between UI and the analytics client, not
  // the rendering engine — and every extra engine is another wallet-draining
  // round of mainnet transactions.
  test.skip(browserName !== 'chromium', 'engine-independent wiring; run once on chromium');
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');
  test.skip(!process.env.SALMON_TEST_SEED_B, 'no second seed fixture (SALMON_TEST_SEED_B)');

  const walletA = process.env.SALMON_TEST_WALLET_A_ADDR ?? '';
  const walletB = process.env.SALMON_TEST_WALLET_B_ADDR ?? '';
  expect(walletA, 'SALMON_TEST_WALLET_A_ADDR is required').not.toBe('');
  expect(walletB, 'SALMON_TEST_WALLET_B_ADDR is required').not.toBe('');

  const batches: Request[] = [];
  await page.route('**/v1/events', async (route) => {
    batches.push(route.request());
    if (LIVE) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  await page.goto('/');

  // Onboard Wallet A and OPT IN. Everything below runs with consent granted.
  const entry = await unlockOrRecover(page, { consent: 'accept' });
  expect(entry, 'context was not fresh — the first_* flags are already spent').toBe('recovered');
  await waitHome(page);
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── send_completed + first_send_completed — a real SOL transfer, A → B.
  await page.getByTestId('home-send-button').click();
  await page.getByTestId('send-token-row-SOL').click();
  await page.getByTestId('send-recipient-input').fill(walletB);
  await page.getByTestId('send-amount-input').fill(SEND_AMOUNT);
  const review = page.getByTestId('send-review-button');
  await expect(review).toBeEnabled({ timeout: 30_000 }); // address validation is async
  await review.click();
  await page.getByTestId('send-confirm-button').click();
  await dismissSuccess(page);
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── swap_completed + first_swap_completed — one real Jupiter swap. Both fire
  //    on this single leg.
  await doSwap(page, SWAP);

  // ── nft_sent (1/2) — Wallet A hands the NFT to Wallet B.
  await page.getByTestId('tab-home').click();
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });
  await sendNft(page, walletB);

  // Load Wallet B alongside A so it can sign the return leg. Importing rather
  // than clearing state, which would wipe Wallet A.
  await page.getByTestId('wallet-header-settings-button').click();
  await page.getByTestId('settings-item-accounts').click();
  await page.getByTestId('account-add-button').click();
  await page.getByTestId('account-add-method-import').click();
  await page.getByTestId('account-add-seed-word-input-1').fill(process.env.SALMON_TEST_SEED_B ?? '');
  await page.getByTestId('account-add-seed-continue-button').click({ timeout: 30_000 });
  await page.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(page.getByTestId('account-add-button')).toBeVisible({ timeout: 120_000 });

  // Close the drawer by clicking the MUI backdrop — it fires the Drawer's
  // onClose regardless of focus or how deep the panel stack is. The obvious
  // alternatives all fail here (see analytics-coverage.spec.ts's closeSettings):
  // Escape is dropped because `disableEnforceFocus` leaves focus on document.body
  // outside the modal, the close button sits behind the panels, and walking back
  // panel by panel hangs on the pop animation. The drawer is anchored right, so
  // the top-left corner is always backdrop, never the paper.
  await page
    .locator('.MuiBackdrop-root')
    .last()
    .click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('settings-close-button')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── nft_sent (2/2) — Wallet B gives it back, restoring the fixture.
  await sendNft(page, walletA);

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
    expect(JSON.parse(body).context.platform).toBe('web');
    expect(body, 'payload must not contain an address or mint').not.toMatch(
      /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/
    );
  }
});
