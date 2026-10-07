import { act, renderHook } from '@testing-library/react-native';

// The walletlib bridge is a native module that only exists on a device; the
// test drives its two callbacks and observes what reaches the dApp (`resolve`).
const bridge: {
  onRequest?: (request: unknown) => void;
  onEvent?: (event: { __type: string }) => void;
} = {};

jest.mock('@solana-mobile/mobile-wallet-adapter-walletlib', () => ({
  __esModule: true,
  MWARequestFailReason: {
    UserDeclined: 'USER_DECLINED',
    AuthorizationNotValid: 'AUTHORIZATION_NOT_VALID',
  },
  MWARequestType: {
    AuthorizeDappRequest: 'AUTHORIZE_DAPP',
    ReauthorizeDappRequest: 'REAUTHORIZE_DAPP',
    DeauthorizeDappRequest: 'DEAUTHORIZE_DAPP',
  },
  MWASessionEventType: {
    SessionTerminatedEvent: 'SESSION_TERMINATED',
    SessionCompleteEvent: 'SESSION_COMPLETE',
  },
  initializeMWAEventListener: jest.fn((onRequest, onEvent) => {
    bridge.onRequest = onRequest;
    bridge.onEvent = onEvent;
    return { remove: jest.fn() };
  }),
  initializeMobileWalletAdapterSession: jest.fn().mockResolvedValue('session-1'),
  resolve: jest.fn(),
}));

import { resolve } from '@solana-mobile/mobile-wallet-adapter-walletlib';

import { useMwaSession } from './useMwaSession';

const resolved = resolve as jest.Mock;
const request = (requestId: string) => ({ __type: 'SIGN_MESSAGES', requestId, sessionId: 's' });
const DECLINED = { failReason: 'USER_DECLINED' };

describe('useMwaSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows requests one at a time, in the order they arrived', () => {
    const { result } = renderHook(() => useMwaSession({ onEnd: jest.fn() }));

    act(() => {
      bridge.onRequest?.(request('a'));
      bridge.onRequest?.(request('b'));
    });
    expect(result.current.current?.requestId).toBe('a');

    act(() => result.current.respond({ signedPayloads: [] } as never));

    expect(resolved).toHaveBeenCalledWith(request('a'), { signedPayloads: [] });
    expect(result.current.current?.requestId).toBe('b');
  });

  it('answers each request once, even if the screen responds twice', () => {
    const { result } = renderHook(() => useMwaSession({ onEnd: jest.fn() }));
    act(() => bridge.onRequest?.(request('a')));
    const { respond } = result.current;

    act(() => {
      respond(DECLINED as never);
      respond(DECLINED as never);
    });

    expect(resolved).toHaveBeenCalledTimes(1);
  });

  it('declines whatever is still waiting when the dApp ends the session, then closes', () => {
    const onEnd = jest.fn();
    renderHook(() => useMwaSession({ onEnd }));
    act(() => {
      bridge.onRequest?.(request('a'));
      bridge.onRequest?.(request('b'));
    });

    act(() => bridge.onEvent?.({ __type: 'SESSION_TERMINATED' }));

    expect(resolved.mock.calls).toEqual([
      [request('a'), DECLINED],
      [request('b'), DECLINED],
    ]);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('declines the pending request when the screen goes away', () => {
    const { unmount } = renderHook(() => useMwaSession({ onEnd: jest.fn() }));
    act(() => bridge.onRequest?.(request('a')));

    unmount();

    expect(resolved).toHaveBeenCalledWith(request('a'), DECLINED);
  });

  // MWA accepts only AUTHORIZATION_NOT_VALID as a refusal of a reconnect or
  // disconnect, and only USER_DECLINED for a connect; anything else is an
  // invalid response the dApp reports as an error.
  it('refuses a reconnect the way the protocol allows', () => {
    const { unmount } = renderHook(() => useMwaSession({ onEnd: jest.fn() }));
    const reauthorize = { __type: 'REAUTHORIZE_DAPP', requestId: 'r', sessionId: 's' };
    act(() => bridge.onRequest?.(reauthorize));

    unmount();

    expect(resolved).toHaveBeenCalledWith(reauthorize, { failReason: 'AUTHORIZATION_NOT_VALID' });
  });

  it('refuses a connect only as declined', () => {
    const { result } = renderHook(() => useMwaSession({ onEnd: jest.fn() }));
    const authorize = { __type: 'AUTHORIZE_DAPP', requestId: 'r', sessionId: 's' };
    act(() => bridge.onRequest?.(authorize));

    act(() => result.current.respond({ failReason: 'TOO_MANY_PAYLOADS' } as never));

    expect(resolved).toHaveBeenCalledWith(authorize, DECLINED);
  });
});
