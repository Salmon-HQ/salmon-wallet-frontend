import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockLogic: Record<string, unknown> = {};
const mockAccount: { watchOnly: boolean } = { watchOnly: false };

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the step transitions only need a View and the reduce-motion flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withDelay: (_delayMs: number, animation: unknown) => animation,
    Easing: { bezier: () => () => 0 },
  };
});

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
// The motion vocabulary is real (pure theme tokens) so the step transition
// helpers can read it.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  // The wave-exit hold is real (pure React): the choreography under test is
  // exactly when the wait leaves and the receipt is allowed in.
  ...jest.requireActual('@salmon/shared/src/hooks/useWaitExit'),
  useSwapScreenLogic: () => mockLogic,
  useAccountsContext: () => [{ activeAccount: mockAccount }],
  isWatchOnlyAccount: (account: { watchOnly?: boolean } | undefined) => !!account?.watchOnly,
  useBridgeSettlement: () => ({
    trackBridgeExchange: jest.fn(),
    isStalled: false,
    retryNow: jest.fn(),
  }),
  getTransactionUrl: () => 'https://solscan.io/tx/abc',
  // The derivations are unit-tested in packages/shared; here they only need
  // to produce a stable string for the receipt props.
  formatEffectiveRate: (_inAmount: string, inSymbol: string, _out: string, outSymbol: string) =>
    inSymbol && outSymbol ? `1 ${inSymbol} ≈ x ${outSymbol}` : null,
  formatPercent: (value: number) => `${value.toFixed(2)}%`,
  getDefaultExplorer: () => 'solscan',
  fontFamilyNative: { semiBold: 'System' },
  fontSize: { sm: 12 },
  semantic: {
    depth: { column: '#0B0F19' },
    status: { warning: '#FFB020' },
  },
  spacing: { md: 12, lg: 16 },
}));

jest.mock('./SwapInputScreen', () => {
  const { View } = require('react-native');
  return { SwapInputScreen: () => <View testID="swap-input-screen" /> };
});
jest.mock('./SwapReviewScreen', () => {
  const { View } = require('react-native');
  return { SwapReviewScreen: () => <View testID="swap-review-screen" /> };
});
jest.mock('../TransactionSuccessScreen', () => {
  const { View } = require('react-native');
  return { TransactionSuccessScreen: () => <View testID="tx-success-screen" /> };
});
jest.mock('../LoadingScreen', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    // Stand-in that keeps the exit contract: when the wave stops being
    // visible it reports `onExited`, the way the real screen does once its
    // last front has left. Visibility is exposed for assertions.
    LoadingScreen: ({ visible, onExited }: { visible?: boolean; onExited?: () => void }) => {
      React.useEffect(() => {
        if (!visible) onExited?.();
      }, [visible, onExited]);
      return <View testID="swap-wave-screen" accessibilityLabel={String(visible)} />;
    },
  };
});
jest.mock('../TokenSelector', () => {
  const { View } = require('react-native');
  return {
    // Surfaces the balance-visibility prop so the per-side contract (send
    // shows holdings, receive hides them) stays asserted.
    TokenSelectorModal: ({ showBalances }: { showBalances?: boolean }) => (
      <View testID="token-selector-modal" accessibilityLabel={String(showBalances)} />
    ),
  };
});
jest.mock('../BridgeScreen/BridgeRecipientScreen', () => {
  const { View } = require('react-native');
  return { BridgeRecipientScreen: () => <View /> };
});
jest.mock('../BridgeScreen/BridgeReviewScreen', () => {
  const { View } = require('react-native');
  return { BridgeReviewScreen: () => <View /> };
});
jest.mock('../WarningNotice', () => {
  const { View } = require('react-native');
  return { WarningNotice: () => <View /> };
});
jest.mock('../DepthBackground', () => {
  const { View } = require('react-native');
  return { DepthBackground: () => <View testID="depth-background" /> };
});
jest.mock('../ScalesBackground', () => {
  const { View } = require('react-native');
  return {
    ScalesBackground: ({ variant }: { variant?: string }) => (
      <View testID="scales-background" accessibilityLabel={variant} />
    ),
  };
});

import { Text } from 'react-native';
import { SwapScreen } from './SwapScreen';
import { FLOAT_DELAY_MS } from '../../utils/sinkAndFloat';
import { TaskChromeProvider, useTaskChrome } from '../../contexts/TaskChromeContext';

const setLogic = (overrides: Record<string, unknown>) => {
  for (const key of Object.keys(mockLogic)) delete mockLogic[key];
  Object.assign(
    mockLogic,
    {
      step: 'input',
      swapMode: 'jupiter',
      inToken: null,
      outToken: null,
      inAmount: '',
      outAmount: '',
      successSummary: null,
      successExchange: null,
      successTxId: null,
      settling: false,
      isConfirming: false,
      showInTokenModal: false,
      showOutTokenModal: false,
      modalInTokens: [],
      modalOutTokens: [],
      modalFeaturedTokens: [],
      tokensLoading: false,
      isLoadingBridgeTokens: false,
      isLoadingQuote: false,
      isLoadingEstimate: false,
      canReview: false,
      reviewWarning: null,
      swapError: null,
      lastBridgeExchange: null,
      setInAmount: jest.fn(),
      setShowInTokenModal: jest.fn(),
      setShowOutTokenModal: jest.fn(),
      handleReview: jest.fn(),
      handleBackFromReview: jest.fn(),
      handleSuccessContinue: jest.fn(),
      handleSearchTokens: jest.fn(),
      handleInTokenModalSelect: jest.fn(),
      handleOutTokenModalSelect: jest.fn(),
    },
    overrides
  );
};

describe('SwapScreen task surface', () => {
  it('mounts the water column — ramp and deep-field scales — behind the success screen', () => {
    setLogic({ step: 'success' });
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByTestId('depth-background')).toBeTruthy();
    expect(screen.getByTestId('scales-background').props.accessibilityLabel).toBe('deepField');
  });

  it('keeps balances on the You Send selector and hides them on You Receive', () => {
    setLogic({ step: 'input' });
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    const [sendModal, receiveModal] = screen.getAllByTestId('token-selector-modal');
    // Send omits the prop (defaults to visible balances); receive turns it off.
    expect(sendModal.props.accessibilityLabel).toBe('undefined');
    expect(receiveModal.props.accessibilityLabel).toBe('false');
  });
});

/**
 * The task-window choreography. Review lives in an RN Modal — its own native
 * window — so the sink and the float cannot animate across the boundary. The
 * contract under test: the modal brings no animation of its own (its slide
 * used to swallow the verb), and its visibility waits out whichever half of
 * the verb plays on the other side — the input sink before it appears, the
 * review sink before it vanishes. A success exit is a cut and waits nothing.
 */
describe('SwapScreen task window choreography', () => {
  const reviewLogic = {
    step: 'review',
    quote: { outAmount: '1' },
    inToken: { symbol: 'SOL', chain: 'solana' },
    outToken: { symbol: 'USDC', chain: 'solana' },
  };

  const renderSwap = () =>
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('brings no window animation of its own — the verb owns the transition', () => {
    setLogic(reviewLogic);
    renderSwap();
    expect(screen.getByTestId('swap-task-modal').props.animationType).toBe('none');
  });

  it('waits out the input sink plus the beat before the window appears', () => {
    setLogic({ step: 'input' });
    const view = renderSwap();

    setLogic(reviewLogic);
    view.rerender(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    // The shell's input step is sinking; the window must hold back.
    expect(screen.queryByTestId('swap-review-screen')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(FLOAT_DELAY_MS);
    });
    expect(screen.getByTestId('swap-review-screen')).toBeTruthy();
  });

  it('holds the window through the review sink, then hands the shell back', () => {
    setLogic(reviewLogic);
    const view = renderSwap();
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('swap-review-screen')).toBeTruthy();

    setLogic({ step: 'input' });
    view.rerender(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    // Review's sink plays inside the still-open window. RN's Modal renders
    // nothing at all when not visible, so presence in the tree IS visibility.
    expect(screen.getByTestId('swap-task-modal')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(FLOAT_DELAY_MS);
    });
    expect(screen.queryByTestId('swap-task-modal')).toBeNull();
  });

  it('cuts the window immediately after success — nothing sinks there', () => {
    setLogic({ step: 'success' });
    const view = renderSwap();
    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();

    setLogic({ step: 'input' });
    view.rerender(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    // No timer, no lingering window: the modal leaves the tree at once.
    expect(screen.queryByTestId('swap-task-modal')).toBeNull();
  });
});

/**
 * The task-chrome claim. The wallet header row and the floating pill are shell chrome —
 * outside the step, outside the modal — so the verb reaches them through
 * TaskChromeContext. The contract: engaged the moment the task step begins
 * (the chrome leaves during the beat, before the window covers it), and held
 * until the window has actually gone, so the chrome's return lands exactly
 * on the shell's delayed input float.
 */
describe('SwapScreen task-chrome signal', () => {
  const reviewLogic = {
    step: 'review',
    quote: { outAmount: '1' },
    inToken: { symbol: 'SOL', chain: 'solana' },
    outToken: { symbol: 'USDC', chain: 'solana' },
  };

  const Probe = () => {
    const { isTaskEngaged } = useTaskChrome();
    return <Text testID="task-chrome-probe">{String(isTaskEngaged)}</Text>;
  };

  const renderWithProbe = () =>
    render(
      <TaskChromeProvider>
        <SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />
        <Probe />
      </TaskChromeProvider>
    );

  const rerenderWithProbe = (view: ReturnType<typeof render>) =>
    view.rerender(
      <TaskChromeProvider>
        <SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />
        <Probe />
      </TaskChromeProvider>
    );

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('claims the chrome the moment review begins — before the window appears', () => {
    setLogic({ step: 'input' });
    const view = renderWithProbe();
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('false');

    setLogic(reviewLogic);
    rerenderWithProbe(view);

    // The window is still waiting out the beat, but the chrome must already
    // be leaving with the sinking content.
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('true');
  });

  it('holds the claim until the window has gone, then releases it', () => {
    setLogic(reviewLogic);
    const view = renderWithProbe();
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('true');

    setLogic({ step: 'input' });
    rerenderWithProbe(view);

    // Review is still sinking inside the open window — the chrome stays out.
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('true');

    act(() => {
      jest.advanceTimersByTime(FLOAT_DELAY_MS);
    });
    // The window vanished; the chrome comes back with the delayed float.
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('false');
  });
});

/**
 * The sink and the wave. At the confirm tap the review sinks immediately —
 * no button loader, no frozen review — and the canonical wave wait holds
 * while sign/submit/confirm (and the settle) run. The receipt is allowed in
 * only after the wave's own exit has reported, so the receipt arrives once,
 * never over an unconfirmed transaction, and never twice.
 */
describe('SwapScreen confirm choreography — sink, wave, float', () => {
  const reviewLogic = {
    step: 'review',
    quote: { outAmount: '1' },
    inToken: { symbol: 'SOL', chain: 'solana' },
    outToken: { symbol: 'USDC', chain: 'solana' },
  };

  const renderSwap = () =>
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);
  const rerenderSwap = (view: ReturnType<typeof render>) =>
    view.rerender(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const openReview = () => {
    setLogic(reviewLogic);
    const view = renderSwap();
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('swap-review-screen')).toBeTruthy();
    return view;
  };

  it('sinks the review at the tap and floats the wave — no receipt yet', () => {
    const view = openReview();

    setLogic({ ...reviewLogic, isConfirming: true });
    rerenderSwap(view);

    expect(screen.queryByTestId('swap-review-screen')).toBeNull();
    expect(screen.getByTestId('swap-wave-screen').props.accessibilityLabel).toBe('true');
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
  });

  it('holds the wave through the settle — the receipt never precedes calm water', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    rerenderSwap(view);

    // Confirmed on-chain, indexer still settling: still the wave, no receipt.
    setLogic({ step: 'success', settling: true });
    rerenderSwap(view);

    expect(screen.getByTestId('swap-wave-screen').props.accessibilityLabel).toBe('true');
    expect(screen.queryByTestId('tx-success-screen')).toBeNull();
  });

  it('floats the receipt in once, only after the last wave has left', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    rerenderSwap(view);

    setLogic({ step: 'success', settling: false });
    act(() => {
      rerenderSwap(view);
    });

    // The wave reported its exit; the receipt owns the screen alone.
    expect(screen.queryByTestId('swap-wave-screen')).toBeNull();
    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
  });

  it('cuts the wave and returns to input on failure — nobody is stranded on the wait', () => {
    const view = openReview();
    setLogic({ ...reviewLogic, isConfirming: true });
    rerenderSwap(view);
    expect(screen.getByTestId('swap-wave-screen')).toBeTruthy();

    // onSwap rejected: the hook clears isConfirming and steps back to input,
    // where the error surfaces. The wave leaves with the closing window.
    setLogic({ step: 'input', swapError: 'swap.errors.generic' });
    rerenderSwap(view);
    expect(screen.queryByTestId('swap-wave-screen')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(FLOAT_DELAY_MS);
    });
    expect(screen.queryByTestId('swap-task-modal')).toBeNull();
    expect(screen.getByTestId('swap-input-screen')).toBeTruthy();
  });
});

describe('SwapScreen watch-only guard', () => {
  afterEach(() => {
    mockAccount.watchOnly = false;
  });

  it('refuses the whole screen for a watch-only wallet', () => {
    // The swap route's `href` gate is unconditional now, so the tab no longer
    // hides this screen from a keyless wallet — the screen has to refuse.
    mockAccount.watchOnly = true;
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    expect(screen.getByTestId('swap-watch-only-notice')).toBeTruthy();
    expect(screen.queryByTestId('swap-input-screen')).toBeNull();
  });

  it('renders the form for a signable wallet', () => {
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    expect(screen.queryByTestId('swap-watch-only-notice')).toBeNull();
    expect(screen.getByTestId('swap-input-screen')).toBeTruthy();
  });
});
