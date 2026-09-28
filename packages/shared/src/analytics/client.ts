/**
 * Anonymous usage-analytics client.
 *
 * A singleton, framework-agnostic client (mirrors the storage module's
 * init/get pattern). It is opt-in by default: until the user grants consent,
 * `track` is a total no-op — nothing is validated, queued, stored, or sent.
 *
 * Design invariants:
 * - No wallet material ever leaves the device (enforced by `./schema`).
 * - `track` never throws in production; bad events are dropped (or throw in
 *   strict/dev mode so mistakes surface during development).
 * - Withdrawing consent clears the queue and the install id.
 */

import { getStorage, STORAGE_KEYS } from '../storage';
import { validateEvent, safeValidateEvent } from './schema';
import { getOrCreateInstallId, clearInstallId, createSessionId } from './install-id';
import type {
  AnalyticsBatch,
  AnalyticsClientConfig,
  AnalyticsEventPayload,
  AnalyticsProps,
  AnalyticsTransport,
} from './types';
import type { AnalyticsEventName } from './events';
import { createHttpTransport } from './transport';

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_FLUSH_INTERVAL_MS = 30_000;
/** Upper bound on buffered events, so an offline device can't grow unbounded. */
const MAX_QUEUE_LENGTH = 200;

function isDevEnvironment(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

class AnalyticsClient {
  private readonly config: Required<Omit<AnalyticsClientConfig, 'transport' | 'strict'>>;
  private readonly transport: AnalyticsTransport;
  private readonly strict: boolean;

  private readonly sessionId = createSessionId();
  private installId: string | null = null;
  private consent = false;
  private prompted = false;
  private queue: AnalyticsEventPayload[] = [];
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly ready: Promise<void>;

  constructor(config: AnalyticsClientConfig) {
    this.config = {
      platform: config.platform,
      appVersion: config.appVersion,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
    };
    this.transport = config.transport ?? createHttpTransport();
    this.strict = config.strict ?? isDevEnvironment();
    this.ready = this.bootstrap();
  }

  /** Resolves once persisted consent + install id have been loaded. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  private async bootstrap(): Promise<void> {
    try {
      const storage = getStorage();
      const consent = await storage.getItem<boolean>(STORAGE_KEYS.ANALYTICS_CONSENT);
      this.consent = consent === true;
      const prompted = await storage.getItem<boolean>(STORAGE_KEYS.ANALYTICS_CONSENT_PROMPTED);
      this.prompted = prompted === true;
      if (this.consent) {
        this.installId = await getOrCreateInstallId();
        this.startTimer();
      }
    } catch {
      this.consent = false;
    }
  }

  getConsent(): boolean {
    return this.consent;
  }

  /** Whether the user has already answered the first-run consent prompt. */
  getPrompted(): boolean {
    return this.prompted;
  }

  /** Records that the first-run consent prompt has been answered (either way). */
  async markPrompted(): Promise<void> {
    this.prompted = true;
    try {
      await getStorage().setItem(STORAGE_KEYS.ANALYTICS_CONSENT_PROMPTED, true);
    } catch {
      // Best-effort; in-memory flag still prevents re-showing this session.
    }
  }

  /**
   * Grants or withdraws consent, persisting the choice.
   *
   * A withdrawal stops collecting before it tries to write anything, and the
   * write is not allowed to fail quietly. It used to: the persisted flag stayed
   * `true` and the install id stayed on disk while the in-memory flag read
   * `false`, so the toggle showed OFF, said nothing, and the next launch read
   * the stale `true` and resumed sending under the same identity.
   *
   * @throws When the choice could not be persisted. The caller surfaces it;
   * collection has already stopped either way.
   */
  async setConsent(enabled: boolean): Promise<void> {
    this.consent = enabled;

    if (!enabled) {
      this.stopTimer();
      this.queue = [];
      this.installId = null;
    }

    const storage = getStorage();

    if (!enabled) {
      // A withdrawal that cannot be written must not leave `true` on disk: the
      // next launch would read it, restore the same install id and resume
      // sending under a toggle that reads OFF. Absent consent is not consent,
      // so removing the key is a sound second attempt.
      try {
        await storage.setItem(STORAGE_KEYS.ANALYTICS_CONSENT, false);
      } catch (error) {
        await storage.removeItem(STORAGE_KEYS.ANALYTICS_CONSENT);
        console.warn('Analytics consent withdrawal fell back to removing the key:', error);
      }
      await clearInstallId();
      return;
    }

    await storage.setItem(STORAGE_KEYS.ANALYTICS_CONSENT, true);
    this.installId = await getOrCreateInstallId();
    this.startTimer();
  }

  /**
   * Records an event. No-op without consent. Invalid events are dropped (or
   * throw in strict mode).
   */
  track(event: AnalyticsEventName, props: AnalyticsProps = {}): void {
    if (!this.consent) return;

    const validated = this.strict ? validateEvent(event, props) : safeValidateEvent(event, props);
    if (!validated) return;

    this.queue.push({ event: validated.event, props: validated.props, ts: Date.now() });
    if (this.queue.length > MAX_QUEUE_LENGTH) {
      this.queue = this.queue.slice(-MAX_QUEUE_LENGTH);
    }
    if (this.queue.length >= this.config.batchSize) {
      void this.flush();
    }
  }

  /** Sends buffered events. Re-queues on failure for a later retry. */
  async flush(): Promise<void> {
    if (this.flushing || !this.consent || !this.installId || this.queue.length === 0) return;

    this.flushing = true;
    const events = this.queue;
    this.queue = [];

    const batch: AnalyticsBatch = {
      context: {
        installId: this.installId,
        sessionId: this.sessionId,
        platform: this.config.platform,
        appVersion: this.config.appVersion,
      },
      events,
    };

    try {
      await this.transport.send(batch);
    } catch {
      // Best-effort delivery: put the events back (bounded) to retry next tick —
      // unless consent was withdrawn while this batch was in flight, in which
      // case the withdrawal's queue wipe wins and the events are dropped.
      if (this.consent) {
        this.queue = [...events, ...this.queue].slice(-MAX_QUEUE_LENGTH);
      }
    } finally {
      this.flushing = false;
    }
  }

  /** Stops the flush timer. Call on teardown; safe to call repeatedly. */
  shutdown(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.flush(), this.config.flushIntervalMs);
    // Don't keep a Node process alive just for analytics (no-op in RN/browser).
    (this.timer as { unref?: () => void }).unref?.();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

let instance: AnalyticsClient | null = null;

/** Initialises the singleton analytics client. Safe to call once per app boot. */
export function initAnalytics(config: AnalyticsClientConfig): AnalyticsClient {
  instance = new AnalyticsClient(config);
  return instance;
}

export function isAnalyticsInitialized(): boolean {
  return instance !== null;
}

/**
 * Returns the analytics client, or null if it has not been initialised. Callers
 * use optional chaining (`getAnalytics()?.track(...)`) so instrumentation is a
 * safe no-op on platforms that never initialised it.
 */
export function getAnalytics(): AnalyticsClient | null {
  return instance;
}

/** Convenience no-op-safe tracker. */
export function trackEvent(event: AnalyticsEventName, props?: AnalyticsProps): void {
  instance?.track(event, props);
}

/** Resets the singleton, stopping its timer. Test-only. */
export function resetAnalytics(): void {
  instance?.shutdown();
  instance = null;
}

export type { AnalyticsClient };
