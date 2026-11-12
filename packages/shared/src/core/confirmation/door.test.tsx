/**
 * @vitest-environment jsdom
 *
 * A parked request keeps the door it came through (spec 043): a Powerup's
 * proposal cannot become a received one by refreshing, and a received
 * proposal cannot become a Powerup's.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignatureRequestProvider, useSignatureRequestContext } from './SignatureRequestContext';
import { useRequestReceivedSignature } from './received';
import type { ReceivedTransactionProposal, TransactionProposal } from './types';

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  },
}));

const ACCOUNT = { signer: {}, getRpc: () => ({}), getRpcSubscriptions: () => ({}) } as never;
const display = { title: 'Review', rows: [], pendingTitle: 'Signing' };

const received: ReceivedTransactionProposal = {
  id: 'r-1',
  source: 'received',
  networkId: 'solana-devnet',
  transaction: 'AQID',
  signer: 'Fg6PaFpoAXY1WYzMFyBQ2GfKcVxVfpJTUAFEEeUMKzXf',
  display,
};

function setup() {
  const signProposal = vi.fn(async () => ({ signature: 'sig-1' }));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SignatureRequestProvider account={ACCOUNT} signProposal={signProposal as never}>
      {children}
    </SignatureRequestProvider>
  );
  const view = renderHook(
    () => ({ ctx: useSignatureRequestContext(), requestReceived: useRequestReceivedSignature() }),
    { wrapper }
  );
  return { view, signProposal };
}

describe('a parked request keeps its door', () => {
  it('refuses a Powerup proposal whose refresh returns a received one, and never signs it', async () => {
    const { view, signProposal } = setup();
    const powerup: TransactionProposal = {
      id: 'p-1',
      networkId: 'solana-devnet',
      transaction: 'AQID',
      expect: { allowedPrograms: [] },
      display,
      refresh: async () => received as unknown as TransactionProposal,
    };

    act(() => {
      void view.result.current.ctx.requestSignature(powerup).catch(() => undefined);
    });
    await act(async () => {
      await view.result.current.ctx.refresh();
    });

    expect(view.result.current.ctx.pending?.proposal.id).toBe('p-1');
    expect(view.result.current.ctx.pending?.error).toBe('transaction.errors.proposalKind');

    await act(async () => {
      await view.result.current.ctx.confirm();
    });
    expect(signProposal).not.toHaveBeenCalledWith(
      ACCOUNT,
      expect.objectContaining({ source: 'received' })
    );
  });

  it('refuses a received request whose refresh returns a proposal without its source', async () => {
    const { view, signProposal } = setup();
    const { source: _source, ...withoutSource } = received;

    act(() => {
      void view.result.current
        .requestReceived({
          ...received,
          refresh: async () => withoutSource as unknown as ReceivedTransactionProposal,
        })
        .catch(() => undefined);
    });
    await act(async () => {
      await view.result.current.ctx.refresh();
    });

    expect(view.result.current.ctx.pending?.error).toBe('transaction.errors.proposalKind');
    expect(signProposal).not.toHaveBeenCalled();
  });

  it('refuses a proposal without source at the received door', async () => {
    const { view } = setup();
    const { source: _source, ...withoutSource } = received;

    await expect(
      view.result.current.requestReceived(withoutSource as unknown as ReceivedTransactionProposal)
    ).rejects.toThrow('transaction.errors.proposalKind');
    expect(view.result.current.ctx.pending).toBeNull();
  });
});
