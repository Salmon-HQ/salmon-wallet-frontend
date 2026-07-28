/**
 * `trackFirstTime` behaviour: consent gating, once-per-install semantics, and
 * the invariant that the flag is only spent once the event has actually fired
 * (so a "first" survives until the user opts in).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, unknown>();
const memStorage = {
  getItem: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
  setItem: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    store.delete(key);
  }),
};

vi.mock('../storage', () => ({
  getStorage: () => memStorage,
  STORAGE_KEYS: {
    ANALYTICS_CONSENT: 'salmon_analytics_consent',
    ANALYTICS_INSTALL_ID: 'salmon_analytics_install_id',
  },
}));

import { initAnalytics, resetAnalytics } from './client';
import { trackFirstTime } from './first-time';
import { createMemoryTransport } from './transport';

const FLAG = 'salmon_analytics_first_swap' as const;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  resetAnalytics();
});

describe('trackFirstTime', () => {
  it('is a no-op without consent and does not spend the flag', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'mobile', appVersion: '3.0.0', transport });
    await client.whenReady();

    await trackFirstTime('first_swap_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    // Flag untouched so the "first" is still available once consent is granted.
    expect(store.has(FLAG)).toBe(false);
  });

  it('emits once with consent, then sets the flag', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'mobile', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    await trackFirstTime('first_swap_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(1);
    expect(transport.batches[0].events[0]).toMatchObject({ event: 'first_swap_completed' });
    expect(store.get(FLAG)).toBe(true);
  });

  it('does not emit a second time once the flag is set', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'mobile', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    await trackFirstTime('first_swap_completed', FLAG);
    await client.flush();
    await trackFirstTime('first_swap_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(1);
  });

  it('is a no-op when analytics was never initialised', async () => {
    // No initAnalytics() call: getAnalytics() is null, so nothing happens.
    await expect(trackFirstTime('first_swap_completed', FLAG)).resolves.toBeUndefined();
    expect(store.has(FLAG)).toBe(false);
  });
});
