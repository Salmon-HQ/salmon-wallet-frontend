/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/client';
import {
  SignatureRequestProvider,
  useSignatureRequestContext,
} from '../../core/confirmation/SignatureRequestContext';
import { createTestQueryClient, QueryWrapper } from '../../test-utils/query-wrapper';
import type { SwapToken } from '../../types/swap';
import { useSwapScreenLogic, type UseSwapScreenLogicParams } from './useSwapScreenLogic';
import type { SwapBuildResponse } from './types';

vi.mock('i18next', () => ({ default: { t: (key: string) => key } }));
vi.mock('../../analytics', () => ({ trackEvent: vi.fn(), trackFirstTime: vi.fn() }));

const SOL: SwapToken = {
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  balance: 2,
  usdPrice: 150,
  chain: 'solana',
  networkId: 'solana-mainnet',
};
const USDC: SwapToken = {
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  balance: 0,
  usdPrice: 1,
  chain: 'solana',
  networkId: 'solana-mainnet',
};
const TAKER = 'wallet-1';

function build(overrides: Partial<SwapBuildResponse> = {}): SwapBuildResponse {
  return {
    provider: '0x',
    providerDisplayName: '0x',
    attribution: 'Powered by 0x',
    transaction: 'AQ==',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    input: { mint: SOL.address, amount: '1000000000', decimals: 9, symbol: 'SOL' },
    output: {
      mint: USDC.address,
      amount: '150000000',
      minAmount: '149250000',
      decimals: 6,
      symbol: 'USDC',
    },
    route: [{ label: 'Raydium', percent: 100 }],
    priceImpactPct: 0.1,
    slippageBps: 50,
    inUsdValue: 150,
    outUsdValue: 149.9,
    salmonFee: { amount: '1275000', mint: USDC.address, bps: 85, decimals: 6, symbol: 'USDC' },
    routeFee: null,
    ...overrides,
  };
}

const signProposal = vi.fn(async () => ({ signature: 'sig-1' }));

function setup(params: Partial<UseSwapScreenLogicParams> = {}) {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryWrapper client={client}>
      <SignatureRequestProvider account={{} as never} signProposal={signProposal as never}>
        {children}
      </SignatureRequestProvider>
    </QueryWrapper>
  );
  const buildSwap = vi.fn(async () => build());
  const view = renderHook(
    (props: Partial<UseSwapScreenLogicParams>) => ({
      logic: useSwapScreenLogic({
        tokens: [SOL],
        catalogTokens: [USDC],
        publicKey: TAKER,
        networkId: 'solana-mainnet',
        buildSwap,
        ...params,
        ...props,
      }),
      core: useSignatureRequestContext(),
    }),
    { wrapper, initialProps: {} }
  );
  return { view, buildSwap };
}

type View = ReturnType<typeof setup>['view'];

/** Type an amount for the pair and let the debounce fire. */
async function quote(view: View, amount = '1') {
  act(() => view.result.current.logic.handleOutTokenSelect(USDC));
  act(() => view.result.current.logic.setInAmount(amount));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(600);
  });
}

/** Press Swap, then play the user on core's confirmation. */
async function swapAnd(view: View, decide: 'confirm' | 'cancel') {
  let done: Promise<void> = Promise.resolve();
  act(() => {
    done = view.result.current.logic.handleSwap();
  });
  await waitFor(() => expect(view.result.current.core.pending).not.toBeNull());
  await act(async () => {
    if (decide === 'confirm') await view.result.current.core.confirm();
    else view.result.current.core.cancel();
  });
  await act(async () => {
    await done;
  });
}

describe('useSwapScreenLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    signProposal.mockReset();
    signProposal.mockResolvedValue({ signature: 'sig-1' });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces one build per pair+amount, with the taker, and enables the swap control', async () => {
    const { view, buildSwap } = setup();
    await quote(view);

    expect(buildSwap).toHaveBeenCalledTimes(1);
    expect(buildSwap).toHaveBeenCalledWith({
      inputMint: SOL.address,
      outputMint: USDC.address,
      uiAmount: '1',
      publicKey: TAKER,
    });
    expect(view.result.current.logic.outAmount).toBe('150');
    expect(view.result.current.logic.attribution).toBe('Powered by 0x');
    expect(view.result.current.logic.canSwap).toBe(true);
  });

  it('quotes nothing off mainnet and says why', async () => {
    const { view, buildSwap } = setup({ networkId: 'solana-devnet' });
    await quote(view);
    expect(buildSwap).not.toHaveBeenCalled();
    expect(view.result.current.logic.unavailable).toBe('network');
    expect(view.result.current.logic.canSwap).toBe(false);
  });

  // Spec 027 §4–5: a 403 is a state of its own, never a generic quote error,
  // and the screen stops quoting — no retry loop against a refusal.
  it('fails closed on region_restricted and stops quoting', async () => {
    const { view, buildSwap } = setup();
    buildSwap.mockRejectedValueOnce(new ApiError('forbidden', 403, 'region_restricted'));
    await quote(view);

    expect(view.result.current.logic.unavailable).toBe('region');
    expect(view.result.current.logic.reviewWarning).toBeNull();

    act(() => view.result.current.logic.setInAmount('2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(buildSwap).toHaveBeenCalledTimes(1);
  });

  it('renders no_route as the route warning and keeps the form live', async () => {
    const { view, buildSwap } = setup();
    buildSwap.mockRejectedValueOnce(new ApiError('Token not found', 404, 'no_route'));
    await quote(view);
    expect(view.result.current.logic.reviewWarning).toBe('transaction.errors.noRoute');
    expect(view.result.current.logic.unavailable).toBeNull();
    expect(view.result.current.logic.canSwap).toBe(false);
  });

  it('discards a stale build that resolves after the amount changed', async () => {
    const { view, buildSwap } = setup();
    let resolveSlow: (value: SwapBuildResponse) => void = () => {};
    buildSwap.mockImplementationOnce(
      () => new Promise<SwapBuildResponse>((resolve) => (resolveSlow = resolve))
    );
    await quote(view, '1');
    act(() => view.result.current.logic.setInAmount('2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    await act(async () => {
      resolveSlow(build({ output: { ...build().output, amount: '1' } }));
    });
    expect(view.result.current.logic.outAmount).toBe('150');
  });

  it('surfaces the minimum USD guardrail before any swap', () => {
    const { view } = setup();
    act(() => view.result.current.logic.handleOutTokenSelect(USDC));
    act(() => view.result.current.logic.setInAmount('0.001'));
    expect(view.result.current.logic.reviewWarning).toEqual({
      key: 'swap.errors.minimumAmount',
      params: { amount: '1.00' },
    });
    expect(view.result.current.logic.canSwap).toBe(false);
  });

  it('hands the build to core as a proposal and reaches the receipt on the signature', async () => {
    const { view } = setup();
    await quote(view);

    await swapAnd(view, 'confirm');

    expect(signProposal).toHaveBeenCalledTimes(1);
    const proposal = (signProposal.mock.calls[0] as unknown[])[1] as {
      transaction: string;
      display: { attribution: string };
    };
    expect(proposal.transaction).toBe('AQ==');
    expect(proposal.display.attribution).toBe('Powered by 0x');
    expect(view.result.current.logic.step).toBe('success');
    expect(view.result.current.logic.successTxId).toBe('sig-1');
    expect(view.result.current.logic.successSummary).toMatchObject({
      inAmount: '1',
      inSymbol: 'SOL',
      outAmount: '150',
      outSymbol: 'USDC',
      fee: '0.85%',
    });
    expect(view.result.current.core.pending).toBeNull();
  });

  it('returns to the form silently when the user backs out of the confirmation', async () => {
    const { view } = setup();
    await quote(view);

    await swapAnd(view, 'cancel');

    expect(signProposal).not.toHaveBeenCalled();
    expect(view.result.current.logic.step).toBe('input');
    expect(view.result.current.logic.swapError).toBeNull();
    expect(view.result.current.logic.isConfirming).toBe(false);
    expect(view.result.current.logic.inAmount).toBe('1');
  });

  it('keeps the request parked on a signing failure so the user can retry on the confirmation', async () => {
    const { view } = setup();
    await quote(view);
    signProposal.mockRejectedValueOnce(new Error('insufficient lamports'));

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = view.result.current.logic.handleSwap();
    });
    await waitFor(() => expect(view.result.current.core.pending).not.toBeNull());
    await act(async () => {
      await view.result.current.core.confirm();
    });
    expect(view.result.current.core.pending?.error).toBe('insufficient lamports');
    expect(view.result.current.logic.isConfirming).toBe(true);

    await act(async () => {
      await view.result.current.core.confirm();
    });
    await act(async () => {
      await done;
    });
    expect(view.result.current.logic.step).toBe('success');
  });

  it('resets the form and settles balances on continue', async () => {
    const onNavigateHome = vi.fn();
    const { view } = setup({ onNavigateHome });
    await quote(view);
    await swapAnd(view, 'confirm');
    expect(view.result.current.logic.step).toBe('success');

    act(() => view.result.current.logic.handleSuccessContinue());
    expect(view.result.current.logic.step).toBe('input');
    expect(view.result.current.logic.inAmount).toBe('');
    expect(view.result.current.logic.successTxId).toBeNull();
    expect(view.result.current.logic.successSummary).toBeNull();
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirmed pair in successSummary when the spent token drops out of the list', async () => {
    const { view } = setup();
    await quote(view);
    await swapAnd(view, 'confirm');

    // The post-swap balance refresh drops the fully-spent token; the form
    // resets underneath the receipt, the snapshot does not.
    view.rerender({ tokens: [] });
    expect(view.result.current.logic.inToken).toBeNull();
    expect(view.result.current.logic.successSummary?.inSymbol).toBe('SOL');
  });
});
