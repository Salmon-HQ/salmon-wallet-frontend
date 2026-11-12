/**
 * @vitest-environment jsdom
 *
 * The stale rule of the confirmation host (spec 043 US4,
 * contracts/received-proposal.md §Host): a proposal that went stale is
 * rebuilt before the press can sign, and stale bytes are never signed.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignatureRequestProvider } from './SignatureRequestContext';
import { useSignatureRequestHost } from './useSignatureRequestHost';
import { useRequestReceivedSignature } from './received';
import { PhraseBackupContext, type PhraseBackupValue } from '../../contexts/PhraseBackupContext';
import type { ProposalDisplay, ReceivedTransactionProposal } from './types';

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  },
}));

const ACCOUNT = { signer: {}, getRpc: () => ({}), getRpcSubscriptions: () => ({}) } as never;
const DISPLAY: ProposalDisplay = {
  title: 'Review payment',
  rows: [{ label: 'You pay', value: '1 USDC' }],
  pendingTitle: 'Paying',
};

function received(
  overrides: Partial<ReceivedTransactionProposal> = {}
): ReceivedTransactionProposal {
  return {
    id: 'r-1',
    source: 'received',
    networkId: 'solana-devnet',
    transaction: 'AQID',
    signer: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf',
    display: DISPLAY,
    ...overrides,
  };
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
  return { view, signProposal };
}

/** Parks `proposal` and waits until the host renders it. */
async function park(view: ReturnType<typeof setup>['view'], proposal: ReceivedTransactionProposal) {
  act(() => {
    void view.result.current.requestReceived(proposal).catch(() => undefined);
  });
  await waitFor(() => expect(view.result.current.host.request).not.toBeNull());
}

/** What the press signed: the transaction of each proposal handed to signing. */
function signedTransactions(signProposal: ReturnType<typeof setup>['signProposal']) {
  return signProposal.mock.calls.map((call) => (call as unknown[])[1] as { transaction: string });
}

describe('useSignatureRequestHost — a proposal that went stale', () => {
  it('signs the rebuilt transaction in the same press when the review is unchanged', async () => {
    const { view, signProposal } = setup();
    const refresh = vi.fn(async () => received({ id: 'r-2', transaction: 'BBBB' }));
    await park(view, received({ isStale: async () => true, refresh }));

    await act(() => view.result.current.host.confirmOrRefresh());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signedTransactions(signProposal).map((p) => p.transaction)).toEqual(['BBBB']);
  });

  it('signs nothing and says so when the rebuilt review differs', async () => {
    const { view, signProposal } = setup();
    const changed = { ...DISPLAY, rows: [{ label: 'You pay', value: '2 USDC' }] };
    await park(
      view,
      received({
        isStale: async () => true,
        refresh: async () => received({ id: 'r-2', transaction: 'BBBB', display: changed }),
      })
    );

    await act(() => view.result.current.host.confirmOrRefresh());

    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.host.request?.error).toBe('solanaPay.refreshed');
    expect(view.result.current.host.request?.proposal.display).toEqual(changed);
  });

  it('keeps the error and signs nothing when the rebuild fails', async () => {
    const { view, signProposal } = setup();
    await park(
      view,
      received({
        isStale: async () => true,
        refresh: async () => {
          throw new Error('solanaPay.errors.expired');
        },
      })
    );

    await act(() => view.result.current.host.confirmOrRefresh());

    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.host.request?.error).toBe('solanaPay.errors.expired');
  });

  it('signs nothing when it went stale and cannot be rebuilt', async () => {
    const { view, signProposal } = setup();
    await park(view, received({ isStale: async () => true }));

    await act(() => view.result.current.host.confirmOrRefresh());

    expect(signProposal).not.toHaveBeenCalled();
  });

  it('treats a staleness check that fails as stale', async () => {
    const { view, signProposal } = setup();
    const refresh = vi.fn(async () => received({ id: 'r-2', transaction: 'BBBB' }));
    await park(
      view,
      received({
        isStale: async () => {
          throw new Error('rpc down');
        },
        refresh,
      })
    );

    await act(() => view.result.current.host.confirmOrRefresh());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signedTransactions(signProposal).map((p) => p.transaction)).toEqual(['BBBB']);
  });

  it('signs as it always did when the proposal is still fresh, or never asks', async () => {
    for (const isStale of [async () => false, undefined]) {
      const { view, signProposal } = setup();
      const refresh = vi.fn(async () => received({ id: 'r-2', transaction: 'BBBB' }));
      await park(view, received({ isStale, refresh }));

      await act(() => view.result.current.host.confirmOrRefresh());

      expect(refresh).not.toHaveBeenCalled();
      expect(signedTransactions(signProposal).map((p) => p.transaction)).toEqual(['AQID']);
      view.unmount();
    }
  });
});
