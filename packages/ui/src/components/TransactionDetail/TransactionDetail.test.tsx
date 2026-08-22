/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCopyToClipboard = vi.fn().mockResolvedValue(undefined);
const mockExplorerOnPress = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrOptions?: string | Record<string, string | number>,
      maybeOptions?: Record<string, string | number>
    ) => {
      const fallback = typeof fallbackOrOptions === 'string' ? fallbackOrOptions : undefined;
      const options =
        (typeof fallbackOrOptions === 'object' ? fallbackOrOptions : maybeOptions) ?? {};

      return fallback ?? (options.count != null ? `${key}:${options.count}` : key);
    },
  }),
}));

vi.mock('@salmon/shared', () => ({
  tabularNums: { css: { fontVariantNumeric: 'tabular-nums' } },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    xl: 20,
    iconLg: 16,
    scrollbar: 8,
  },
  borderWidth: { thin: 1 },
  semantic: {
    status: { success: '#0f0', danger: '#f00', warning: '#fc0' },
    surface: {
      raised: '#161C2D',
      crest: '#1B2233',
      membraneThin: 'rgba(11, 15, 25, 0.62)',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    scales: { membraneFieldStroke: 'rgba(7, 9, 17, 0.45)' },
  },
  colors: {
    change: { negative: '#f44', positive: '#4f4' },
    palette: {
      purple: '#90f',
      cyan: '#0ff',
      orange: '#f90',
      green: '#0f0',
      amber: '#fc0',
      blue: '#09f',
    },
    text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
    background: { primary: '#000', card: '#111' },
    border: { default: '#333', subtle: '#222' },
    card: { border: '#222' },
    interactive: { highlight: '#444' },
  },
  componentSizes: {
    sheetWidthMd: 640,
    sheetWidthXl: 840,
    iconSize2XL: 48,
    iconSizeLarge: 32,
    iconSizeMButton: 28,
    dividerHeight: 1,
    scrollbarWidth: 6,
    logoSizeMedium: 120,
  },
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
  fontFamily: { sans: 'Inter, sans-serif', mono: 'monospace' },
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    base: 16,
    bodyLg: 18,
    lg: 20,
    xl: 24,
    '2xl': 28,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extraBold: 800,
  },
  formatBlockNumber: (value: number) => value.toString(),
  formatDateTime: (value: number) => `date:${value}`,
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  letterSpacing: { snug: '-0.02em', semiWide: '0.06em', wide: '0.08em' },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    base: 10,
  },
  truncateHash: (value: string) => `hash:${value.slice(0, 8)}`,
  duration: { normal: '200ms' },
  durationMs: { feedbackShort: 0 },
  easing: { ease: 'ease' },
  getBlockchainFromNetworkId: (networkId: string) => {
    if (networkId.startsWith('bitcoin')) return 'bitcoin';
    if (networkId.startsWith('ethereum')) return 'ethereum';
    return 'solana';
  },
}));

vi.mock('../../utils/styled', async () => {
  const emotion = await import('@emotion/styled');
  return { styled: emotion.default };
});

vi.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ScalesBackground', () => ({
  ScalesBackground: () => <div data-testid="scales-background" />,
}));

vi.mock('../TransactionHistoryPage/AddressCopyRow', () => ({
  AddressCopyRow: ({ label, address }: { label: string; address: string }) => (
    <div>{`${label}:${address}`}</div>
  ),
}));

vi.mock('../TransactionHistoryPage/ConversionRateDisplay', () => ({
  ConversionRateDisplay: ({
    fromSymbol,
    toSymbol,
    rate,
  }: {
    fromSymbol: string;
    toSymbol: string;
    rate: string;
  }) => <div>{`${fromSymbol}/${toSymbol}:${rate}`}</div>,
}));

vi.mock('../TransactionHistoryPage/ExplorerLinkButton', () => ({
  ExplorerLinkButton: ({
    onPress,
    blockchain,
    environment,
  }: {
    onPress?: (url: string, explorerName: string) => void;
    blockchain?: string;
    environment?: string;
  }) => (
    <button
      data-blockchain={blockchain}
      data-environment={environment}
      onClick={() => {
        mockExplorerOnPress();
        onPress?.('https://explorer/tx', 'Solscan');
      }}
    >
      Explorer
    </button>
  ),
}));

vi.mock('../TransactionHistoryPage/PriceImpactBadge', () => ({
  PriceImpactBadge: ({ value }: { value: string }) => <div>{`Price impact:${value}`}</div>,
}));

import { TransactionDetail } from './TransactionDetail';

const BASE_TRANSACTION = {
  id: 'tx-1234567890abcdef',
  type: 'swap',
  status: 'completed',
  source: 'Jupiter',
  timestamp: 1710000000000,
  confirmationStatus: 'finalized',
  slot: 123456,
  inputs: [
    {
      amount: '2500000',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      logo: 'https://example.com/usdc.png',
      source: 'source-wallet',
    },
  ],
  outputs: [
    {
      amount: '1000000000',
      decimals: 9,
      symbol: 'SOL',
      name: 'Solana',
      logo: 'https://example.com/sol.png',
      destination: 'destination-wallet',
      isNft: false,
    },
  ],
  feePayer: 'fee-payer-wallet',
  fee: { amount: '5000', decimals: 9, symbol: 'SOL' },
  swapRoute: {
    priceImpact: '0.5',
    conversionRate: {
      fromSymbol: 'SOL',
      toSymbol: 'USDC',
      rate: '2.5',
    },
    hops: [
      {
        dex: 'Orca',
        inputToken: { symbol: 'SOL' },
        outputToken: { symbol: 'USDC' },
        percent: 100,
      },
    ],
    totalFee: { amount: '0.05', symbol: 'USDC' },
  },
  heliusType: 'SWAP',
  accountsInvolved: 4,
  instructions: [{ programId: 'Program111111', innerInstructionsCount: 2 }],
  innerSwaps: [
    {
      programInfo: {
        source: 'Orca',
        programName: 'Whirlpool',
        instructionName: 'swap',
      },
    },
  ],
  swapFees: {
    nativeFees: [{ account: 'NativeFee111111', amount: '0.001' }],
    tokenFees: [{ account: 'TokenFee111111', amount: '0.2', mint: 'Mint111111' }],
  },
} as any;

describe('TransactionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The suite mounts the step once per test into the same document; without
  // an unmount between them a query for a single element sees every copy.
  afterEach(cleanup);

  it('does not render when transaction is missing', () => {
    const { container } = render(<TransactionDetail transaction={null as any} />);

    expect(container.innerHTML).toBe('');
  });

  it('copies the transaction hash and calls onCopyHash', async () => {
    const onCopyHash = vi.fn();

    render(<TransactionDetail transaction={BASE_TRANSACTION} onCopyHash={onCopyHash} />);

    fireEvent.click(screen.getByLabelText('transactions.detail.copyTransactionHash'));

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledWith(BASE_TRANSACTION.id);
    });

    expect(onCopyHash).toHaveBeenCalledWith(BASE_TRANSACTION.id);
  });

  it('renders swap and developer sections and forwards explorer/share actions', () => {
    const onViewExplorer = vi.fn();
    const onShare = vi.fn();

    render(
      <TransactionDetail
        transaction={BASE_TRANSACTION}
        onViewExplorer={onViewExplorer}
        onShare={onShare}
        developerMode
      />
    );

    expect(screen.getAllByText('Conversion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Price impact:0.5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Swap Route').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Developer Info').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inner Swaps').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SOL/USDC:2.5').length).toBeGreaterThan(0);

    const step = screen.getByTestId('tx-detail');

    fireEvent.click(within(step).getByText('Explorer'));
    expect(mockExplorerOnPress).toHaveBeenCalledTimes(1);
    expect(onViewExplorer).toHaveBeenCalledWith(BASE_TRANSACTION);

    fireEvent.click(within(step).getByRole('button', { name: 'Share' }));
    expect(onShare).toHaveBeenCalledWith(BASE_TRANSACTION);
  });

  it('derives the explorer chain and environment from networkId', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} networkId="bitcoin-testnet" />);

    const explorerButton = within(screen.getByTestId('tx-detail')).getByText('Explorer');
    expect(explorerButton.getAttribute('data-blockchain')).toBe('BITCOIN');
    expect(explorerButton.getAttribute('data-environment')).toBe('bitcoin-testnet');
  });

  it('falls back to Solana mainnet when networkId is missing', () => {
    render(<TransactionDetail transaction={BASE_TRANSACTION} />);

    const explorerButton = within(screen.getByTestId('tx-detail')).getByText('Explorer');
    expect(explorerButton.getAttribute('data-blockchain')).toBe('SOLANA');
    expect(explorerButton.getAttribute('data-environment')).toBe('solana-mainnet');
  });
});
