/**
 * What a flow records, read where it leaves the device: a consenting client on
 * in-memory storage whose transport keeps every batch. It runs strict, like any
 * test run, so an event or prop outside the catalog throws where it is tracked.
 */
import { createMemoryTransport, initAnalytics, resetAnalytics } from '../analytics';
import type { AnalyticsEventPayload } from '../analytics';
import { initStorage } from '../storage';

export type SentEvent = Omit<AnalyticsEventPayload, 'ts'>;

export async function startTestAnalytics(): Promise<{ sent: () => Promise<SentEvent[]> }> {
  const store = new Map<string, string>();
  initStorage({
    platform: 'extension',
    adapter: {
      getItem: async (key) => store.get(key) ?? null,
      setItem: async (key, value) => {
        store.set(key, value);
      },
      removeItem: async (key) => {
        store.delete(key);
      },
      clear: async () => store.clear(),
    },
  });
  resetAnalytics();
  const transport = createMemoryTransport();
  const client = initAnalytics({ platform: 'ios', appVersion: '0.0.0', transport, strict: true });
  await client.whenReady();
  await client.setConsent(true);
  return {
    sent: async () => {
      await client.flush();
      return transport.batches.flatMap((batch) =>
        batch.events.map(({ event, props }) => ({ event, props }))
      );
    },
  };
}
