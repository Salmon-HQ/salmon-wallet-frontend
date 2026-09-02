/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUseAccountsContext = vi.fn();
const mockUseSwap = vi.fn();
const mockUseMultiChainTokens = vi.fn();
const mockGetTokenList = vi.fn();
const mockSearchTokens = vi.fn();

const mockResetSwap = vi.fn();
const mockExecuteSwap = vi.fn();
const mockGetQuote = vi.fn();

const mockSwapScreen = vi.fn((_props: Record<string, unknown>) => (
  <div data-testid="swap-screen" />
));

const lastSwapScreenProps = (): Record<string, unknown> => {
  const calls = mockSwapScreen.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
};

vi.mock('../../components', () => ({
  SwapScreen: (props: Record<string, unknown>) => mockSwapScreen(props),
}));

vi.mock('../../utils/styled', () => {
  const StyledPassthrough = (props: Record<string, unknown>) =>
    React.createElement('div', props, props.children as React.ReactNode);
  StyledPassthrough.displayName = 'StyledPassthrough';
  return {
    styled: () => () => StyledPassthrough,
  };
});

vi.mock('@salmon/shared', () => ({
  colors: { text: { secondary: '#000' } },
  spacing: { lg: 16 },
  fontSize: { bodyLg: 14 },
  fontFamily: { sans: 'sans-serif' },
  useAccountsContext: () => mockUseAccountsContext(),
  useSwap: () => mockUseSwap(),
  useMultiChainTokens: () => mockUseMultiChainTokens(),
  getTokenList: (network: string) => mockGetTokenList(network),
  useJupiterTokenList: () => ({ tokens: [], loading: false, error: null, refresh: vi.fn() }),
  searchTokens: (query: string, network: string) => mockSearchTokens(query, network),
  mapToSwapToken: (token: Record<string, unknown>) => token,
  unifiedToSwapToken: (token: Record<string, unknown>) => token,
}));

import { SwapPage } from './SwapPage';

function buildAccountState(overrides: Record<string, unknown> = {}) {
  const blockchainAccount = {
    transfer: vi.fn(),
    getReceiveAddress: () => 'Sol1111111111111111111111111111111111111',
  };
  return {
    ready: true,
    activeAccount: { networksAccounts: {} },
    activeBlockchainAccount: blockchainAccount,
    networkId: 'solana-mainnet',
    ...overrides,
  };
}

describe('SwapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTokenList.mockResolvedValue([]);
    mockUseSwap.mockReturnValue({
      getQuote: mockGetQuote,
      executeSwap: mockExecuteSwap,
      quote: null,
      error: null,
      reset: mockResetSwap,
    });
    mockUseMultiChainTokens.mockReturnValue({
      tokens: [
        { symbol: 'SOL', chain: 'solana', address: 'sol-mint', decimals: 9 },
        { symbol: 'BTC', chain: 'bitcoin', address: 'btc', decimals: 8 },
      ],
      featuredTokens: [{ symbol: 'SOL', chain: 'solana', address: 'sol-mint', decimals: 9 }],
      loading: false,
      refresh: vi.fn(),
    });
  });

  it('renders the loading state when no active account is available', () => {
    mockUseAccountsContext.mockReturnValue([
      { ready: false, activeAccount: null, activeBlockchainAccount: null, networkId: null },
    ]);

    const { getByText, queryByTestId } = render(<SwapPage />);

    expect(getByText('swap.errors.noAccount')).toBeTruthy();
    expect(queryByTestId('swap-screen')).toBeNull();
  });

  it('filters the multi-chain token list down to Solana for the swap screen', async () => {
    mockUseAccountsContext.mockReturnValue([buildAccountState()]);

    const { getByTestId } = render(<SwapPage onNavigateHome={vi.fn()} />);

    expect(getByTestId('swap-screen')).toBeTruthy();

    await waitFor(() => {
      expect(lastSwapScreenProps().tokens).toBeTruthy();
    });

    const tokens = lastSwapScreenProps().tokens as Array<{ chain: string }>;
    const featuredTokens = lastSwapScreenProps().featuredTokens as Array<{ chain: string }>;
    expect(tokens.every((t) => t.chain === 'solana')).toBe(true);
    expect(featuredTokens.every((t) => t.chain === 'solana')).toBe(true);
    expect(tokens).toHaveLength(1);
  });

  it('wires quote and swap handlers into SwapScreen', async () => {
    mockUseAccountsContext.mockReturnValue([buildAccountState()]);
    mockGetQuote.mockResolvedValue({
      custom: { requestId: 'req-1' },
      output: { amount: '2000000', decimals: 6 },
    });
    mockUseSwap.mockReturnValue({
      getQuote: mockGetQuote,
      executeSwap: mockExecuteSwap,
      quote: { custom: { requestId: 'req-1' } },
      error: null,
      reset: mockResetSwap,
    });
    mockExecuteSwap.mockResolvedValue({ status: 'success', txId: 'sig-1' });

    render(<SwapPage />);

    await waitFor(() => {
      expect(typeof lastSwapScreenProps().onGetQuote).toBe('function');
    });

    const onGetQuote = lastSwapScreenProps().onGetQuote as (
      inToken: { address: string; decimals: number },
      outToken: { address: string },
      amount: string
    ) => Promise<unknown>;
    const quote = await onGetQuote({ address: 'sol-mint', decimals: 9 }, { address: 'usdc' }, '1');
    expect(mockGetQuote).toHaveBeenCalled();
    expect(quote).toBeTruthy();

    const onSwap = lastSwapScreenProps().onSwap as (quote: unknown) => Promise<{ txId: string }>;
    const result = await onSwap(quote);
    expect(mockExecuteSwap).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ txId: 'sig-1' });

    const onSuccess = lastSwapScreenProps().onSuccess as () => void;
    onSuccess();
    expect(mockResetSwap).toHaveBeenCalledTimes(1);
  });
});
