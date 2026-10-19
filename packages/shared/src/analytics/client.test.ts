/**
 * Client behaviour tests: consent gating, batching, retry, delivery, sessions,
 * and the invariant that withdrawing consent wipes the queue and the install id.
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
    ANALYTICS_CONSENT_PROMPTED: 'salmon_analytics_consent_prompted',
  },
}));

import { initAnalytics, resetAnalytics } from './client';
import { createMemoryTransport } from './transport';
import type { AnalyticsBatch, AnalyticsPlatform } from './types';

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
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await client.whenReady();

    client.track('send_completed');
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    expect(client.getConsent()).toBe(false);
  });

  it('sends events once consent is granted', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.1.0', transport });
    await client.whenReady();

    await client.setConsent(true);
    client.track('send_completed', { chain: 'solana', success: true });
    await client.flush();

    expect(transport.batches).toHaveLength(1);
    const [batch] = transport.batches;
    expect(batch.context.platform).toBe('ios');
    expect(batch.context.installId).toBeTruthy();
    expect(batch.events[0]).toMatchObject({
      event: 'send_completed',
      props: { chain: 'solana', success: true },
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
      platform: 'extension',
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
      platform: 'extension',
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
      platform: 'extension',
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
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
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

  // The persisted flag decides what the next launch does. Leaving `true` on
  // disk under a toggle that reads OFF means collection resumes, under the same
  // install id, without the user being told.
  it('does not leave consent granted on disk when the write fails', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);
    expect(store.get('salmon_analytics_consent')).toBe(true);

    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    memStorage.setItem.mockRejectedValueOnce(new Error('disk full'));
    await client.setConsent(false);

    // Neither `true`, nor an install id: absent consent is not consent.
    expect(store.get('salmon_analytics_consent')).toBeUndefined();
    expect(store.get('salmon_analytics_install_id')).toBeUndefined();
    expect(client.getConsent()).toBe(false);
  });

  it('drops a batch that was in flight when consent was withdrawn', async () => {
    const attempts: AnalyticsBatch[] = [];
    let failInFlight: () => void = () => {};
    const transport = {
      send: (batch: AnalyticsBatch): Promise<void> => {
        attempts.push(batch);
        return new Promise<void>((_resolve, reject) => {
          failInFlight = () => reject(new Error('network down'));
        });
      },
    };

    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);
    client.track('nft_viewed');

    void client.flush();
    await settle();
    expect(attempts).toHaveLength(1);

    // Withdrawn mid-send: the failed batch must not be re-queued for a retry.
    await client.setConsent(false);
    failInFlight();
    await settle();

    await client.setConsent(true);
    await client.flush();

    expect(attempts).toHaveLength(1);
  });
});

describe('AnalyticsClient consent persistence across restarts', () => {
  it('keeps a declined choice, and does not re-prompt', async () => {
    const first = initAnalytics({
      platform: 'extension',
      appVersion: '3.0.0',
      transport: createMemoryTransport(),
    });
    await first.whenReady();
    await first.setConsent(false);
    await first.markPrompted();

    resetAnalytics();

    const transport = createMemoryTransport();
    const restarted = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await restarted.whenReady();

    expect(restarted.getConsent()).toBe(false);
    expect(restarted.getPrompted()).toBe(true);

    restarted.track('nft_viewed');
    await restarted.flush();
    expect(transport.batches).toHaveLength(0);
  });

  it('keeps a granted choice', async () => {
    const first = initAnalytics({
      platform: 'extension',
      appVersion: '3.0.0',
      transport: createMemoryTransport(),
    });
    await first.whenReady();
    await first.setConsent(true);

    resetAnalytics();

    const transport = createMemoryTransport();
    const restarted = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await restarted.whenReady();

    expect(restarted.getConsent()).toBe(true);

    restarted.track('nft_viewed');
    await restarted.flush();
    expect(transport.batches).toHaveLength(1);
  });
});

/** Event names per batch, in the order the batches left. */
const sentEvents = (batches: AnalyticsBatch[]) => batches.map((b) => b.events.map((e) => e.event));

// FR-016: consent is read asynchronously; an event recorded in the first
// moments of a window or an app start must wait for it, not be dropped.
describe('AnalyticsClient before consent is read', () => {
  it('sends an early event when consent is stored', async () => {
    store.set('salmon_analytics_consent', true);
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });

    client.track('app_opened');
    await client.whenReady();
    await settle();
    await client.flush();

    expect(sentEvents(transport.batches)).toEqual([['app_opened']]);
  });

  it('drops an early event when no consent is stored', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });

    client.track('app_opened');
    await client.whenReady();
    await settle();
    await client.setConsent(true);
    await client.flush();

    expect(transport.batches).toHaveLength(0);
  });

  it('still throws at the call site in strict mode', () => {
    store.set('salmon_analytics_consent', true);
    const client = initAnalytics({
      platform: 'extension',
      appVersion: '3.0.0',
      transport: createMemoryTransport(),
      strict: true,
    });

    expect(() =>
      client.track('send_completed', { chain: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' })
    ).toThrow();
  });
});

// FR-005: on Android the platform waits for the Seed Vault check.
describe('AnalyticsClient with a platform still being decided', () => {
  it('sends no batch before the platform is known, then carries it', async () => {
    store.set('salmon_analytics_consent', true);
    let resolvePlatform: (platform: AnalyticsPlatform) => void = () => {};
    const platform = new Promise<AnalyticsPlatform>((resolve) => {
      resolvePlatform = resolve;
    });
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform, appVersion: '3.0.0', transport });

    await settle();
    client.track('app_opened');
    await client.flush();
    expect(transport.batches).toHaveLength(0);

    resolvePlatform('seeker');
    await client.whenReady();
    await settle();
    await client.flush();

    expect(sentEvents(transport.batches)).toEqual([['app_opened']]);
    expect(transport.batches[0].context.platform).toBe('seeker');
  });
});

// FR-015: a window can close while a send is in flight; whatever it recorded
// since must leave on the flush its closing triggers.
describe('AnalyticsClient delivery', () => {
  it('sends an event tracked during an in-flight send on the next flush', async () => {
    const sent: AnalyticsBatch[] = [];
    const transport = {
      send: (batch: AnalyticsBatch): Promise<void> => {
        sent.push(batch);
        return new Promise<void>(() => {});
      },
    };
    const client = initAnalytics({ platform: 'extension', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    client.track('nft_viewed');
    void client.flush();
    client.track('wallet_switched');
    void client.flush();

    expect(sentEvents(sent)).toEqual([['nft_viewed'], ['wallet_switched']]);
  });

  // The backend takes at most 100 events per batch and drops the rest.
  it('sends 150 queued events as two requests of at most 100', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({
      platform: 'extension',
      appVersion: '3.0.0',
      transport,
      batchSize: 1000,
    });
    await client.whenReady();
    await client.setConsent(true);

    for (let i = 0; i < 150; i++) client.track('nft_viewed');
    await client.flush();

    expect(transport.batches.map((b) => b.events.length)).toEqual([100, 50]);
  });
});

// FR-004: on mobile each open starts a session.
describe('AnalyticsClient sessions', () => {
  it('sends queued events under the old session id and the next event under a new one', async () => {
    const transport = createMemoryTransport();
    const client = initAnalytics({ platform: 'ios', appVersion: '3.0.0', transport });
    await client.whenReady();
    await client.setConsent(true);

    client.track('wallet_switched');
    client.startSession();
    client.track('app_opened');
    await client.flush();

    expect(sentEvents(transport.batches)).toEqual([['wallet_switched'], ['app_opened']]);
    const [before, after] = transport.batches;
    expect(after.context.sessionId).not.toBe(before.context.sessionId);
  });
});
