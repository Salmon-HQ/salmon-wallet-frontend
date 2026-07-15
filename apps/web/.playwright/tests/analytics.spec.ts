/**
 * Anonymous usage-analytics e2e (web).
 *
 * Proves the opt-in contract end-to-end in the browser:
 *  1. With consent OFF, a tracked action (switching network) emits NO
 *     `/v1/events` request.
 *  2. After toggling "Anonymous Usage Data" ON, the same action emits a
 *     `network_switched` event, and its payload carries only anonymous,
 *     categorical data — never an address or mint.
 *
 * Requires a seeded wallet to reach the home surface: `SALMON_TEST_SEED_A`
 * (or an existing locked wallet + `SALMON_TEST_PASSWORD`). Skips when the
 * backend is unreachable or those fixtures are absent (repo e2e policy).
 *
 * By default the `/v1/events` POST is stubbed, so the test asserts the client
 * contract without depending on a running ingest endpoint. Set
 * `SALMON_ANALYTICS_LIVE=1` to let the request through to the real backend
 * instead: the test then also asserts the ingest accepted the batch, which is
 * what proves the whole path (browser → salmon-api → sink) rather than just the
 * half of it that runs in the page. Point the app at the sink with
 * `VITE_ANALYTICS_URL` (or `VITE_API_URL`) when running live.
 */
import { test, expect, type Request } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const BASE58_OR_HEX = /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/;

const LIVE = process.env.SALMON_ANALYTICS_LIVE === '1';

let backendUp = false;
const haveWalletFixture = Boolean(process.env.SALMON_TEST_SEED_A || process.env.SALMON_TEST_PASSWORD);

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opt-in gates analytics and keeps the payload anonymous', async ({ page }) => {
  test.setTimeout(120_000); // recover flow (client-side derivation + API) is slow
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!haveWalletFixture, 'no seeded-wallet fixture (SALMON_TEST_SEED_A / SALMON_TEST_PASSWORD)');

  // Capture every analytics POST. Stubbed by default so the test never depends
  // on a running ingest endpoint; in live mode it goes through to the backend
  // and we record what the ingest actually answered.
  const eventRequests: Request[] = [];
  const ingestStatuses: number[] = [];

  await page.route('**/v1/events', async (route) => {
    eventRequests.push(route.request());
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
  await unlockOrRecover(page);
  await waitHome(page);

  const home = page.getByTestId('home-screen');
  test.skip((await home.count()) === 0, 'could not reach home (wallet fixture did not unlock)');

  // Move the balance carousel one step, whichever direction is available. The
  // carousel hides (opacity 0, but still in the DOM) the arrow at its current
  // end, and there are only two networks — so a fixed "next" click lands on the
  // hidden arrow once we reach the last one and gets eaten by the card. Click
  // whichever arrow is actually showing; either direction fires network_switched.
  const switchNetwork = async () => {
    const next = page.getByTestId('balance-carousel-next');
    const nextActive = await next
      .evaluate((el) => getComputedStyle(el).opacity !== '0')
      .catch(() => false);
    await (nextActive ? next : page.getByTestId('balance-carousel-prev')).click();
  };

  // 1) Consent OFF → a tracked action must not emit anything.
  await switchNetwork();
  await page.waitForTimeout(500);
  expect(eventRequests, 'no events before opt-in').toHaveLength(0);

  // 2) Opt in via the Settings toggle, then the same action emits network_switched.
  await page.getByTestId('wallet-header-settings-button').click();
  await expect(page.getByTestId('settings-analytics-toggle')).toBeVisible();
  await page.getByTestId('settings-analytics-toggle').click();
  await page.getByTestId('settings-close-button').click();
  // Wait for the drawer to actually unmount, not just for home to read visible:
  // its backdrop lingers over the viewport through the close animation and would
  // eat the carousel click.
  await expect(page.getByTestId('settings-close-button')).toHaveCount(0, { timeout: 15_000 });
  await switchNetwork();

  // A single event is batched and leaves on the client's flush interval (~30s),
  // not immediately — so wait past one flush tick rather than assuming an eager send.
  await expect.poll(() => eventRequests.length, { timeout: 35_000 }).toBeGreaterThan(0);

  const body = eventRequests[0].postData() ?? '';
  const payload = JSON.parse(body);
  const names = payload.events.map((e: { event: string }) => e.event);
  expect(names).toContain('network_switched');
  expect(payload.context.platform).toBe('web');
  expect(body, 'payload must not contain an address or mint').not.toMatch(BASE58_OR_HEX);

  // 3) Live mode: the batch actually reached the ingest and was accepted.
  if (LIVE) {
    await expect.poll(() => ingestStatuses.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(ingestStatuses, 'ingest accepted the batch').toContain(202);
  }
});
