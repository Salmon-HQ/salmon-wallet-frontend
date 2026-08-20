/**
 * @vitest-environment jsdom
 *
 * The sink and the wave (DESIGN.md, §The wait — "Swap confirm — sink, wave,
 * float"). At the confirm tap the review leaves immediately — no button loader
 * — and the canonical wave wait holds the screen while sign/submit/confirm (and
 * the settle) run. The receipt is allowed in only after the wave's own exit has
 * reported, so the receipt arrives once, never over an unconfirmed
 * transaction, and never twice.
 */
import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwapScreen } from './SwapScreen';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

type Logic = Record<string, unknown>;

let mockLogic: Logic = { step: 'input' };
const setLogic = (logic: Logic) => {
  mockLogic = { swapMode: 'jupiter', inAmount: '1', outAmount: '2', ...logic };
};

vi.mock('@salmon/shared', async () => ({
  // The hold that keeps the wait mounted until its closing wave has left is
  // real (pure React): the choreography under test is exactly when the wave
  // leaves and the receipt is allowed in.
  ...(await vi.importActual<Record<string, unknown>>('@salmon/shared/src/hooks/useWaitExit')),
  useSwapScreenLogic: () => mockLogic,
  useBridgeSettlement: () => ({ trackBridgeExchange: vi.fn(), isStalled: false, retryNow: vi.fn() }),
  getTransactionUrl: () => 'https://explorer.test/tx',
  getDefaultExplorer: () => 'solscan',
  formatEffectiveRate: () => '1 SOL = 2 USDC',
  formatPercent: () => '0.5%',
  semantic: { status: { warning: '#FFB020' } },
  colors: { text: { primary: '#EDF1F7', tertiary: '#8B96AD' } },
  fontFamily: { mono: 'monospace' },
  fontSize: { xs: 10, sm: 12 },
  fontWeight: { semibold: 600 },
  spacing: { sm: 8, md: 12, lg: 16 },
}));

vi.mock('./SwapInputScreen', () => ({
  SwapInputScreen: ({ swapError }: { swapError?: string }) => (
    <div data-testid="swap-input-screen">{swapError}</div>
  ),
}));
vi.mock('./SwapReviewScreen', () => ({
  SwapReviewScreen: () => <div data-testid="swap-review-screen" />,
}));
vi.mock('../BridgeScreen/BridgeRecipientScreen', () => ({
  BridgeRecipientScreen: () => <div data-testid="bridge-recipient-screen" />,
}));
vi.mock('../BridgeScreen/BridgeReviewScreen', () => ({
  BridgeReviewScreen: () => <div data-testid="bridge-review-screen" />,
}));
vi.mock('../TokenSelector', () => ({ TokenSelectorModal: () => null }));
vi.mock('../WarningNotice', () => ({
  WarningNotice: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../TransactionSuccessScreen', () => ({
  TransactionSuccessScreen: () => <div data-testid="tx-success-screen" />,
}));
vi.mock('../LoadingScreen', () => ({
  // Stand-in that keeps the exit contract: when the wave stops being visible it
  // reports `onExited`, the way the real screen does once its last front has
  // left. Visibility is exposed for assertions.
  LoadingScreen: ({ visible, onExited }: { visible?: boolean; onExited?: () => void }) => {
    React.useEffect(() => {
      if (!visible) onExited?.();
    }, [visible, onExited]);
    return <div data-testid="swap-wave-screen" data-visible={String(visible)} />;
  },
}));

const swapProps = {
  tokens: [],
  onGetQuote: vi.fn(),
  onSwap: vi.fn(),
} as unknown as React.ComponentProps<typeof SwapScreen>;

const renderSwap = () => render(<SwapScreen {...swapProps} />);

afterEach(() => {
  cleanup();
});

describe('SwapScreen confirm choreography — sink, wave, float', () => {
  const reviewLogic = {
    step: 'review',
    quote: { outAmount: '1' },
    inToken: { symbol: 'SOL', chain: 'solana' },
    outToken: { symbol: 'USDC', chain: 'solana' },
  };

  const openReview = () => {
    setLogic(reviewLogic);
    const view = renderSwap();
    expect(screen.getByTestId('swap-review-screen')).toBeTruthy();
    return view;
  };

  it('sinks the review at the tap and floats the wave — no receipt yet', () => {
    const view = openReview();

    setLogic({ ...reviewLogic, isConfirming: true });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    expect(screen.queryByTestId('swap-review-screen')).toBeNull();
    expect(screen.getByTestId('swap-wave-screen').dataset.visible).toBe('true');
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
  });

  it('holds the wave through the settle — the receipt never precedes calm water', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    // Confirmed on-chain, indexer still settling: still the wave, no receipt.
    setLogic({ step: 'success', settling: true });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    expect(screen.getByTestId('swap-wave-screen').dataset.visible).toBe('true');
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
  });

  it('floats the receipt in once, only after the last wave has left', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    setLogic({ step: 'success', settling: false });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    // The wave reported its exit; the receipt owns the screen alone.
    expect(screen.queryByTestId('swap-wave-screen')).toBeNull();
    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
  });

  it('cuts the wave and returns to input on failure — nobody is stranded on the wait', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });
    expect(screen.getByTestId('swap-wave-screen')).toBeTruthy();

    // onSwap rejected: the hook clears isConfirming and steps back to input,
    // where the error surfaces. Nothing surfaces on the way there.
    setLogic({ step: 'input', swapError: 'swap.errors.generic' });
    act(() => {
      view.rerender(<SwapScreen {...swapProps} />);
    });

    expect(screen.queryByTestId('swap-wave-screen')).toBeNull();
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
    expect(screen.getByTestId('swap-input-screen').textContent).toBe('swap.errors.generic');
  });
});
