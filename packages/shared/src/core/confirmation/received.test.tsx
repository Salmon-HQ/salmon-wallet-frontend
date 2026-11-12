/**
 * @vitest-environment jsdom
 *
 * The received entry and the Powerup door (spec 043, contracts/received-proposal.md).
 * Kept out of `SignatureRequestContext.test.tsx`, which stays byte-identical
 * (owner's before/after condition).
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignatureRequestProvider, useSignatureRequestContext } from './SignatureRequestContext';
import { useRequestReceivedSignature } from './received';
import { PhraseBackupContext, type PhraseBackupValue } from '../../contexts/PhraseBackupContext';
import { SignatureRequestCancelledError } from './types';
import type { ReceivedTransactionProposal, TransactionProposal } from './types';

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

function setup({ backupPasses = true } = {}) {
  const signProposal = vi.fn(async () => ({ signature: 'sig-1' }));
  const requireBackup = vi.fn(async () => backupPasses);
  const backup = { requireBackup } as unknown as PhraseBackupValue;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PhraseBackupContext.Provider value={backup}>
      <SignatureRequestProvider account={ACCOUNT} signProposal={signProposal as never}>
        {children}
      </SignatureRequestProvider>
    </PhraseBackupContext.Provider>
  );
  const view = renderHook(
    () => ({ ctx: useSignatureRequestContext(), requestReceived: useRequestReceivedSignature() }),
    { wrapper }
  );
  return { view, signProposal, requireBackup };
}

describe('the Powerup door', () => {
  it('refuses a proposal that says it was received, however it got there', async () => {
    const { view, signProposal } = setup();

    await expect(
      view.result.current.ctx.requestSignature(received() as unknown as TransactionProposal)
    ).rejects.toThrow('transaction.errors.proposalKind');
    await expect(
      view.result.current.ctx.requestSignature({
        ...(received() as unknown as TransactionProposal),
        source: undefined,
      } as TransactionProposal)
    ).rejects.toThrow('transaction.errors.proposalKind');
    expect(view.result.current.ctx.pending).toBeNull();
    expect(signProposal).not.toHaveBeenCalled();
  });
});

describe('useRequestReceivedSignature', () => {
  it('parks the proposal, signs it after the phrase check and resolves once the receipt is read', async () => {
    const { view, signProposal, requireBackup } = setup();
    let result: Promise<{ signature: string }> | undefined;

    act(() => {
      result = view.result.current.requestReceived(received());
    });
    expect(view.result.current.ctx.pending?.proposal).toMatchObject({
      id: 'r-1',
      source: 'received',
    });

    await act(async () => {
      await view.result.current.ctx.confirm();
    });

    expect(requireBackup).toHaveBeenCalledTimes(1);
    expect(signProposal).toHaveBeenCalledWith(
      ACCOUNT,
      expect.objectContaining({ source: 'received' })
    );
    expect(view.result.current.ctx.receipt?.signature).toBe('sig-1');

    act(() => view.result.current.ctx.dismissReceipt());
    await expect(result).resolves.toEqual({ signature: 'sig-1' });
  });

  it('takes one request at a time', async () => {
    const { view } = setup();

    act(() => {
      void view.result.current.requestReceived(received()).catch(() => undefined);
    });

    await expect(view.result.current.requestReceived(received({ id: 'r-2' }))).rejects.toThrow(
      'transaction.errors.confirmationBusy'
    );
  });

  it('signs nothing while the recovery phrase is unconfirmed', async () => {
    const { view, signProposal } = setup({ backupPasses: false });

    act(() => {
      void view.result.current.requestReceived(received()).catch(() => undefined);
    });
    await act(async () => {
      await view.result.current.ctx.confirm();
    });

    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.ctx.pending?.phase).toBe('review');
  });

  it('rejects on cancel and signs nothing', async () => {
    const { view, signProposal } = setup();
    let result: Promise<unknown> | undefined;

    act(() => {
      result = view.result.current.requestReceived(received());
    });
    act(() => view.result.current.ctx.cancel());

    await expect(result).rejects.toBeInstanceOf(SignatureRequestCancelledError);
    expect(signProposal).not.toHaveBeenCalled();
  });
});
