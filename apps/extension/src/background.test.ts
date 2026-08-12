// @vitest-environment node
/**
 * Functional tests for the background approval router.
 *
 * The background service worker is the security membrane between untrusted
 * web pages and the wallet: it routes every dApp request (connect / sign /
 * signTransaction / signIn) from the content script to an approval popup and
 * relays only the approval UI's answer back to the origin. These tests drive
 * the real `browser.runtime.onMessage` listener registered by the entrypoint
 * against WXT's fake browser, with only the window/tab APIs stubbed (the
 * fake cannot open real windows).
 *
 * Runs in the node environment: the MV3 service worker has no DOM, and the
 * wxt/testing import chain (esbuild) does not survive jsdom's TextEncoder.
 *
 * Lives outside src/entrypoints/ because WXT treats every file there as a
 * build entrypoint (`wxt prepare` rejects duplicate names).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from './entrypoints/background';

const DAPP_ORIGIN = 'https://dapp.example';
const POPUP_WINDOW_ID = 777;

const CONTENT_CHANNEL = 'salmon_contentscript_background_channel';
const EXTENSION_CHANNEL = 'salmon_extension_background_channel';

type OnMessageListener = (
  message: unknown,
  sender: { id?: string; origin?: string },
  sendResponse: (response?: unknown) => void
) => boolean | void;

/**
 * Registers the real background listeners against the fake browser and
 * captures the onMessage router plus the stubbed window surface.
 */
function startBackground() {
  const addListener = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener');
  const onWindowRemoved = vi.spyOn(fakeBrowser.windows.onRemoved, 'addListener');
  const windowsCreate = vi
    .spyOn(fakeBrowser.windows, 'create')
    .mockResolvedValue({ id: POPUP_WINDOW_ID } as never);
  const windowsRemove = vi
    .spyOn(fakeBrowser.windows, 'remove')
    .mockResolvedValue(undefined as never);
  vi.spyOn(fakeBrowser.windows, 'getLastFocused').mockResolvedValue({
    top: 0,
    left: 0,
    width: 1200,
  } as never);
  vi.spyOn(fakeBrowser.tabs, 'query').mockResolvedValue([] as never);
  // fake-browser has no in-memory onConnect implementation; the keep-alive
  // port is irrelevant to routing, so a no-op registration is enough.
  vi.spyOn(fakeBrowser.runtime.onConnect, 'addListener').mockImplementation(
    () => undefined
  );

  background.main();

  const route = addListener.mock.calls.at(-1)?.[0] as OnMessageListener;
  expect(route).toBeTypeOf('function');
  return { route, windowsCreate, windowsRemove, onWindowRemoved };
}

/** Sender shape for a message relayed by our own content script. */
const ownSender = (origin: string = DAPP_ORIGIN) => ({
  id: fakeBrowser.runtime.id,
  origin,
});

const dappRequest = (
  method: string,
  id = 'req-1',
  params?: Record<string, unknown>
) => ({
  channel: CONTENT_CHANNEL,
  data: { id, method, ...(params ? { params } : {}) },
});

/** Parses the `popup.html#<query>` URL the router hands to windows.create. */
function parsePopupUrl(windowsCreate: ReturnType<typeof vi.fn>) {
  const { url } = windowsCreate.mock.calls[0][0] as { url: string };
  expect(url.startsWith('popup.html#')).toBe(true);
  return new URLSearchParams(url.slice('popup.html#'.length));
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.restoreAllMocks();
});

describe('approval routing', () => {
  it.each(['connect', 'sign', 'signTransaction', 'signIn'])(
    'routes a %s request to an approval popup carrying the payload and origin',
    async (method) => {
      const { route, windowsCreate } = startBackground();
      const sendResponse = vi.fn();

      const keepAlive = route(
        dappRequest(method, `req-${method}`, { network: 'mainnet-beta' }),
        ownSender(),
        sendResponse
      );

      // The router must keep the response channel open for the async answer.
      expect(keepAlive).toBe(true);
      await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalledTimes(1));

      const params = parsePopupUrl(windowsCreate);
      expect(params.get('origin')).toBe(DAPP_ORIGIN);
      expect(params.get('network')).toBe('mainnet-beta');
      const request = JSON.parse(params.get('request') ?? 'null');
      expect(request).toEqual({
        id: `req-${method}`,
        method,
        params: { network: 'mainnet-beta' },
      });
      // Nothing is answered to the origin until the approval UI responds.
      expect(sendResponse).not.toHaveBeenCalled();
    }
  );

  it('answers a trusted origin connect from storage without opening any approval UI', async () => {
    await fakeBrowser.storage.local.set({
      salmon_connection: JSON.stringify({
        blockchain: 'solana',
        address: 'TrustedPubkey111',
      }),
      salmon_active_network_id: JSON.stringify('solana-mainnet'),
      salmon_trusted_apps: JSON.stringify({
        'solana-mainnet': { [DAPP_ORIGIN]: true },
      }),
    });
    const { route, windowsCreate } = startBackground();
    const sendResponse = vi.fn();

    route(dappRequest('connect', 'req-trusted'), ownSender(), sendResponse);

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledTimes(1));
    // The internal callback forwards (data, id?); id is not re-passed here.
    expect(sendResponse).toHaveBeenCalledWith(
      {
        method: 'connected',
        params: { publicKey: 'TrustedPubkey111' },
        id: 'req-trusted',
      },
      undefined
    );
    expect(windowsCreate).not.toHaveBeenCalled();
  });

  it('relays the approval UI answer back to the origin and closes the popup', async () => {
    const { route, windowsCreate, windowsRemove } = startBackground();
    const sendResponse = vi.fn();

    route(dappRequest('signTransaction', 'req-42'), ownSender(), sendResponse);
    await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalledTimes(1));

    // The approval UI (popup page) answers over the extension channel.
    const approvalAnswer = {
      id: 'req-42',
      method: 'signed',
      result: { signature: 'abc' },
    };
    route(
      { channel: EXTENSION_CHANNEL, data: approvalAnswer },
      ownSender(),
      vi.fn()
    );

    expect(sendResponse).toHaveBeenCalledWith(approvalAnswer, 'req-42');
    await vi.waitFor(() =>
      expect(windowsRemove).toHaveBeenCalledWith(POPUP_WINDOW_ID)
    );
  });

  it('answers only the protocol error shape when the approval window closes without a response', async () => {
    const { route, windowsCreate, onWindowRemoved } = startBackground();
    const sendResponse = vi.fn();

    route(dappRequest('sign', 'req-cancelled'), ownSender(), sendResponse);
    await vi.waitFor(() => expect(windowsCreate).toHaveBeenCalledTimes(1));

    // Simulate the user closing the approval popup window.
    const removedListener = onWindowRemoved.mock.calls.at(-1)?.[0] as (
      windowId: number
    ) => void;
    removedListener(POPUP_WINDOW_ID);

    // Consistent with the page-level "never the raw error" tests: the origin
    // sees the protocol shape only — no stack, no internal error object.
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({
      error: 'Operation cancelled',
      id: 'req-cancelled',
    });

    // A late answer for the same id must not reach the origin twice.
    route(
      { channel: EXTENSION_CHANNEL, data: { id: 'req-cancelled', method: 'signed' } },
      ownSender(),
      vi.fn()
    );
    expect(sendResponse).toHaveBeenCalledTimes(1);
  });
});

describe('malformed and untrusted input', () => {
  it('ignores messages from a different extension without crashing or responding', async () => {
    const { route, windowsCreate } = startBackground();
    const sendResponse = vi.fn();

    const result = route(
      dappRequest('signTransaction'),
      { id: 'some-other-extension', origin: DAPP_ORIGIN },
      sendResponse
    );

    expect(result).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(windowsCreate).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('ignores messages on an unknown channel without crashing or invoking any approval flow', async () => {
    const { route, windowsCreate } = startBackground();
    const sendResponse = vi.fn();

    const result = route(
      { channel: 'not_a_salmon_channel', data: { id: 'x', method: 'connect' } },
      ownSender(),
      sendResponse
    );

    expect(result).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(windowsCreate).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('survives a malformed contentscript message (missing data) without crashing or responding', async () => {
    const { route, windowsCreate } = startBackground();
    const sendResponse = vi.fn();

    expect(() => route({ channel: CONTENT_CHANNEL }, ownSender(), sendResponse)).not.toThrow();
    expect(() => route(null, ownSender(), sendResponse)).not.toThrow();
    expect(() =>
      route({ channel: EXTENSION_CHANNEL, data: undefined }, ownSender(), sendResponse)
    ).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(windowsCreate).not.toHaveBeenCalled();
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('answers an unknown method with the fixed protocol error and never opens an approval popup', async () => {
    const { route, windowsCreate } = startBackground();
    const sendResponse = vi.fn();

    route(dappRequest('stealAllFunds', 'req-unknown'), ownSender(), sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      error: 'Unsupported method',
      id: 'req-unknown',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(windowsCreate).not.toHaveBeenCalled();
  });

  it('drops an approval-channel answer with an unknown request id without responding to anyone', () => {
    const { route, windowsRemove } = startBackground();
    const sendResponse = vi.fn();

    route(
      { channel: EXTENSION_CHANNEL, data: { id: 'never-requested', method: 'signed' } },
      ownSender(),
      sendResponse
    );

    expect(sendResponse).not.toHaveBeenCalled();
    expect(windowsRemove).not.toHaveBeenCalled();
  });
});

describe('stash channel session hygiene', () => {
  it('drops the derived key when the lock alarm fires so an unlocked session cannot outlive the timeout', async () => {
    const { route } = startBackground();
    const stash = (data: Record<string, unknown>, sendResponse = vi.fn()) => {
      route(
        { channel: 'salmon_extension_stash_channel', data },
        ownSender(),
        sendResponse
      );
      return sendResponse;
    };

    stash({ method: 'set', key: 'derived_key_cache', value: 'sensitive' });
    expect(
      stash({ method: 'get', key: 'derived_key_cache' })
    ).toHaveBeenCalledWith('sensitive');

    // Setting the derived key must schedule the auto-lock alarm.
    const alarm = await fakeBrowser.alarms.get('salmon_lock_alarm');
    expect(alarm).toBeDefined();

    fakeBrowser.alarms.onAlarm.trigger({
      name: 'salmon_lock_alarm',
      scheduledTime: Date.now(),
      persistAcrossSessions: false,
    });

    expect(
      stash({ method: 'get', key: 'derived_key_cache' })
    ).toHaveBeenCalledWith(undefined);
  });
});
