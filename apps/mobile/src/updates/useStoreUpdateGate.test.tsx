import { act, renderHook, waitFor } from '@testing-library/react-native';

// The barrel drags the Solana stack in; the gate needs one pure helper.
jest.mock('@salmon/shared', () =>
  jest.requireActual('../../../../packages/shared/src/utils/storeRelease')
);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.1.0' } },
}));

import Constants from 'expo-constants';

import { STORE_RELEASE_URL, useStoreUpdateGate } from './useStoreUpdateGate';

const constants = Constants as unknown as { expoConfig: { version: string } };

/** A fetch that answers with `file`; the shape the gate reads, not a full Response. */
function publish(file: unknown, ok = true): typeof fetch {
  return jest.fn(async () => ({ ok, json: async () => file })) as unknown as typeof fetch;
}

describe('useStoreUpdateGate', () => {
  const originalFetch = global.fetch;
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    constants.expoConfig = { version: '1.1.0' };
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it('asks for the published minimum without a cache', async () => {
    global.fetch = publish({ ios: { minimumVersion: '1.0.0' } });

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith(
      STORE_RELEASE_URL,
      expect.objectContaining({ cache: 'no-store' })
    );
  });

  it('requires the update when the minimum is newer than this build', async () => {
    global.fetch = publish({
      ios: { minimumVersion: '1.2.0' },
      android: { minimumVersion: '1.2.0' },
    });

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(true);
  });

  it('opens the app on the minimum itself', async () => {
    constants.expoConfig = { version: '1.2.0' };
    global.fetch = publish({
      ios: { minimumVersion: '1.2.0' },
      android: { minimumVersion: '1.2.0' },
    });

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(false);
  });

  // The rule that matters most: a wallet must open even when everything about
  // the published file is broken.
  it('opens the app when the fetch throws', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('no network');
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(false);
  });

  it('opens the app when the server answers with an error', async () => {
    global.fetch = publish({ ios: { minimumVersion: '9.0.0' } }, false);

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(false);
  });

  it('opens the app when the file does not parse', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('not json');
      },
    })) as unknown as typeof fetch;

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(false);
  });

  it('opens the app when the file names no usable minimum', async () => {
    global.fetch = publish({ ios: { minimumVersion: 'soon' } });

    const { result } = renderHook(() => useStoreUpdateGate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.required).toBe(false);
  });

  it('opens the app when the server does not answer in time', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const { result } = renderHook(() => useStoreUpdateGate());
    expect(result.current.checking).toBe(true);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000 + 1);
    });

    expect(result.current.checking).toBe(false);
    expect(result.current.required).toBe(false);
    jest.useRealTimers();
  });

  it('never runs in development', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    global.fetch = publish({ ios: { minimumVersion: '9.0.0' } });

    const { result } = renderHook(() => useStoreUpdateGate());

    expect(result.current).toEqual({ checking: false, required: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
