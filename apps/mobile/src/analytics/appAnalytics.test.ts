/**
 * The mobile app's analytics start-up and open rule (spec 042, FR-003–FR-005,
 * FR-014, FR-015): what leaves the app — the batches posted to the ingest — for
 * each platform, each build and each way of leaving or coming back to the screen.
 */
import type { AnalyticsBatch } from '@salmon/shared';

// The barrel drags the Solana stack in; the real analytics client is all this needs.
jest.mock('@salmon/shared', () => jest.requireActual('../../../../packages/shared/src/analytics'));
jest.mock('../seed-vault/bridge', () => ({ isSeedVaultAvailable: jest.fn() }));

type Modules = {
  app: typeof import('./appAnalytics');
  shared: typeof import('@salmon/shared');
  isSeedVaultAvailable: jest.Mock;
  emit: (state: string) => void;
};

const fetchMock = jest.fn(async () => ({ ok: true, status: 202 }));

/** Fresh module state per test: a new process, as far as the open rule knows. */
function load(os: 'ios' | 'android', channel: string | null = null): Modules {
  jest.doMock('expo-updates', () => ({ __esModule: true, channel }));
  const { AppState, Platform } = require('react-native');
  jest.replaceProperty(Platform, 'OS', os);
  const listeners: ((state: string) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((...args: unknown[]) => {
    listeners.push(args[1] as (state: string) => void);
    return { remove: jest.fn() };
  });

  // Consent was given in an earlier session.
  const stored = new Map<string, string>([['salmon_analytics_consent', 'true']]);
  require('../../../../packages/shared/src/storage/storage').initStorage({
    platform: 'mobile',
    adapter: {
      getItem: async (key: string) => stored.get(key) ?? null,
      setItem: async (key: string, value: string) => void stored.set(key, value),
      removeItem: async (key: string) => void stored.delete(key),
      clear: async () => stored.clear(),
    },
  });

  return {
    app: require('./appAnalytics'),
    shared: require('@salmon/shared'),
    isSeedVaultAvailable: require('../seed-vault/bridge').isSeedVaultAvailable,
    emit: (state) => listeners.forEach((listener) => listener(state)),
  };
}

/** Everything the app has handed the ingest so far. */
async function sent({ shared }: Modules): Promise<AnalyticsBatch[]> {
  await shared.getAnalytics()!.whenReady();
  await shared.getAnalytics()!.flush();
  return fetchMock.mock.calls.map(
    (call) => JSON.parse((call as unknown as [string, { body: string }])[1].body) as AnalyticsBatch
  );
}

const opens = (batches: AnalyticsBatch[]) =>
  batches.flatMap((b) => b.events).filter((e) => e.event === 'app_opened').length;

const PRODUCTION_API = 'https://te4x28v8e0.execute-api.us-east-1.amazonaws.com/prod';
const STAGING_API = 'https://vdlgzf8qjd.execute-api.us-east-1.amazonaws.com/staging';
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
  fetchMock.mockClear();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env = { ...originalEnv };
  delete process.env.EXPO_PUBLIC_ANALYTICS_URL;
  delete process.env.EXPO_PUBLIC_API_URL;
});

afterEach(() => {
  jest.useRealTimers();
  process.env = originalEnv;
});

describe('platform', () => {
  it('is ios on an iPhone', async () => {
    const modules = load('ios');

    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    const [batch] = await sent(modules);
    expect(batch.context).toMatchObject({ platform: 'ios', appVersion: '1.5.0' });
    expect(batch.events.map((e) => e.event)).toEqual(['app_opened']);
  });

  it('is seeker on an Android phone with a secure Seed Vault', async () => {
    const modules = load('android');
    modules.isSeedVaultAvailable.mockResolvedValue(true);

    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    const [batch] = await sent(modules);
    expect(batch.context.platform).toBe('seeker');
  });

  it('is android on any other Android phone', async () => {
    const modules = load('android');
    modules.isSeedVaultAvailable.mockResolvedValue(false);

    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    const [batch] = await sent(modules);
    expect(batch.context.platform).toBe('android');
  });

  it('is android when the Seed Vault check throws', async () => {
    const modules = load('android');
    modules.isSeedVaultAvailable.mockRejectedValue(new Error('native module missing'));

    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    const [batch] = await sent(modules);
    expect(batch.context.platform).toBe('android');
  });

  // The consent prompt, the Settings toggle and the deferred onboarding events
  // all wait for the client to be ready, which waits for the platform.
  it('is android once the bound passes when the Seed Vault check never answers', async () => {
    jest.useFakeTimers();
    const modules = load('android');
    modules.isSeedVaultAvailable.mockReturnValue(new Promise(() => {}));

    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();
    let ready = false;
    void modules.shared
      .getAnalytics()!
      .whenReady()
      .then(() => (ready = true));

    await jest.advanceTimersByTimeAsync(modules.app.SEEKER_CHECK_TIMEOUT_MS - 1);
    expect(ready).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(ready).toBe(true);

    const [batch] = await sent(modules);
    expect(batch.context.platform).toBe('android');
    expect(modules.app.SEEKER_CHECK_TIMEOUT_MS).toBeLessThanOrEqual(2_000);
  });
});

describe('opens', () => {
  it('counts the cold open once per process', async () => {
    const modules = load('ios');
    modules.app.startAnalytics('1.5.0');

    modules.app.trackColdOpen();
    modules.app.trackColdOpen();

    expect(opens(await sent(modules))).toBe(1);
  });

  it('counts a return after the lock rule saw the app leave, in a new session', async () => {
    const modules = load('ios');
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();
    modules.shared.trackEvent('wallet_switched');
    await sent(modules);

    modules.emit('inactive');
    modules.emit('background');
    modules.app.noteAppLeft();
    modules.emit('active');

    const [first, second] = await sent(modules);
    expect(first.events.map((e) => e.event)).toEqual(['app_opened', 'wallet_switched']);
    expect(second.events.map((e) => e.event)).toEqual(['app_opened']);
    expect(second.context.sessionId).not.toBe(first.context.sessionId);
  });

  it('counts each return once', async () => {
    const modules = load('ios');
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    modules.app.noteAppLeft();
    modules.emit('active');
    modules.emit('active');

    expect(opens(await sent(modules))).toBe(2);
  });

  it('does not count an iOS overlay (inactive, then active)', async () => {
    const modules = load('ios');
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    modules.emit('inactive');
    modules.emit('active');

    expect(opens(await sent(modules))).toBe(1);
  });

  it('does not count a return the lock rule did not see as a leave (Seed Vault screen)', async () => {
    const modules = load('android');
    modules.isSeedVaultAvailable.mockResolvedValue(true);
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    modules.emit('background');
    modules.emit('active');

    expect(opens(await sent(modules))).toBe(1);
  });

  it('does not count the Mobile Wallet Adapter sheet coming up, and counts the next return', async () => {
    const modules = load('android');
    modules.isSeedVaultAvailable.mockResolvedValue(false);
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();

    modules.app.noteAppLeft();
    modules.app.setMwaOnScreen(true);
    modules.emit('active');
    expect(opens(await sent(modules))).toBe(1);

    modules.app.noteAppLeft();
    modules.app.setMwaOnScreen(false);
    modules.emit('active');
    expect(opens(await sent(modules))).toBe(2);
  });
});

// FR-014: only a build the public installs from a store reaches production.
// EAS bakes the `production` channel into `production`, `production-apk` and
// `dapp-store`; every other build reports another channel or none.
describe('build routing', () => {
  /** Where the batches went, for a build that talks to the production API. */
  async function postedTo(channel: string | null): Promise<string[]> {
    process.env.EXPO_PUBLIC_SALMON_ENV = 'production';
    const modules = load('ios', channel);
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();
    await sent(modules);
    return fetchMock.mock.calls.map((call) => (call as unknown as [string])[0]);
  }

  it('posts a store build to production', async () => {
    expect(await postedTo('production')).toEqual([`${PRODUCTION_API}/v1/events`]);
  });

  it.each([null, 'staging', 'dapp-store-test'])(
    'posts a build on channel %s to staging',
    async (channel) => {
      expect(await postedTo(channel)).toEqual([`${STAGING_API}/v1/events`]);
    }
  );
});

// FR-015: what the app recorded leaves when it goes to the background, not 30 s later.
describe('background', () => {
  it('sends what is queued once when the app goes to the background', async () => {
    const modules = load('ios');
    modules.app.startAnalytics('1.5.0');
    modules.app.trackColdOpen();
    await modules.shared.getAnalytics()!.whenReady();
    await new Promise((resolve) => setImmediate(resolve));
    expect(fetchMock).not.toHaveBeenCalled();

    modules.emit('inactive');
    modules.emit('background');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const batch = JSON.parse(init.body) as AnalyticsBatch;
    expect(batch.events.map((e) => e.event)).toEqual(['app_opened']);
  });
});
