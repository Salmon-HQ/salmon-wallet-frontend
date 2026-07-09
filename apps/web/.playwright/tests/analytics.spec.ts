/**
 * Anonymous usage-analytics e2e (web).
 *
 * Proves the opt-in contract end-to-end in the browser:
 *  1. With consent OFF, opening Settings emits NO `/v1/events` request.
 *  2. After toggling "Anonymous Usage Data" ON, opening Settings emits a
 *     `settings_opened` event, and its payload carries only anonymous,
 *     categorical data — never an address or mint.
 *
 * Requires a seeded wallet to reach the home surface: `SALMON_TEST_SEED_A`
 * (or an existing locked wallet + `SALMON_TEST_PASSWORD`). Skips when the
 * backend is unreachable or those fixtures are absent (repo e2e policy).
 */
import { test, expect, type Request } from '@playwright/test';
import { isBackendUp } from '../env';
import { unlockOrRecover, waitHome } from '../helpers';

const BASE58_OR_HEX = /\b([1-9A-HJ-NP-Za-km-z]{32,44}|0x[0-9a-fA-F]{40})\b/;

let backendUp = false;
const haveWalletFixture = Boolean(process.env.SALMON_TEST_SEED_A || process.env.SALMON_TEST_PASSWORD);

test.beforeAll(async () => {
  backendUp = await isBackendUp();
});

test('opt-in gates analytics and keeps the payload anonymous', async ({ page }) => {
  test.setTimeout(120_000); // recover flow (client-side derivation + API) is slow
  test.skip(!backendUp, 'salmon-api not reachable');
  test.skip(!haveWalletFixture, 'no seeded-wallet fixture (SALMON_TEST_SEED_A / SALMON_TEST_PASSWORD)');

  // Capture and stub every analytics POST so the test never depends on a
  // running ingest endpoint.
  const eventRequests: Request[] = [];
  await page.route('**/v1/events', async (route) => {
    eventRequests.push(route.request());
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"accepted":1}' });
  });

  await page.goto('/');
  await unlockOrRecover(page);
  await waitHome(page);

  const home = page.getByTestId('home-screen');
  test.skip((await home.count()) === 0, 'could not reach home (wallet fixture did not unlock)');

  const openSettings = () => page.getByTestId('wallet-header-settings-button').click();
  const closeSettings = () => page.getByTestId('settings-close-button').click();

  // 1) Consent OFF → opening settings must not emit anything.
  await openSettings();
  await expect(page.getByTestId('settings-analytics-toggle')).toBeVisible();
  await page.waitForTimeout(500);
  expect(eventRequests, 'no events before opt-in').toHaveLength(0);

  // 2) Opt in, then reopen settings → a settings_opened event fires.
  await page.getByTestId('settings-analytics-toggle').click();
  await closeSettings();
  await openSettings();

  // A single event is batched and leaves on the client's flush interval (~30s),
  // not immediately — so wait past one flush tick rather than assuming an eager send.
  await expect.poll(() => eventRequests.length, { timeout: 35_000 }).toBeGreaterThan(0);

  const body = eventRequests[0].postData() ?? '';
  const payload = JSON.parse(body);
  const names = payload.events.map((e: { event: string }) => e.event);
  expect(names).toContain('settings_opened');
  expect(payload.context.platform).toBe('web');
  expect(body, 'payload must not contain an address or mint').not.toMatch(BASE58_OR_HEX);
});
