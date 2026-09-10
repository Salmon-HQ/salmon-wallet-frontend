/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderInMode } from '../../test/renderInMode';

vi.mock('react-i18next', () => ({
  // Interpolated keys pass params as the second argument, not a fallback.
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const mockLogic: Record<string, unknown> = {};
vi.mock('@salmon/shared/powerups', () => ({ useSwapScreenLogic: () => mockLogic }));
vi.mock('@salmon/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@salmon/shared')>()),
  getTransactionUrl: () => 'https://explorer.example/tx',
  getDefaultExplorer: () => 'explorer',
  useCurrencyContext: () => [{ currency: 'usd' }, { formatPrecise: (v?: number) => `${v ?? 0}` }],
}));
vi.mock('../DepthBackground', () => ({ DepthBackground: () => null }));
vi.mock('../ScalesBackground', () => ({ ScalesBackground: () => null }));
vi.mock('../ReceiptScreen', () => ({
  ReceiptScreen: ({ exchangeFee, summary }: { exchangeFee?: string; summary: string }) => (
    <div data-testid="tx-success-screen" data-fee={exchangeFee ?? ''} data-summary={summary} />
  ),
}));
vi.mock('../SendPage/TokenPickerSheet', () => ({
  TokenPickerSheet: ({
    visible,
    testID,
    tokens,
    onSelectToken,
  }: {
    visible: boolean;
    testID: string;
    tokens: { address: string; symbol: string }[];
    onSelectToken: (token: { address: string; symbol: string; uiAmount: number }) => void;
  }) =>
    visible ? (
      <div data-testid={testID}>
        {tokens.map((token) => (
          <button
            key={token.address}
            type="button"
            data-testid={`${testID}-${token.symbol}`}
            onClick={() => onSelectToken({ ...token, uiAmount: 1 })}
          />
        ))}
      </div>
    ) : null,
}));

import { SwapPage } from './SwapPage';

const SOL = { address: 'sol', symbol: 'SOL', decimals: 9, balance: 2, chain: 'solana' as const };
const USDC = { address: 'usdc', symbol: 'USDC', decimals: 6, balance: 0, chain: 'solana' as const };

function setLogic(overrides: Record<string, unknown>) {
  for (const key of Object.keys(mockLogic)) delete mockLogic[key];
  Object.assign(
    mockLogic,
    {
      step: 'input',
      unavailable: null,
      swapError: null,
      inToken: SOL,
      outToken: USDC,
      inAmount: '1',
      outAmount: '150',
      isLoadingQuote: false,
      isConfirming: false,
      showInTokenModal: false,
      showOutTokenModal: false,
      tokensLoading: false,
      successTxId: null,
      successSummary: null,
      settling: false,
      inUsdValue: 150,
      canSwap: true,
      reviewWarning: null,
      priceImpact: null,
      attribution: 'Powered by 0x',
      modalInTokens: [{ ...SOL, mint: 'sol', uiAmount: 2 }],
      modalFeaturedTokens: [],
      modalOutTokens: [{ ...USDC, mint: 'usdc', uiAmount: 0 }],
      setInAmount: vi.fn(),
      setShowInTokenModal: vi.fn(),
      setShowOutTokenModal: vi.fn(),
      handleInTokenModalSelect: vi.fn(),
      handleOutTokenModalSelect: vi.fn(),
      handleSearchTokens: undefined,
      handleSwap: vi.fn(),
      handleSuccessContinue: vi.fn(),
    },
    overrides
  );
}

const props = {
  tokens: [SOL],
  publicKey: 'wallet-1',
  networkId: 'solana-mainnet',
  onBack: vi.fn(),
};

afterEach(cleanup);

describe('SwapPage', () => {
  it('renders the form, names the provider from the quote, and hands Swap to core', () => {
    setLogic({});
    renderInMode('dark', <SwapPage {...props} />);
    expect(screen.getByTestId('swap-attribution').textContent).toBe('Powered by 0x');
    fireEvent.click(screen.getByTestId('swap-submit-button'));
    expect(mockLogic.handleSwap).toHaveBeenCalledTimes(1);
  });

  it('opens the pickers from the token controls and maps a pick back to the Powerup', () => {
    setLogic({ showOutTokenModal: true });
    renderInMode('dark', <SwapPage {...props} />);
    fireEvent.click(screen.getByTestId('swap-from-token'));
    expect(mockLogic.setShowInTokenModal).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('swap-out-token-picker-USDC'));
    expect(mockLogic.handleOutTokenModalSelect).toHaveBeenCalledWith(
      expect.objectContaining({ mint: 'usdc', symbol: 'USDC' })
    );
  });

  it('renders the receipt from the snapshot once the signature is back', () => {
    setLogic({
      step: 'success',
      successTxId: 'sig-1',
      successSummary: {
        inAmount: '1',
        inSymbol: 'SOL',
        outAmount: '150',
        outSymbol: 'USDC',
        chain: 'solana',
        networkId: 'solana-mainnet',
        fee: '0.85%',
      },
    });
    renderInMode('dark', <SwapPage {...props} />);
    const receipt = screen.getByTestId('tx-success-screen');
    expect(receipt.getAttribute('data-fee')).toBe('0.85%');
    expect(receipt.getAttribute('data-summary')).toBe('1 SOL → 150 USDC');
  });

  it.each(['network', 'region', 'wallet'])('fails closed with the %s state', (reason) => {
    setLogic({ unavailable: reason });
    renderInMode('dark', <SwapPage {...props} />);
    expect(screen.getByTestId(`swap-unavailable-${reason}`)).toBeTruthy();
    expect(screen.queryByTestId('swap-input-screen')).toBeNull();
  });

  it('refuses the whole page for a watch-only wallet', () => {
    setLogic({});
    renderInMode('dark', <SwapPage {...props} watchOnly />);
    expect(screen.getByTestId('swap-watch-only-notice')).toBeTruthy();
    expect(screen.queryByTestId('swap-input-screen')).toBeNull();
  });
});
