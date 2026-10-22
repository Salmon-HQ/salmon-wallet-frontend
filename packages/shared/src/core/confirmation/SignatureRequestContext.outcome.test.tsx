/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('../../contexts/PendingTransactionsContext', () => ({
  usePendingTransactionsOptional: () => ({
    trackPendingTransaction: () => {
      throw new Error('banner broke');
    },
  }),
}));

import { SignatureRequestProvider, useSignatureRequestContext } from './SignatureRequestContext';

const ACCOUNT = { address: 'acct' } as never;

describe('onOutcome when something after signing throws', () => {
  it('handles the rejection of an async callback', async () => {
    const rejected = Promise.reject(new Error('async analytics broke'));
    rejected.catch(() => undefined); // keep the test itself free of unhandled noise
    const catchSpy = vi.spyOn(rejected, 'catch');
    const onOutcome = vi.fn(() => rejected);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SignatureRequestProvider
        account={ACCOUNT}
        signProposal={vi.fn(async () => ({ signature: 'sig-1' })) as never}
      >
        {children}
      </SignatureRequestProvider>
    );
    const view = renderHook(() => useSignatureRequestContext(), { wrapper });

    act(() => {
      void view.result.current
        .requestSignature({
          id: 'p-2',
          networkId: 'solana-mainnet',
          transaction: 'AQ==',
          expect: { allowedPrograms: [] },
          display: { title: 'Memo Review', rows: [], pendingTitle: 'Sending memo' },
          onOutcome,
        } as never)
        .catch(() => undefined);
    });
    await act(async () => {
      await view.result.current.confirm();
    });

    expect(onOutcome).toHaveBeenCalledWith(true);
    expect(catchSpy).toHaveBeenCalled();
    expect(view.result.current.receipt?.signature).toBe('sig-1');
  });

  it('reports the signed attempt as true only, never also as false', async () => {
    const onOutcome = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SignatureRequestProvider
        account={ACCOUNT}
        signProposal={vi.fn(async () => ({ signature: 'sig-1' })) as never}
      >
        {children}
      </SignatureRequestProvider>
    );
    const view = renderHook(() => useSignatureRequestContext(), { wrapper });

    act(() => {
      void view.result.current
        .requestSignature({
          id: 'p-1',
          networkId: 'solana-mainnet',
          transaction: 'AQ==',
          expect: { allowedPrograms: [] },
          display: { title: 'Memo Review', rows: [], pendingTitle: 'Sending memo' },
          pending: { kind: 'send', summary: 'memo' },
          onOutcome,
        } as never)
        .catch(() => undefined);
    });
    await act(async () => {
      await view.result.current.confirm();
    });

    expect(onOutcome.mock.calls).toEqual([[true]]);
  });
});
