/**
 * @vitest-environment jsdom
 *
 * One press signs at most once, and only the request the user pressed on
 * (spec 043 US4 security review): the stale check and the rebuild are waits,
 * and nothing that happens during them may turn into a second signature or a
 * signature on another request.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignatureRequestProvider } from './SignatureRequestContext';
import { useSignatureRequestHost } from './useSignatureRequestHost';
import { useRequestReceivedSignature } from './received';
import { PhraseBackupContext, type PhraseBackupValue } from '../../contexts/PhraseBackupContext';
import type { ReceivedTransactionProposal } from './types';

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  },
}));

const ACCOUNT = { signer: {}, getRpc: () => ({}), getRpcSubscriptions: () => ({}) } as never;

function received(
  overrides: Partial<ReceivedTransactionProposal> = {}
): ReceivedTransactionProposal {
  return {
    id: 'r-1',
    source: 'received',
    networkId: 'solana-devnet',
    transaction: 'AQID',
    signer: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf',
    display: { title: 'Review payment', rows: [], pendingTitle: 'Paying' },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup() {
  const signProposal = vi.fn(async () => ({ signature: 'sig-1' }));
  const backup = { requireBackup: async () => true } as unknown as PhraseBackupValue;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PhraseBackupContext.Provider value={backup}>
      <SignatureRequestProvider account={ACCOUNT} signProposal={signProposal as never}>
        {children}
      </SignatureRequestProvider>
    </PhraseBackupContext.Provider>
  );
  const view = renderHook(
    () => ({ host: useSignatureRequestHost(), requestReceived: useRequestReceivedSignature() }),
    { wrapper }
  );
  const park = async (proposal: ReceivedTransactionProposal) => {
    act(() => {
      void view.result.current.requestReceived(proposal).catch(() => undefined);
    });
    await waitFor(() => expect(view.result.current.host.request?.proposal.id).toBe(proposal.id));
  };
  const signed = () =>
    signProposal.mock.calls.map(
      (call) => ((call as unknown[])[1] as { transaction: string }).transaction
    );
  return { view, park, signed };
}

describe('useSignatureRequestHost — one press, one signature, on the request pressed', () => {
  it('two presses during the stale check sign once', async () => {
    const { view, park, signed } = setup();
    const check = deferred<boolean>();
    await park(received({ isStale: () => check.promise, refresh: async () => received() }));

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.host.confirmOrRefresh();
      second = view.result.current.host.confirmOrRefresh();
    });
    await act(async () => {
      check.resolve(false);
      await Promise.all([first, second]);
    });

    expect(signed()).toEqual(['AQID']);
  });

  it('a second press while the first is signing does not sign again', async () => {
    const { view, park, signed } = setup();
    await park(received());

    await act(async () => {
      await Promise.all([
        view.result.current.host.confirmOrRefresh(),
        view.result.current.host.confirmOrRefresh(),
      ]);
    });

    expect(signed()).toEqual(['AQID']);
  });

  it('a request replaced during the stale check is not signed', async () => {
    const { view, park, signed } = setup();
    const check = deferred<boolean>();
    await park(received({ isStale: () => check.promise, refresh: async () => received() }));

    let press!: Promise<void>;
    act(() => {
      press = view.result.current.host.confirmOrRefresh();
    });
    act(() => view.result.current.host.cancel());
    await park(received({ id: 'r-other', transaction: 'CCCC' }));
    await act(async () => {
      check.resolve(false);
      await press;
    });

    expect(signed()).toEqual([]);
    expect(view.result.current.host.request?.proposal.id).toBe('r-other');
  });

  it('a request replaced during the rebuild is not signed', async () => {
    const { view, park, signed } = setup();
    const rebuilt = deferred<ReceivedTransactionProposal>();
    await park(received({ isStale: async () => true, refresh: () => rebuilt.promise }));

    let press!: Promise<void>;
    act(() => {
      press = view.result.current.host.confirmOrRefresh();
    });
    await waitFor(() => expect(view.result.current.host.refreshing).toBe(true));
    act(() => view.result.current.host.cancel());
    await park(received({ id: 'r-other', transaction: 'CCCC' }));
    await act(async () => {
      rebuilt.resolve(received({ id: 'r-2', transaction: 'BBBB' }));
      await press;
    });

    expect(signed()).toEqual([]);
  });

  it('shows the press as busy while the stale check runs', async () => {
    const { view, park, signed } = setup();
    const check = deferred<boolean>();
    await park(received({ isStale: () => check.promise, refresh: async () => received() }));

    let press!: Promise<void>;
    act(() => {
      press = view.result.current.host.confirmOrRefresh();
    });

    expect(view.result.current.host.refreshing).toBe(true);
    await act(async () => {
      check.resolve(false);
      await press;
    });
    expect(view.result.current.host.refreshing).toBe(false);
    expect(signed()).toEqual(['AQID']);
  });
});

// A rebuild whose review reads the same is signed in the same press only when
// the preview vouches for it: when it could not say what the transaction does,
// the same words can hide different bytes.
describe('useSignatureRequestHost — a received rebuild with new bytes', () => {
  const display = { title: 'Review payment', rows: [], pendingTitle: 'Paying' };

  it('asks for a new press when the preview could not vouch for the transaction', async () => {
    const { view, park, signed } = setup();
    const held = { ...display, requiresHold: true };
    const rebuilt = received({
      id: 'r-2',
      transaction: 'BBBB',
      display: held,
      isStale: async () => false,
    });
    await park(
      received({ display: held, isStale: async () => true, refresh: async () => rebuilt })
    );

    await act(async () => view.result.current.host.confirmOrRefresh());

    expect(signed()).toEqual([]);
    expect(view.result.current.host.request?.error).toBe('solanaPay.refreshed');
    expect(view.result.current.host.request?.proposal.transaction).toBe('BBBB');

    await act(async () => view.result.current.host.confirmOrRefresh());
    expect(signed()).toEqual(['BBBB']);
  });

  it('signs in the same press when the preview vouched for both', async () => {
    const { view, park, signed } = setup();
    const rebuilt = received({ id: 'r-2', transaction: 'BBBB', isStale: async () => false });
    await park(received({ isStale: async () => true, refresh: async () => rebuilt }));

    await act(async () => view.result.current.host.confirmOrRefresh());

    expect(signed()).toEqual(['BBBB']);
  });
});
