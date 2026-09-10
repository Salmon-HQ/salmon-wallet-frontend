/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignatureRequestProvider, useSignatureRequestContext } from './SignatureRequestContext';
import { useSignatureRequestHost } from './useSignatureRequestHost';
import { NoSigningAccountError, SignatureRequestCancelledError } from './types';
import type { TransactionProposal } from './types';

vi.mock('i18next', () => ({
  default: {
    t: (_key: string, options?: { defaultValue?: string; seconds?: number }) =>
      options?.defaultValue?.replace('{{seconds}}', String(options.seconds)) ?? _key,
  },
}));

const ACCOUNT = { signer: {}, getRpc: () => ({}), getRpcSubscriptions: () => ({}) } as never;

function proposal(overrides: Partial<TransactionProposal> = {}): TransactionProposal {
  return {
    id: 'p-1',
    networkId: 'solana-mainnet',
    transaction: 'AQ==',
    display: { title: 'Swap Review', rows: [], pendingTitle: 'Processing swap' },
    ...overrides,
  };
}

function setup({
  account = ACCOUNT,
  signProposal = vi.fn(async () => ({ signature: 'sig-1' })),
}: { account?: never | null; signProposal?: ReturnType<typeof vi.fn> } = {}) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SignatureRequestProvider account={account} signProposal={signProposal as never}>
      {children}
    </SignatureRequestProvider>
  );
  const view = renderHook(
    () => ({ ctx: useSignatureRequestContext(), host: useSignatureRequestHost() }),
    { wrapper }
  );
  return { view, signProposal };
}

describe('SignatureRequestProvider', () => {
  it('parks the proposal, signs on confirm and resolves the signature', async () => {
    const { view, signProposal } = setup();
    let result: Promise<{ signature: string }> | undefined;

    act(() => {
      result = view.result.current.ctx.requestSignature(proposal());
    });
    expect(view.result.current.ctx.pending?.proposal.id).toBe('p-1');
    expect(view.result.current.ctx.pending?.phase).toBe('review');

    await act(async () => {
      await view.result.current.host.confirmOrRefresh();
    });

    await expect(result).resolves.toEqual({ signature: 'sig-1' });
    expect(signProposal).toHaveBeenCalledWith(ACCOUNT, expect.objectContaining({ id: 'p-1' }));
    expect(view.result.current.ctx.pending).toBeNull();
  });

  it('rejects with the cancellation error and clears the request on cancel', async () => {
    const { view, signProposal } = setup();
    let outcome: Promise<unknown> | undefined;

    act(() => {
      outcome = view.result.current.ctx.requestSignature(proposal()).catch((error) => error);
    });
    act(() => {
      view.result.current.host.cancel();
    });

    await expect(outcome).resolves.toBeInstanceOf(SignatureRequestCancelledError);
    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.ctx.pending).toBeNull();
  });

  it('keeps the request parked with the error when signing fails, so the user can retry', async () => {
    const signProposal = vi
      .fn()
      .mockRejectedValueOnce(new Error('transaction.errors.networkBusy'))
      .mockResolvedValueOnce({ signature: 'sig-2' });
    const { view } = setup({ signProposal });
    let result: Promise<{ signature: string }> | undefined;

    act(() => {
      result = view.result.current.ctx.requestSignature(proposal());
    });
    await act(async () => {
      await view.result.current.ctx.confirm();
    });
    expect(view.result.current.ctx.pending?.error).toBe('transaction.errors.networkBusy');
    expect(view.result.current.ctx.pending?.phase).toBe('review');

    await act(async () => {
      await view.result.current.ctx.confirm();
    });
    await expect(result).resolves.toEqual({ signature: 'sig-2' });
  });

  it('refuses a second request while one is parked', async () => {
    const { view } = setup();
    act(() => {
      void view.result.current.ctx.requestSignature(proposal()).catch(() => undefined);
    });
    await expect(view.result.current.ctx.requestSignature(proposal({ id: 'p-2' }))).rejects.toThrow(
      'transaction.errors.confirmationBusy'
    );
    act(() => view.result.current.ctx.cancel());
  });

  it('rejects when there is no signing account', async () => {
    const { view } = setup({ account: null });
    let outcome: Promise<unknown> | undefined;
    act(() => {
      outcome = view.result.current.ctx.requestSignature(proposal()).catch((error) => error);
    });
    await act(async () => {
      await view.result.current.ctx.confirm();
    });
    await expect(outcome).resolves.toBeInstanceOf(NoSigningAccountError);
  });

  it('rebuilds an expired proposal on confirm instead of signing stale bytes', async () => {
    const fresh = proposal({
      id: 'p-fresh',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const refresh = vi.fn(async () => fresh);
    const { view, signProposal } = setup();

    act(() => {
      void view.result.current.ctx
        .requestSignature(
          proposal({ expiresAt: new Date(Date.now() - 1000).toISOString(), refresh })
        )
        .catch(() => undefined);
    });
    await waitFor(() => expect(view.result.current.host.secondsLeft).toBe(0));
    expect(view.result.current.host.confirmLabel).toBe('Refresh Quote');

    await act(async () => {
      await view.result.current.host.confirmOrRefresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.ctx.pending?.proposal.id).toBe('p-fresh');
    expect(view.result.current.host.secondsLeft).toBeGreaterThan(0);
    act(() => view.result.current.ctx.cancel());
  });
});
