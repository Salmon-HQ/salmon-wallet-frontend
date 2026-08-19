/**
 * Analytics EVENT COVERAGE (web).
 *
 * analytics.spec.ts proves the opt-in contract on a single event. This spec
 * proves the catalog: it opts in during onboarding and then drives every
 * surface that is supposed to emit, asserting each event actually arrives —
 * the same thing the Maestro suite does for mobile.
 *
 * Scope is the six events reachable without spending money on-chain. The
 * remaining five (send_completed, first_send_completed, swap_completed,
 * first_swap_completed, nft_sent) need a real mainnet transaction and live in
 * analytics-coverage-onchain.spec.ts.
 *
 * Each Playwright context starts with empty storage, so onboarding runs fresh
 * and the once-per-install `first_*` flags are unset.
 *
 * Requires SALMON_TEST_SEED_A/B + SALMON_TEST_PASSWORD, and a reachable
 * salmon-api. Run live against a local ingest to also prove the batch lands:
 *
 *   SALMON_ANALYTICS_LIVE=1 SALMON_API_URL=http://localhost:3005/local \
 *     VITE_API_URL=http://localhost:3005/local \
 *     pnpm --filter @salmon/web e2e analytics-coverage
 */
import { test, expect, type Page, type Request } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';

// Mindfolk Founder #5154 — the one NFT the test wallets can actually render.
const NFT_MINT = 'CNM8WMZvQ15baEV1r4QEW1MPR3xwaotattgtA4abnDmV';

const EXPECTED_EVENTS = [
  'address_book_used',
  'wallet_created',
  'wallet_recovered',
  'wallet_switched',
  'network_switched',
  'nft_viewed',
] as const;

// The client batches on a 30s timer, so nothing leaves eagerly. Two ticks of
// headroom for the tail of the run.
const FLUSH_WAIT_MS = 75_000;

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

const openSettings = (page: Page) => page.getByTestId('wallet-header-settings-button').click();

/**
 * Close the settings drawer, from any depth, and land back on home.
 *
 * Clicks the MUI backdrop, which fires the Drawer's `onClose` regardless of
 * where focus or the panel stack happen to be. Closing resets the stack, so the
 * next `openSettings` lands on the root menu.
 *
 * Why not the obvious alternatives:
 *  - Escape does NOT work here. The Drawer sets `disableEnforceFocus`, so after
 *    interacting with a nested panel focus sits on document.body — outside the
 *    modal's portal — and MUI's Escape listener, bound to the modal root, never
 *    receives the keydown. The drawer stays open.
 *  - The close button is covered: the panels are absolutely positioned over the
 *    drawer chrome, so from inside a nested panel it is present and "stable" but
 *    behind the panel, and the click is swallowed.
 *  - Walking back panel by panel hangs: `handlePop` is a no-op while a panel
 *    animates, and the back button lives inside the transforming panel, so it
 *    never settles into a stable box and is detached mid-retry. That is exactly
 *    how this spec used to hang in the tail of the flow.
 *
 * The backdrop covers the whole viewport; the drawer is anchored right, so the
 * top-left corner is always backdrop, never the paper.
 */
async function closeSettings(page: Page): Promise<void> {
  await page
    .locator('.MuiBackdrop-root')
    .last()
    .click({ position: { x: 8, y: 8 } });
  // The drawer unmounts its root close button when it is actually gone — a more
  // honest signal than home-screen visibility, since home sits behind the drawer
  // and reads as "visible" the whole time it is open.
  await expect(page.getByTestId('settings-close-button')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });
  // The panel stack is reset on a `durationMs.slow` (300ms) timer AFTER the
  // drawer starts closing — which lands right around when the close button
  // unmounts, so reopening immediately can catch the pre-reset stack and drop
  // us back into whatever panel was open (e.g. the address-book form, whose
  // input then eats the next click). Wait past that timer so the next open
  // lands on the root menu.
  await page.waitForTimeout(500);
}

/** Leave the NFT detail page. The page underneath keeps its own header mounted. */
const leaveNftDetail = (page: Page) => page.getByTestId('screen-header-back-button').last().click();

test('every non-on-chain event in the catalog actually fires', async ({ page, browserName }) => {
  // Onboarding, two account derivations (each scans every supported network),
  // an account switch, and a flush tick. It is genuinely slow.
  test.setTimeout(900_000);
  // What is under test is the wiring between UI and the analytics client, not
  // the rendering engine. analytics.spec.ts already covers all three engines for
  // the transport; running this one everywhere would triple a ~7-minute flow.
  test.skip(browserName !== 'chromium', 'engine-independent wiring; run once on chromium');
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');
  test.skip(!process.env.SALMON_TEST_SEED_B, 'no second seed fixture (SALMON_TEST_SEED_B)');

  const batches: Request[] = [];
  const ingestStatuses: number[] = [];

  await page.route('**/v1/events', async (route) => {
    batches.push(route.request());
    if (LIVE) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  page.on('response', (response) => {
    if (response.url().includes('/v1/events')) ingestStatuses.push(response.status());
  });

  await page.goto('/');

  // Onboard and OPT IN. Everything below this line runs with consent granted.
  const entry = await unlockOrRecover(page, { consent: 'accept' });
  // A reused context would have already burned the once-per-install `first_*`
  // flags, so the spec would pass on a wallet that never re-emits them. Fail
  // loudly instead of asserting on a lie.
  expect(entry, 'context was not fresh — the first_* flags are already spent').toBe('recovered');
  await waitHome(page);
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── nft_viewed — opening an NFT detail page (its own /nft/:mint route).
  await page.getByTestId('tab-collectibles').click();
  const nftCard = page.getByTestId(`nft-card-${NFT_MINT}`);
  await expect(nftCard).toBeVisible({ timeout: 30_000 });
  await nftCard.click();
  await expect(page.getByTestId('nft-detail-send-button')).toBeVisible({ timeout: 15_000 });
  await leaveNftDetail(page);
  await page.getByTestId('tab-home').click();
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });

  // Open settings to reach the address-book and accounts panels below.
  await openSettings(page);
  await expect(page.getByTestId('settings-item-accounts')).toBeVisible({ timeout: 10_000 });

  // ── address_book_used — saving a contact.
  await page.getByTestId('settings-item-address-book').click();
  await page.getByTestId('address-book-add-button').click();
  await page.getByTestId('address-book-label-input').fill('E2E Coverage Contact');
  await page
    .getByTestId('address-book-address-input')
    .fill(process.env.SALMON_TEST_WALLET_B_ADDR ?? '');
  const saveContact = page.getByTestId('address-book-save-button');
  await expect(saveContact).toBeEnabled({ timeout: 20_000 }); // address validation is async
  await saveContact.click();
  // The form neither navigates nor gives feedback, and it does not reset, so
  // there is nothing in the UI to wait on. `address_book_used` landing in the
  // batch is what proves the contact was actually stored.
  await page.waitForTimeout(1_500);
  await closeSettings(page);

  // ── wallet_created — a DERIVED account reuses the active seed, which the
  //    funnel counts as a create.
  await openSettings(page);
  await page.getByTestId('settings-item-accounts').click();
  await page.getByTestId('account-add-button').click();
  await page.getByTestId('account-add-method-derive').click();
  // The panel scans every supported network before offering the candidates, and
  // Continue stays disabled until one is picked.
  const derived = page.locator('[data-testid^="account-add-derived-"]').first();
  await expect(derived).toBeVisible({ timeout: 120_000 });
  await derived.click();
  await page.getByTestId('account-add-derive-continue-button').click();
  await page.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(page.getByTestId('account-add-button')).toBeVisible({ timeout: 60_000 });

  // ── wallet_recovered — an IMPORTED seed is a recovery.
  await page.getByTestId('account-add-button').click();
  await page.getByTestId('account-add-method-import').click();
  await page.getByTestId('account-add-seed-word-input-1').fill(process.env.SALMON_TEST_SEED_B ?? '');
  await page.getByTestId('account-add-seed-continue-button').click({ timeout: 30_000 });
  await page.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(page.getByTestId('account-add-button')).toBeVisible({ timeout: 90_000 });

  await closeSettings(page);

  // ── wallet_switched — the switcher now holds three accounts; pick another.
  await page.getByTestId('wallet-header-account-switcher').first().click();
  const otherAccount = page.locator('[data-testid^="wallet-switcher-account-"]').nth(1);
  await expect(otherAccount).toBeVisible({ timeout: 15_000 });
  await otherAccount.click();
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── network_switched — the balance carousel drives changeNetwork(). This runs
  //    LAST on purpose: it moves the active network off Solana, and the address
  //    book validates a contact against whatever network is active, so a Solana
  //    address would stop validating and Save would never enable.
  await page.getByTestId('balance-carousel-next').click();
  await page.waitForTimeout(2_000);

  // Batches leave on the client's 30s timer, so the tail of the run is still in
  // the queue. Poll rather than sleep a fixed interval.
  const emittedSoFar = (): Set<string> => {
    const seen = new Set<string>();
    for (const request of batches) {
      const payload = JSON.parse(request.postData() ?? '{}');
      for (const event of payload.events ?? []) seen.add(event.event);
    }
    return seen;
  };

  await expect
    .poll(() => EXPECTED_EVENTS.filter((event) => !emittedSoFar().has(event)).length, {
      timeout: FLUSH_WAIT_MS,
      intervals: [2_000],
    })
    .toBe(0);

  const missing = EXPECTED_EVENTS.filter((event) => !emittedSoFar().has(event));
  expect(missing, `events wired but never emitted: ${missing.join(', ')}`).toEqual([]);

  // Every batch reports web, and no payload may carry an address.
  for (const request of batches) {
    const body = request.postData() ?? '';
    expect(JSON.parse(body).context.platform).toBe('web');
    expect(body, 'payload must not contain an address or mint').not.toMatch(
      /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/
    );
  }

  if (LIVE) {
    expect(ingestStatuses, 'ingest accepted the batches').toContain(202);
  }
});
