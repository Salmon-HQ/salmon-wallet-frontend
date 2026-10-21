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

// The real keys: the first-swap flag must be the one August–September 2026
// builds wrote, so its spelling is part of what is tested.
vi.mock('../storage', async () => ({
  getStorage: () => memStorage,
  STORAGE_KEYS: (await vi.importActual<typeof import('../storage/types')>('../storage/types'))
    .STORAGE_KEYS,
}));

import { initAnalytics, resetAnalytics } from './client';
import { trackFirstSwapCompleted, trackFirstTime } from './first-time';
import { createMemoryTransport } from './transport';

const FLAG = 'salmon_analytics_first_send' as const;

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  resetAnalytics();
});

describe('trackFirstTime', () => {
  it('is a no-op without consent and does not spend the flag', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();

    await trackFirstTime('first_send_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    // Flag untouched so the "first" is still available once consent is granted.
    expect(store.has(FLAG)).toBe(false);
  });

  it('emits once with consent, then sets the flag', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    await trackFirstTime('first_send_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(1);
    expect(transport.batches[0].events[0]).toMatchObject({ event: 'first_send_completed' });
    expect(store.get(FLAG)).toBe(true);
  });

  it('does not emit a second time once the flag is set', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    await trackFirstTime('first_send_completed', FLAG);
    await client.flush();
    await trackFirstTime('first_send_completed', FLAG);
    await client.flush();

    expect(transport.batches).toHaveLength(1);
  });

  it('is a no-op when analytics was never initialised', async () => {
    // No initAnalytics() call: getAnalytics() is null, so nothing happens.
    await expect(trackFirstTime('first_send_completed', FLAG)).resolves.toBeUndefined();
    expect(store.has(FLAG)).toBe(false);
  });
});

describe('trackFirstSwapCompleted', () => {
  async function consentingClient() {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);
    return { client, transport };
  }

  it('reports the first swap once per install', async () => {
    const { client, transport } = await consentingClient();

    await trackFirstSwapCompleted();
    await trackFirstSwapCompleted();
    await client.flush();

    expect(transport.batches.flatMap((batch) => batch.events.map((e) => e.event))).toEqual([
      'first_swap_completed',
    ]);
  });

  it('stays silent on an install that reported it from an August–September 2026 build', async () => {
    store.set('salmon_analytics_first_swap', true);
    const { client, transport } = await consentingClient();

    await trackFirstSwapCompleted();
    await client.flush();

    expect(transport.batches).toHaveLength(0);
  });

  // FR-021: a v1 consent drops the event, so the first swap is still unspent
  // when the install accepts the v2 text.
  it('keeps the first swap of a v1 install for after it accepts the v2 text', async () => {
    store.set('salmon_analytics_consent', true);
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();

    await trackFirstSwapCompleted();
    expect(store.has('salmon_analytics_first_swap')).toBe(false);

    await client.setConsent(true);
    await trackFirstSwapCompleted();
    await client.flush();

    expect(transport.batches.flatMap((batch) => batch.events.map((e) => e.event))).toEqual([
      'first_swap_completed',
    ]);
  });
});
