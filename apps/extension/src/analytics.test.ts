/**
 * @vitest-environment jsdom
 */

/**
 * The extension's analytics start-up (spec 042, FR-003): what each window hands
 * the ingest. The side panel is an open; a window opened to approve a dApp's
 * request is not.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The barrel drags the Solana stack in; the real analytics client is all this needs.
vi.mock('@salmon/shared', async () => ({
  ...(await vi.importActual<object>('@salmon/shared/analytics')),
  APP_VERSION: '0.17.1',
}));

import { getAnalytics, resetAnalytics, trackEvent, type AnalyticsBatch } from '@salmon/shared';
import { initStorage } from '@salmon/shared/storage/storage';

import { isDAppApprovalLaunch, startExtensionAnalytics } from './analytics';

const fetchMock = vi.fn(async () => ({ ok: true, status: 202 }));

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
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  window.location.hash = '';
  // Consent was given in an earlier window.
  const stored = new Map<string, string>([['salmon_analytics_consent', 'true']]);
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
});
