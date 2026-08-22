/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockUseAccountsContext = vi.fn();
const mockUseSwap = vi.fn();
const mockUseBridge = vi.fn();
const mockUseMultiChainTokens = vi.fn();
const mockGetTokenList = vi.fn();
const mockSearchTokens = vi.fn();

const mockBridgeAvailableTokens = vi.fn();
const mockBridgeEstimate = vi.fn();
const mockCreateBridgeExchange = vi.fn();
const mockBridgeStatus = vi.fn();
const mockResetBridge = vi.fn();
const mockResetSwap = vi.fn();
const mockTransfer = vi.fn();

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
  useBridge: () => mockUseBridge(),
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
    transfer: mockTransfer,
    getReceiveAddress: () => 'BtcRecv1111111111111111111111111111111111',
  };
  return {
    ready: true,
    activeAccount: {
      networksAccounts: {
        'bitcoin-mainnet': [
          { getReceiveAddress: () => 'BtcRecv1111111111111111111111111111111111' },
        ],
      },
    },
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
      getQuote: vi.fn(),
      executeSwap: vi.fn(),
      quote: null,
      error: null,
      reset: mockResetSwap,
    });
    mockUseBridge.mockReturnValue({
      getAvailableTokens: mockBridgeAvailableTokens,
      getEstimate: mockBridgeEstimate,
      createExchange: mockCreateBridgeExchange,
      getTransactionStatus: mockBridgeStatus,
      reset: mockResetBridge,
    });
    mockUseMultiChainTokens.mockReturnValue({
      tokens: [],
      featuredTokens: [],
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

  it('wires bridge transaction status, success, and error handlers into SwapScreen', async () => {
    mockUseAccountsContext.mockReturnValue([buildAccountState()]);
    mockBridgeStatus.mockResolvedValue({ status: 'finished', payoutHash: 'tx-hash' });

    const { getByTestId } = render(<SwapPage onNavigateHome={vi.fn()} />);

    expect(getByTestId('swap-screen')).toBeTruthy();

    await waitFor(() => {
      expect(typeof lastSwapScreenProps().onGetBridgeTransactionStatus).toBe('function');
    });

    const onGetBridgeTransactionStatus = lastSwapScreenProps().onGetBridgeTransactionStatus as (
      id: string
    ) => Promise<{ status: string; payoutTxId: string | undefined } | null>;
    const result = await onGetBridgeTransactionStatus('exchange-1');
    expect(mockBridgeStatus).toHaveBeenCalledWith('exchange-1');
    expect(result).toEqual({ status: 'finished', payoutTxId: 'tx-hash' });

    const onBridgeSuccess = lastSwapScreenProps().onBridgeSuccess as (exchange: unknown) => void;
    onBridgeSuccess({ id: 'x' });
    expect(mockResetBridge).toHaveBeenCalledTimes(1);
  });

  it('returns null when getTransactionStatus rejects', async () => {
    mockUseAccountsContext.mockReturnValue([buildAccountState()]);
    mockBridgeStatus.mockRejectedValue(new Error('network down'));

    render(<SwapPage />);

    await waitFor(() => {
      expect(typeof lastSwapScreenProps().onGetBridgeTransactionStatus).toBe('function');
    });

    const onGetBridgeTransactionStatus = lastSwapScreenProps().onGetBridgeTransactionStatus as (
      id: string
    ) => Promise<unknown>;
    const result = await onGetBridgeTransactionStatus('exchange-2');
    expect(result).toBeNull();
  });
});
