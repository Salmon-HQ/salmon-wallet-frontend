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
  useSwapScreenLogic: () => mockLogic,
  useBridgeSettlement: () => ({
    trackBridgeExchange: jest.fn(),
    isStalled: false,
    retryNow: jest.fn(),
  }),
  getTransactionUrl: () => 'https://solscan.io/tx/abc',
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
jest.mock('../TokenSelector', () => {
  const { View } = require('react-native');
  return { TokenSelectorModal: () => <View testID="token-selector-modal" /> };
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
  it('mounts the water column — ramp, snow, and deep-field scales — behind the success screen', () => {
    setLogic({ step: 'success' });
    render(<SwapScreen tokens={[]} onGetQuote={jest.fn()} onSwap={jest.fn()} />);

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByTestId('depth-background')).toBeTruthy();
    expect(screen.getByTestId('scales-background').props.accessibilityLabel).toBe('deepField');
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
 * The compuerta. The gate header and the floating pill are shell chrome —
 * outside the step, outside the modal — so the verb reaches them through
 * TaskChromeContext. The contract: engaged the moment the task step begins
 * (the chrome leaves during the beat, before the window covers it), and held
 * until the window has actually gone, so the chrome's return lands exactly
 * on the shell's delayed input float.
 */
describe('SwapScreen compuerta signal', () => {
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

  it('raises the compuerta the moment review begins — before the window appears', () => {
    setLogic({ step: 'input' });
    const view = renderWithProbe();
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('false');

    setLogic(reviewLogic);
    rerenderWithProbe(view);

    // The window is still waiting out the beat, but the chrome must already
    // be leaving with the sinking content.
    expect(screen.getByTestId('task-chrome-probe').props.children).toBe('true');
  });

  it('holds the compuerta up until the window has gone, then lowers it', () => {
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
