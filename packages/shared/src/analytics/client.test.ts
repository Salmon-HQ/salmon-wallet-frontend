/**
 * Client behaviour tests: consent gating, batching, retry, and the invariant
 * that withdrawing consent wipes the queue and the install id.
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
import { createMemoryTransport } from './transport';

/** Lets any `void flush()` microtasks/promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  resetAnalytics();
});

describe('AnalyticsClient consent gating', () => {
  it('is a no-op until consent is granted', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'web', appVersion: '3.0.0', transport });
    await client.whenReady();

    client.track('send_completed');
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    expect(client.getConsent()).toBe(false);
  });

  it('sends events once consent is granted', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'mobile', appVersion: '3.1.0', transport });
    await client.whenReady();

    await client.setConsent(true);
    client.track('swap_completed', { from_chain: 'solana', to_chain: 'solana', success: true });
    await client.flush();

    expect(transport.batches).toHaveLength(1);
    const [batch] = transport.batches;
    expect(batch.context.platform).toBe('mobile');
    expect(batch.context.installId).toBeTruthy();
    expect(batch.events[0]).toMatchObject({
      event: 'swap_completed',
      props: { from_chain: 'solana', to_chain: 'solana', success: true },
    });
  });

  it('persists a random install id on opt-in', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await client.whenReady();

    await client.setConsent(true);
    expect(store.get('salmon_analytics_install_id')).toBeTruthy();
  });
});

describe('AnalyticsClient batching', () => {
  it('flushes automatically when the batch size is reached', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({
      platform: 'web',
      appVersion: '3.0.0',
      transport,
      batchSize: 2,
    });
    await client.whenReady();
    await client.setConsent(true);

    client.track('nft_viewed');
    client.track('send_completed');
    await settle();

    expect(transport.batches).toHaveLength(1);
    expect(transport.batches[0].events).toHaveLength(2);
  });
});

describe('AnalyticsClient strict mode', () => {
  it('throws on an invalid event when strict', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({
      platform: 'web',
      appVersion: '3.0.0',
      transport,
      strict: true,
    });
    await client.whenReady();
    await client.setConsent(true);

    expect(() =>
      client.track('send_completed', { chain: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' })
    ).toThrow();
  });

  it('silently drops an invalid event when not strict', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({
      platform: 'web',
      appVersion: '3.0.0',
      transport,
      strict: false,
    });
    await client.whenReady();
    await client.setConsent(true);

    client.track('send_completed', { chain: 'dogecoin' });
    await client.flush();

    expect(transport.batches).toHaveLength(0);
  });
});

describe('AnalyticsClient withdrawing consent', () => {
  it('clears the queue and the install id', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'web', appVersion: '3.0.0', transport });
    await client.whenReady();

    await client.setConsent(true);
    client.track('nft_viewed');

    await client.setConsent(false);
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    expect(client.getConsent()).toBe(false);
    expect(store.get('salmon_analytics_install_id')).toBeUndefined();

    client.track('nft_viewed');
    await client.flush();
    expect(transport.batches).toHaveLength(0);
  });
});
