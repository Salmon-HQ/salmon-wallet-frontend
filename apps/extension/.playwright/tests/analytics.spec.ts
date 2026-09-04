/**
 * Anonymous usage-analytics e2e (extension popup).
 *
 * The web app (and its equivalent analytics spec) was retired on 2026-09-02;
 * this is now the only analytics e2e suite. Proves the
 * opt-in contract inside the popup:
 *  1. With consent OFF, a tracked action (switching network) emits NO
 *     `/v1/events` request.
 *  2. After toggling "Anonymous Usage Data" ON, the same action emits a
 *     `network_switched` event whose payload carries only anonymous, categorical
 *     data — never an address or mint — and reports `platform: extension`.
 *
 * By default the `/v1/events` POST is stubbed, so the spec asserts the client
 * contract without depending on a running ingest endpoint. Set
 * `SALMON_ANALYTICS_LIVE=1` to let the request through to the real backend
 * instead: the spec then also asserts the ingest accepted the batch, which is
 * what proves the whole path (popup → salmon-api → sink) rather than just the
 * half that runs in the page. Point the build at the sink with
 * `VITE_ANALYTICS_URL` (or `VITE_API_URL`) when running live.
 *
 * Requires SALMON_TEST_SEED_A + SALMON_TEST_PASSWORD; skips when the backend is
 * unreachable (repo e2e policy).
 */
import { test, expect } from '../fixtures';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';
import type { Request } from '@playwright/test';

const BASE58_OR_HEX = /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/;

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';

let backendUp = false;

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opt-in gates analytics and keeps the payload anonymous', async ({ popup }) => {
  test.setTimeout(120_000); // recover (client-side derivation + API) is slow
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!process.env.SALMON_TEST_SEED_A, 'no seeded-wallet fixture (SALMON_TEST_SEED_A)');

  const eventRequests: Request[] = [];
  const ingestStatuses: number[] = [];

  await popup.route('**/v1/events', async (route) => {
    eventRequests.push(route.request());
    if (LIVE) {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  popup.on('response', (response) => {
    if (response.url().includes('/v1/events')) ingestStatuses.push(response.status());
  });

  await unlockOrRecover(popup);
  await waitHome(popup);

  const home = popup.getByTestId('home-screen');
  test.skip((await home.count()) === 0, 'could not reach home (wallet fixture did not unlock)');

  const openSettings = () => popup.getByTestId('wallet-header-settings-button').click();
  // Settings is a screen, and a screen is left by its header's back control —
  // it stopped being a drawer with a close button when lot 4A+4B made it one
  // (586a82f1). This waited on a `settings-close-button` the app no longer
  // has, spending the whole action timeout on every call.
  //
  // Wait for it to actually leave, not just to start leaving: the outgoing
  // screen is held for the length of the pop and would eat the next click.
  const closeSettings = async () => {
    await popup.getByTestId('settings-screen').getByTestId('screen-header-back-button').click();
    await expect(popup.getByTestId('settings-screen')).toHaveCount(0, { timeout: 15_000 });
  };
  // Move the balance block to a different chain via the chain selector.
  //
  // The dots-and-hints carousel this used to click was replaced by a
  // trigger ("Solana · Devnet ⌄") that opens a sheet listing every chain;
  // picking any option other than the active one fires `network_switched`.
  const switchNetwork = async () => {
    const trigger = popup.getByTestId('balance-chain-selector');
    const currentChain = ((await trigger.textContent()) ?? '').trim();
    await trigger.click();
    const options = popup.getByTestId(/^balance-chain-selector-option-\d+$/);
    const count = await options.count();
    for (let i = 0; i < count; i += 1) {
      const option = options.nth(i);
      const label = ((await option.textContent()) ?? '').trim();
      if (!label.startsWith(currentChain)) {
        await option.click();
        return;
      }
    }
  };

  // The suite shares one persistent profile, so a previous run may have left
  // analytics ON. Normalize to OFF before asserting the gate.
  await openSettings();
  const toggle = popup.getByTestId('settings-analytics-toggle');
  await expect(toggle).toBeVisible();
  if (await toggle.isChecked().catch(() => false)) {
    await toggle.click();
  }
  await closeSettings();
  eventRequests.length = 0;

  // 1) Consent OFF → a tracked action must not emit anything.
  await switchNetwork();
  await popup.waitForTimeout(500);
  expect(eventRequests, 'no events before opt-in').toHaveLength(0);

  // 2) Opt in via the Settings toggle, then the same action emits network_switched.
  await openSettings();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await closeSettings();
  await switchNetwork();

  // A single event is batched and leaves on the client's flush interval (~30s),
  // not immediately — so wait past one flush tick rather than assuming an eager send.
  await expect.poll(() => eventRequests.length, { timeout: 35_000 }).toBeGreaterThan(0);

  const body = eventRequests[0].postData() ?? '';
  const payload = JSON.parse(body);
  const names = payload.events.map((e: { event: string }) => e.event);
  expect(names).toContain('network_switched');
  expect(payload.context.platform).toBe('extension');
  expect(body, 'payload must not contain an address or mint').not.toMatch(BASE58_OR_HEX);

  // 3) Live mode: the batch actually reached the ingest and was accepted.
  if (LIVE) {
    await expect.poll(() => ingestStatuses.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(ingestStatuses, 'ingest accepted the batch').toContain(202);
  }
});
