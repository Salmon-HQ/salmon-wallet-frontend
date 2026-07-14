/**
 * Analytics EVENT COVERAGE (extension popup).
 *
 * analytics.spec.ts proves the opt-in contract on a single event. This spec
 * proves the catalog: it opts in during onboarding and then drives every
 * surface that is supposed to emit, asserting each event actually arrives —
 * the same thing the Maestro suite does for mobile.
 *
 * Scope is the events reachable without spending money on-chain. The remaining
 * five (send_completed, first_send_completed, swap_completed,
 * first_swap_completed, nft_sent) need a real mainnet transaction and live in
 * analytics-coverage-onchain.spec.ts.
 *
 * Deliberately NOT asserted:
 *  - `onboarding_started` fires from the account-selection screen, which runs
 *    BEFORE the consent screen. `track()` is a hard no-op without consent and
 *    does not even queue (client.ts), so on a first install this event is
 *    always dropped — on every platform. It is a known architectural
 *    limitation, documented in docs/ANALYTICS.md, not a wiring bug.
 *  - `biometric_enabled` is mobile-only; the extension has no biometric path.
 *
 * Runs on a FRESH profile: the `first_*` events burn a per-install flag, so a
 * reused profile would only ever emit them once.
 *
 * Requires SALMON_TEST_SEED_A/B + SALMON_TEST_PASSWORD, and a reachable
 * salmon-api. Run live against a local ingest to also prove the batch lands:
 *
 *   SALMON_ANALYTICS_LIVE=1 SALMON_API_URL=http://localhost:3005/local \
 *     pnpm --filter @salmon/extension e2e analytics-coverage
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';
import type { Page, Request } from '@playwright/test';

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';

// Mindfolk Founder #5154 — the one NFT the test wallets can actually render.
const NFT_MINT = 'CNM8WMZvQ15baEV1r4QEW1MPR3xwaotattgtA4abnDmV';

const EXPECTED_EVENTS = [
  'first_receive_viewed',
  'settings_opened',
  'address_book_used',
  'wallet_created',
  'wallet_recovered',
  'wallet_switched',
  'network_switched',
  'nft_viewed',
] as const;

// The client batches on a 30s interval, so nothing leaves eagerly. Two ticks of
// headroom for the tail of the run.
const FLUSH_WAIT_MS = 75_000;

let backendUp = false;

test.use({ profileName: 'analytics-coverage', freshProfile: true });

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

const openSettings = (popup: Page) => popup.getByTestId('wallet-header-settings-button').click();

/**
 * Close the settings drawer. Only works from the root menu: the panels are
 * absolutely positioned over the drawer chrome, so from inside a nested panel
 * the close button is present and "stable" but covered, and the click is
 * swallowed forever.
 */
const closeSettings = (popup: Page) => popup.getByTestId('settings-close-button').click();

/**
 * Walk back up to the settings root menu, however deep the panel stack is.
 *
 * Do not assert a panel is gone by checking whether the one underneath is
 * "visible": the stack renders the top two panels absolutely on top of each
 * other, so the lower one has a real bounding box and reads as visible even
 * while it is completely covered. Counting back buttons is the honest signal —
 * the root menu has none.
 *
 * Depth is not always what it looks like. Saving a contact, for instance, does
 * not navigate anywhere (HomePage's `onSave` only calls `addContact`), so the
 * add form is still on top of the list afterwards and two pops are needed.
 */
async function returnToSettingsMenu(popup: Page): Promise<void> {
  const back = popup.getByTestId('screen-header-back-button');

  for (let depth = 0; depth < 5; depth += 1) {
    const remaining = await back.count();
    if (remaining === 0) break;
    await back.last().click();
    await expect(back).toHaveCount(remaining - 1, { timeout: 15_000 });
  }

  await expect(back).toHaveCount(0, { timeout: 15_000 });
}

/** Leave the NFT detail page. The page underneath keeps its own header mounted. */
const leaveNftDetail = (popup: Page) =>
  popup.getByTestId('screen-header-back-button').last().click();

test('every non-on-chain event in the catalog actually fires', async ({ popup }) => {
  // Onboarding, two account derivations (each scans every supported network),
  // an account switch, and a flush tick. It is genuinely slow.
  test.setTimeout(900_000);
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');
  test.skip(!process.env.SALMON_TEST_SEED_B, 'no second seed fixture (SALMON_TEST_SEED_B)');

  const batches: Request[] = [];
  const ingestStatuses: number[] = [];

  await popup.route('**/v1/events', async (route) => {
    batches.push(route.request());
    if (LIVE) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  popup.on('response', (response) => {
    if (response.url().includes('/v1/events')) ingestStatuses.push(response.status());
  });

  // Onboard and OPT IN. Everything below this line runs with consent granted.
  const entry = await unlockOrRecover(popup, { consent: 'accept' });
  // A reused profile would have already burned the once-per-install `first_*`
  // flags, so the spec would pass on a wallet that never re-emits them. Fail
  // loudly instead of asserting on a lie.
  expect(entry, 'profile was not fresh — the first_* flags are already spent').toBe('recovered');
  await waitHome(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── first_receive_viewed
  await popup.getByTestId('home-receive-button').click();
  await expect(popup.getByTestId('receive-sheet')).toBeVisible();
  await popup.getByTestId('sheet-close-button').click();
  await expect(popup.getByTestId('receive-sheet')).toHaveCount(0);

  // ── nft_viewed — opening an NFT detail page.
  await popup.getByTestId('tab-collectibles').click();
  const nftCard = popup.getByTestId(`nft-card-${NFT_MINT}`);
  await expect(nftCard).toBeVisible({ timeout: 30_000 });
  await nftCard.click();
  await expect(popup.getByTestId('nft-detail-send-button')).toBeVisible({ timeout: 15_000 });
  // The detail page replaces the popup view, tab bar included — leave via the
  // header back button, not the tabs.
  await leaveNftDetail(popup);
  await popup.getByTestId('tab-home').click();
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });

  // ── settings_opened
  await openSettings(popup);
  await expect(popup.getByTestId('settings-item-accounts')).toBeVisible({ timeout: 10_000 });

  // ── address_book_used — saving a contact.
  await popup.getByTestId('settings-item-address-book').click();
  await popup.getByTestId('address-book-add-button').click();
  await popup.getByTestId('address-book-label-input').fill('E2E Coverage Contact');
  await popup.getByTestId('address-book-address-input').fill(process.env.SALMON_TEST_WALLET_B_ADDR ?? '');
  const saveContact = popup.getByTestId('address-book-save-button');
  await expect(saveContact).toBeEnabled({ timeout: 20_000 }); // address validation is async
  await saveContact.click();
  // The form neither navigates nor gives feedback, and it does not reset, so
  // there is nothing in the UI to wait on. `address_book_used` landing in the
  // batch is what proves the contact was actually stored.
  await popup.waitForTimeout(1_500);
  await returnToSettingsMenu(popup);

  // ── wallet_created — a DERIVED account reuses the active seed, which the
  //    funnel counts as a create.
  await popup.getByTestId('settings-item-accounts').click();
  await popup.getByTestId('account-add-button').click();
  await popup.getByTestId('account-add-method-derive').click();
  // The panel scans every supported network before offering the candidates, and
  // Continue stays disabled until one is picked.
  const derived = popup.locator('[data-testid^="account-add-derived-"]').first();
  await expect(derived).toBeVisible({ timeout: 120_000 });
  await derived.click();
  await popup.getByTestId('account-add-derive-continue-button').click();
  await popup.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(popup.getByTestId('account-add-button')).toBeVisible({ timeout: 60_000 });

  // ── wallet_recovered — an IMPORTED seed is a recovery.
  await popup.getByTestId('account-add-button').click();
  await popup.getByTestId('account-add-method-import').click();
  await popup.getByTestId('account-add-seed-input').fill(process.env.SALMON_TEST_SEED_B ?? '');
  await popup.getByTestId('account-add-seed-continue-button').click({ timeout: 30_000 });
  await popup.getByTestId('account-add-confirm-button').click({ timeout: 30_000 });
  await expect(popup.getByTestId('account-add-button')).toBeVisible({ timeout: 90_000 });

  // Pop back to the menu before closing: the accounts panel covers the drawer's
  // close button.
  await returnToSettingsMenu(popup);
  await closeSettings(popup);
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });

  // ── wallet_switched — the switcher now holds three accounts; pick another.
  await popup.getByTestId('wallet-header-account-switcher').first().click();
  const otherAccount = popup.locator('[data-testid^="wallet-switcher-account-"]').nth(1);
  await expect(otherAccount).toBeVisible({ timeout: 15_000 });
  await otherAccount.click();
  await expect(popup.getByTestId('home-screen')).toBeVisible({ timeout: 30_000 });

  // ── network_switched — the balance carousel drives changeNetwork(). This runs
  //    LAST on purpose: it moves the active network off Solana, and the address
  //    book validates a contact against whatever network is active, so a Solana
  //    address would stop validating and Save would never enable.
  await popup.getByTestId('balance-carousel-next').click();
  await popup.waitForTimeout(2_000);

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

  const emitted = emittedSoFar();
  const missing = EXPECTED_EVENTS.filter((event) => !emitted.has(event));
  expect(missing, `events wired but never emitted: ${missing.join(', ')}`).toEqual([]);

  // Every batch reports the extension, and no payload may carry an address.
  for (const request of batches) {
    const body = request.postData() ?? '';
    expect(JSON.parse(body).context.platform).toBe('extension');
    expect(body, 'payload must not contain an address or mint').not.toMatch(
      /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/,
    );
  }

  if (LIVE) {
    expect(ingestStatuses, 'ingest accepted the batches').toContain(202);
  }
});
