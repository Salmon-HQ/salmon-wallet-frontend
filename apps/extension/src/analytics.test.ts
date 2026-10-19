/**
 * @vitest-environment jsdom
 */

/**
 * The extension's analytics start-up (spec 042, FR-003, FR-014, FR-015): what
 * each window hands the ingest, where, and when. The side panel is an open; a
 * window opened to approve a dApp's request is not.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

// The barrel drags the Solana stack in; the real analytics client is all this needs.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual<object>('@salmon/shared/analytics')),
  APP_VERSION: '0.17.1',
}));

import { getAnalytics, resetAnalytics, trackEvent, type AnalyticsBatch } from '@salmon/shared';
import { initStorage } from '@salmon/shared/storage/storage';

import { isDAppApprovalLaunch, startExtensionAnalytics } from './analytics';

const fetchMock = vi.fn(async () => ({ ok: true, status: 202 }));
let stored: Map<string, string>;

const APPROVAL_HASH = `#origin=${encodeURIComponent('https://dapp.example')}&request=${encodeURIComponent(
  JSON.stringify({ method: 'connect', id: 1 })
)}`;

/** Everything the window has handed the ingest so far. */
async function sent(): Promise<AnalyticsBatch[]> {
  await getAnalytics()!.whenReady();
  await getAnalytics()!.flush();
  return fetchMock.mock.calls.map(
    (call) => JSON.parse((call as unknown as [string, { body: string }])[1].body) as AnalyticsBatch
  );
}

beforeEach(() => {
  resetAnalytics();
  vi.restoreAllMocks();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  window.location.hash = '';
  // Consent was given in an earlier window, under the v2 text.
  stored = new Map<string, string>([
    ['salmon_analytics_consent', 'true'],
    ['salmon_analytics_consent_version', JSON.stringify('v2')],
  ]);
  initStorage({
    platform: 'extension',
    adapter: {
      getItem: async (key) => stored.get(key) ?? null,
      setItem: async (key, value) => void stored.set(key, value),
      removeItem: async (key) => void stored.delete(key),
      clear: async () => stored.clear(),
    },
  });
});

describe('isDAppApprovalLaunch', () => {
  it('is true only when the hash carries both an origin and a request', () => {
    expect(isDAppApprovalLaunch(APPROVAL_HASH)).toBe(true);
    expect(isDAppApprovalLaunch('#origin=https%3A%2F%2Fdapp.example')).toBe(false);
    expect(isDAppApprovalLaunch('#request=%7B%7D')).toBe(false);
    expect(isDAppApprovalLaunch('')).toBe(false);
  });
});

describe('startExtensionAnalytics', () => {
  it('reports one open from a window that is not an approval', async () => {
    startExtensionAnalytics();

    const batches = await sent();
    expect(batches).toHaveLength(1);
    expect(batches[0].context).toMatchObject({ platform: 'extension', appVersion: '0.17.1' });
    expect(batches[0].events.map((e) => e.event)).toEqual(['app_opened']);
  });

  it('reports no open from an approval window', async () => {
    window.location.hash = APPROVAL_HASH;

    startExtensionAnalytics();
    trackEvent('wallet_switched');

    const batches = await sent();
    expect(batches.flatMap((b) => b.events).map((e) => e.event)).toEqual(['wallet_switched']);
  });

  // FR-021: a consent given before the v2 text keeps the v1 catalog, which has no opens.
  it('reports no open under a consent given before the v2 text', async () => {
    stored.delete('salmon_analytics_consent_version');

    startExtensionAnalytics();
    trackEvent('wallet_switched');

    const batches = await sent();
    expect(batches.flatMap((b) => b.events).map((e) => e.event)).toEqual(['wallet_switched']);
  });
});

// FR-014: only a copy installed from a store reaches production. Unpacked
// loads (developers, Playwright) report `development`; a check that fails
// counts as not a store copy, losing data rather than polluting production.
describe('build routing', () => {
  const PRODUCTION_API = 'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod';
  const STAGING_API = 'https://vdlgzf8qjd.execute-api.us-east-1.amazonaws.com/staging';

  beforeEach(() => {
    // The build talks to the production API, as the store package does.
    vi.stubEnv('VITE_SALMON_ENV', 'production');
    vi.stubEnv('EXPO_PUBLIC_SALMON_ENV', '');
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    vi.stubEnv('VITE_ANALYTICS_URL', '');
    vi.stubEnv('EXPO_PUBLIC_ANALYTICS_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function postedTo(): Promise<string[]> {
    startExtensionAnalytics();
    await sent();
    return fetchMock.mock.calls.map((call) => (call as unknown as [string])[0]);
  }

  it('posts a store install to production', async () => {
    vi.spyOn(fakeBrowser.management, 'getSelf').mockResolvedValue({
      installType: 'normal',
    } as never);
    expect(await postedTo()).toEqual([`${PRODUCTION_API}/v1/events`]);
  });

  it('posts an unpacked install to staging', async () => {
    vi.spyOn(fakeBrowser.management, 'getSelf').mockResolvedValue({
      installType: 'development',
    } as never);
    expect(await postedTo()).toEqual([`${STAGING_API}/v1/events`]);
  });

  it('posts to staging when the browser cannot say how it was installed', async () => {
    vi.spyOn(fakeBrowser.management, 'getSelf').mockRejectedValue(new Error('unavailable'));
    expect(await postedTo()).toEqual([`${STAGING_API}/v1/events`]);
  });
});

// FR-015: a window can close before the 30-second send; what it recorded must
// already be on its way when it hides or goes away.
describe('closing or hiding the window', () => {
  /** Started, consent read and the open queued, nothing sent yet. */
  async function startQuietly(): Promise<void> {
    startExtensionAnalytics();
    await getAnalytics()!.whenReady();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).not.toHaveBeenCalled();
  }

  const sentEvents = () =>
    fetchMock.mock.calls.flatMap((call) =>
      (
        JSON.parse((call as unknown as [string, { body: string }])[1].body) as AnalyticsBatch
      ).events.map((e) => e.event)
    );

  it('starts the send synchronously on pagehide', async () => {
    await startQuietly();

    window.dispatchEvent(new Event('pagehide'));

    expect(sentEvents()).toEqual(['app_opened']);
  });

  it('starts the send synchronously when the window becomes hidden', async () => {
    await startQuietly();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(sentEvents()).toEqual(['app_opened']);
  });

  it('does not send when the window becomes visible', async () => {
    await startQuietly();

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
