/**
 * Consent-first deferral tests: an onboarding event fired before the consent
 * prompt is answered is parked on-device, then fired exactly once on accept or
 * silently discarded on decline; with consent already decided it fires
 * immediately.
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

const PENDING_KEY = 'salmon_analytics_pending_onboarding_event';

vi.mock('../storage', () => ({
  getStorage: () => memStorage,
  STORAGE_KEYS: {
    ANALYTICS_CONSENT: 'salmon_analytics_consent',
    ANALYTICS_INSTALL_ID: 'salmon_analytics_install_id',
    ANALYTICS_CONSENT_PROMPTED: 'salmon_analytics_consent_prompted',
    ANALYTICS_PENDING_ONBOARDING_EVENT: 'salmon_analytics_pending_onboarding_event',
  },
}));

import { initAnalytics, resetAnalytics, type AnalyticsClient } from './client';
import { trackOnboardingEvent, flushDeferredOnboardingEvent } from './deferred';
import { createMemoryTransport } from './transport';

async function initClient(): Promise<{
  client: AnalyticsClient;
  transport: ReturnType<typeof createMemoryTransport>;
}> {
  const transport = createMemoryTransport();
  const client = initAnalytics({ platform: 'mobile', appVersion: '3.0.0', transport });
  await client.whenReady();
  return { client, transport };
}

/** Mirrors the consent screen: answer the prompt, then flush the deferral. */
async function answerPrompt(client: AnalyticsClient, accepted: boolean): Promise<void> {
  await client.setConsent(accepted);
  await client.markPrompted();
  await flushDeferredOnboardingEvent(accepted);
}

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  resetAnalytics();
});

describe('trackOnboardingEvent + flushDeferredOnboardingEvent', () => {
  it('defer-then-accept fires the event exactly once and clears the flag', async () => {
    const { client, transport } = await initClient();

    await trackOnboardingEvent('wallet_created');
    expect(store.get(PENDING_KEY)).toBe('wallet_created');
    expect(transport.batches).toHaveLength(0);

    await answerPrompt(client, true);
    await client.flush();

    expect(transport.batches).toHaveLength(1);
    expect(transport.batches[0].events).toHaveLength(1);
    expect(transport.batches[0].events[0].event).toBe('wallet_created');
    expect(store.has(PENDING_KEY)).toBe(false);

    // A second flush must not fire it again.
    await flushDeferredOnboardingEvent(true);
    await client.flush();
    expect(transport.batches).toHaveLength(1);
  });

  it('defer-then-decline never fires and clears the flag', async () => {
    const { client, transport } = await initClient();

    await trackOnboardingEvent('wallet_recovered');
    expect(store.get(PENDING_KEY)).toBe('wallet_recovered');

    await answerPrompt(client, false);
    await client.flush();

    expect(transport.batches).toHaveLength(0);
    expect(store.has(PENDING_KEY)).toBe(false);
  });

  it('fires immediately without deferring when consent was already granted', async () => {
    const { client, transport } = await initClient();
    await client.setConsent(true);
    await client.markPrompted();

    await trackOnboardingEvent('wallet_created');
    await client.flush();

    expect(store.has(PENDING_KEY)).toBe(false);
    expect(transport.batches).toHaveLength(1);
    expect(transport.batches[0].events[0].event).toBe('wallet_created');
  });

  it('does not defer (or fire) when consent was already declined', async () => {
    const { client, transport } = await initClient();
    await client.setConsent(false);
    await client.markPrompted();

    await trackOnboardingEvent('wallet_created');
    await client.flush();

    expect(store.has(PENDING_KEY)).toBe(false);
    expect(transport.batches).toHaveLength(0);
  });

  it('is a safe no-op when analytics was never initialised', async () => {
    await trackOnboardingEvent('wallet_created');
    expect(store.has(PENDING_KEY)).toBe(false);

    await expect(flushDeferredOnboardingEvent(true)).resolves.toBeUndefined();
  });
});
