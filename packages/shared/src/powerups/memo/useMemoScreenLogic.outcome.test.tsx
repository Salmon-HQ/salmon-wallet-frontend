/**
 * @vitest-environment jsdom
 *
 * Closing the signature window on an unknown outcome must not leave the memo
 * typed and ready: the first one may have landed, and a second press would
 * sign another.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SolanaOutcomeUnknownError } from '../../blockchain/solana/confirm';
import {
  SignatureRequestProvider,
  useSignatureRequestContext,
} from '../../core/confirmation/SignatureRequestContext';
import { useMemoScreenLogic } from './useMemoScreenLogic';

vi.mock('i18next', () => ({
  default: {
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  },
}));

const ENVELOPE = {
  provider: 'memo',
  providerDisplayName: 'SPL Memo',
  attribution: null,
  transaction: 'AQ==',
  expiresAt: '2099-01-01T00:00:00Z',
  salmonFee: null,
  routeFee: null,
  contributor: null,
  note: 'gm',
  noteBytes: 2,
};

function setup(signProposal: ReturnType<typeof vi.fn>) {
  const account = { signer: {}, getRpc: () => ({}), getRpcSubscriptions: () => ({}) } as never;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SignatureRequestProvider account={account} signProposal={signProposal as never}>
      {children}
    </SignatureRequestProvider>
  );
  return renderHook(
    () => ({
      memo: useMemoScreenLogic({
        publicKey: 'Pk',
        networkId: 'solana-mainnet',
        buildMemo: vi.fn(async () => ENVELOPE) as never,
      }),
      ctx: useSignatureRequestContext(),
    }),
    { wrapper }
  );
}

async function submitAndClose(view: ReturnType<typeof setup>) {
  act(() => view.result.current.memo.setNote('gm'));
  let submitting: Promise<void> | undefined;
  act(() => {
    submitting = view.result.current.memo.submit();
  });
  await waitFor(() => expect(view.result.current.ctx.pending).not.toBeNull());
  await act(async () => {
    await view.result.current.ctx.confirm();
  });
  await act(async () => {
    view.result.current.ctx.cancel();
    await submitting;
  });
}

describe('memo after the signature window closes', () => {
  it('clears the note and says it may have landed when the outcome is unknown', async () => {
    const view = setup(vi.fn().mockRejectedValue(new SolanaOutcomeUnknownError('sig' as never)));

    await submitAndClose(view);

    expect(view.result.current.memo.note).toBe('');
    expect(view.result.current.memo.error).toBe('transaction.errors.broadcastUnknown');
  });

  it('keeps the note, with no error, when the user simply backed out', async () => {
    const view = setup(vi.fn().mockRejectedValue(new Error('transaction.errors.networkBusy')));

    await submitAndClose(view);

    expect(view.result.current.memo.note).toBe('gm');
    expect(view.result.current.memo.error).toBeNull();
  });
});
