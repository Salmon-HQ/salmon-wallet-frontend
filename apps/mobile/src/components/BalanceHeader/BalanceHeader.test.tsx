/**
 * The balance block's contract with the Home screen.
 *
 * What matters here is not how it looks but what it reports and what it
 * refuses: the eye toggles, a dot switches chain through the same
 * `onBlockchainChange` the carousel used, a watch-only account cannot reach
 * Send, and a hidden balance shows the mask rather than the number — a leak
 * there is the whole point of the privacy toggle.
 */
import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  // The motion constants are real too: the drag geometry is arithmetic on
  // them, and a mocked-away `DRAG_FOLLOW` would make every travel assertion
  // below read `NaN` and pass for the wrong reason.
  ...jest.requireActual('@salmon/shared/src/motion'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  hiddenValue: '••••',
  getLabelValue: (value: number) => (value >= 0 ? 'positive' : 'negative'),
  showPercentage: (value: number) => `${value}%`,
  getNetworkLabel: (id: string) =>
    id === 'solana-devnet' ? 'Devnet' : id === 'bitcoin-testnet' ? 'Testnet' : null,
  NETWORK_DISPLAY: {
    'solana-mainnet': { symbol: 'SOL', name: 'Solana', blockchain: 'solana' },
    'bitcoin-mainnet': { symbol: 'BTC', name: 'Bitcoin', blockchain: 'bitcoin' },
  },
  useCurrencyContext: () => [
    {},
    {
      formatValue: (value: number) => `$${value}`,
      formatChange: (value: number) => (value >= 0 ? `+$${value}` : `-$${Math.abs(value)}`),
    },
  ],
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, values?: Record<string, string>) =>
      Object.entries(values ?? {}).reduce(
        (text, [name, value]) => text.replace(`{{${name}}}`, value),
        fallback
      ),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: Record<string, unknown>) =>
        ReactActual.createElement(View, props, children),
      // The Send/Receive bubbles are animated touchables.
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    // Reduce motion is switchable and `withTiming` is a spy that echoes its
    // target, so a test can also read the duration the component chose
    // (0 under reduce motion, via `resolveMotionMs`).
    useReducedMotion: jest.fn(() => false),
    useSharedValue: (value: unknown) => ReactActual.useRef({ value }).current,
    // Run the worklet at render, so a test can read the style the component
    // actually computes from its shared values rather than an empty object.
    useAnimatedStyle: (factory: () => unknown) => factory(),
    // The chain change is reported from `withTiming`'s completion callback —
    // the amount finishes leaving, and only then does the chain change. A
    // mock that dropped the callback would report no chain change at all.
    withTiming: jest.fn((toValue: unknown, _config: unknown, callback?: (f: boolean) => void) => {
      callback?.(true);
      return toValue;
    }),
    withRepeat: (animation: unknown) => animation,
    Easing: { bezier: () => () => 0, linear: () => 0 },
    runOnJS: (fn: unknown) => fn,
  };
});

const panConfig: Record<string, unknown> = {};

jest.mock('react-native-gesture-handler', () => {
  const chainable: Record<string, unknown> = {};
  for (const method of [
    'onBegin',
    'onUpdate',
    'onEnd',
    'onFinalize',
    // Axis constraints: the block lives inside the NFTs list, so the pan must
    // fail on a vertical drag instead of eating the scroll.
    'activeOffsetX',
    'failOffsetY',
  ]) {
    chainable[method] = (arg: unknown) => {
      panConfig[method] = arg;
      return chainable;
    };
  }
  return {
    Gesture: { Pan: () => chainable },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

// A marker View stands in for the SVG texture, so a test can assert whether
// it mounted without asserting anything about the drawing itself.
jest.mock('../FleshBackground', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    FleshBackground: () => ReactActual.createElement(RNView, { testID: 'flesh-background' }),
  };
});
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null }));
jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

import { Dimensions, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import {
  DRAG_FOLLOW,
  LATERAL_SWAP_TRAVEL,
  SINK_FLOAT_TRAVEL,
  chainMarks,
  motionMs,
  semantic,
} from '@salmon/shared';
import { useReducedMotion, withTiming } from 'react-native-reanimated';

import { BalanceHeader } from './BalanceHeader';

const mockUseReducedMotion = useReducedMotion as unknown as jest.Mock;
const mockWithTiming = withTiming as unknown as jest.Mock;

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false);
  mockWithTiming.mockClear();
});

/** `Dimensions.get('window').width * 0.25`, the block's own commit distance. */
const SWIPE_THRESHOLD = Dimensions.get('window').width * 0.25;

const BLOCKCHAINS = [
  {
    network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' },
    usdTotal: 1200,
    changePercent: 2.8,
    changeAmount: 61.45,
  },
  {
    network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' },
    usdTotal: 300,
    changePercent: -1.4,
    changeAmount: -4.2,
  },
] as any;

describe('BalanceHeader', () => {
  it('shows the total and its change for the active chain', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    expect(view.getByText('$1200')).toBeTruthy();
    // Amount and percentage, in that order, in one tone.
    expect(view.getByText('+$61.45 · 2.8% 24h')).toBeTruthy();
    // The cue points at the chain the next swipe lands on.
    expect(view.getByText('→ BTC')).toBeTruthy();
  });

  it('asks the screen to toggle visibility when the eye is pressed', () => {
    const onToggleVisibility = jest.fn();
    const view = render(
      <BalanceHeader blockchains={BLOCKCHAINS} onToggleVisibility={onToggleVisibility} />
    );

    fireEvent.press(view.getByTestId('balance-eye-toggle'));

    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
  });

  it('switches chain from a dot, reporting the chain and its index', () => {
    const onBlockchainChange = jest.fn();
    const view = render(
      <BalanceHeader blockchains={BLOCKCHAINS} onBlockchainChange={onBlockchainChange} />
    );

    fireEvent.press(view.getByTestId('balance-carousel-dot-1'));

    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });

  it('will not send from a watch-only account', () => {
    const onSendPress = jest.fn();
    const view = render(
      <BalanceHeader blockchains={BLOCKCHAINS} onSendPress={onSendPress} sendDisabled />
    );

    const send = view.getByTestId('home-send-button');
    expect(send.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(send);
    expect(onSendPress).not.toHaveBeenCalled();
  });

  it('masks the number when the balance is hidden, and never renders it', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} hiddenBalance />);

    expect(view.queryByText('$1200')).toBeNull();
    // The amount is money too — masking the total while leaking "+$61.45"
    // gives the shoulder-surfer the same information at a different scale.
    expect(view.queryByText(/61\.45/)).toBeNull();
    expect(view.getByText('•••• · ••••')).toBeTruthy();
  });

  it('points the next-chain hint in the direction the swipe goes', () => {
    // First chain: the next one is to the right. Last chain: there is no next,
    // so the cue points back at the previous one — it used to wrap around and
    // read "→ SOL", an arrow pointing at a swipe that does not exist.
    const first = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(first.getByText('→ BTC')).toBeTruthy();

    const last = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    expect(last.getByText('← SOL')).toBeTruthy();
    expect(last.queryByText('→ SOL')).toBeNull();
  });

  it('keeps the dots and the money controls out of the value swap', () => {
    // Regression (owner, first device run): the whole block used to slide off
    // screen on a chain change, taking the dots, the History pill and
    // Send/Receive with it. Only the values may travel.
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    const swapped = ['balance-amount', 'balance-change', 'balance-next-hint'].map((id) =>
      view.getByTestId(id)
    );
    const fixed = [
      'balance-carousel-dot-0',
      'balance-carousel-dot-1',
      'home-activity-button',
      'home-send-button',
      'home-receive-button',
    ].map((id) => view.getByTestId(id));

    const isInside = (node: any, ancestor: any): boolean => {
      let cursor = node.parent;
      while (cursor) {
        if (cursor === ancestor) return true;
        cursor = cursor.parent;
      }
      return false;
    };

    for (const control of fixed) {
      for (const wrapper of swapped) {
        expect(isInside(control, wrapper)).toBe(false);
      }
    }
  });
});

describe('BalanceHeader value swap', () => {
  it('does not play the float on mount, only on a real chain change', () => {
    // Home moves this block between the pinned wrapper and the NFT grid's list
    // header, so switching sub-tabs unmounts and remounts it. With an entering
    // animation on first mount, an in-page tab change on the SAME chain looked
    // exactly like a chain switch (owner, on device).
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(view.getByTestId('balance-change').props.entering).toBeUndefined();
    expect(view.getByTestId('balance-next-hint').props.entering).toBeUndefined();

    // A remount with the same chain is a fresh component: still no float.
    view.unmount();
    const remounted = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(remounted.getByTestId('balance-change').props.entering).toBeUndefined();

    // The chain actually changing is the one event that owes the gesture.
    remounted.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    expect(remounted.getByTestId('balance-change').props.entering).toBeDefined();
    expect(remounted.getByTestId('balance-next-hint').props.entering).toBeDefined();
  });

  it("gates the hint's sink on the same condition as its float", () => {
    // Symmetry (DESIGN.md rule 3): arriving undoes exactly what leaving did.
    // An ungated `exiting` meant a sub-tab change — which unmounts this whole
    // block — sank the values with nothing floating back, half a verb.
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(view.getByTestId('balance-next-hint').props.exiting).toBeUndefined();

    view.unmount();
    const remounted = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(remounted.getByTestId('balance-next-hint').props.exiting).toBeUndefined();

    remounted.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    const hint = remounted.getByTestId('balance-next-hint');
    expect(hint.props.entering).toBeDefined();
    expect(hint.props.exiting).toBeDefined();
  });

  it('owes the change a float and never a second sink', () => {
    // The change sinks on the gesture, in place, while the amount travels —
    // so by the time the value swaps it has already left. A keyed `exiting`
    // here would sink the outgoing number twice.
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);

    const change = view.getByTestId('balance-change');
    expect(change.props.entering).toBeDefined();
    expect(change.props.exiting).toBeUndefined();
  });
});

/** Every `transform` entry in a style, however deeply the arrays nest. */
const transformsOf = (style: unknown): Record<string, number>[] => {
  const flat = (Array.isArray(style) ? style.flat(Infinity) : [style]) as (
    { transform?: Record<string, number>[] } | undefined
  )[];
  return flat.flatMap((entry) => entry?.transform ?? []);
};

const hasKey = (style: unknown, key: string): boolean =>
  transformsOf(style).some((entry) => key in entry);

const drag = (translationX: number) =>
  (panConfig.onUpdate as (event: { translationX: number }) => void)({ translationX });

const release = (translationX: number) =>
  (panConfig.onEnd as (event: { translationX: number }) => void)({ translationX });

describe('BalanceHeader amount travel', () => {
  it('moves the amount with the finger and nothing else in the block', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    drag(-60);
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    expect(transformsOf(view.getByTestId('balance-amount').props.style)).toContainEqual({
      translateX: -60 * DRAG_FOLLOW,
    });

    // Rule one: the frame holds still. Nothing else may carry the drag.
    for (const id of [
      'balance-carousel-dot-0',
      'balance-carousel-dot-1',
      'balance-next-hint',
      'home-activity-button',
      'home-send-button',
      'home-receive-button',
      'balance-change',
      'balance-change-sink',
    ]) {
      expect(hasKey(view.getByTestId(id).props.style, 'translateX')).toBe(false);
    }
  });

  it('sinks the 24h change in place as the amount travels', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    drag(-SWIPE_THRESHOLD);
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    // At the commit distance the sink is fully played: the full drop, and the
    // light gone. It has still not moved sideways (asserted above).
    const sink = view.getByTestId('balance-change-sink');
    expect(transformsOf(sink.props.style)).toContainEqual({ translateY: SINK_FLOAT_TRAVEL });
    expect(
      (sink.props.style as { opacity?: number }[]).flat(Infinity).some((s) => s?.opacity === 0)
    ).toBe(true);
  });

  it('does not travel toward a chain that is not there', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    // Index 0: there is nothing to the left, so a rightward drag moves nothing.
    drag(120);
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    expect(transformsOf(view.getByTestId('balance-amount').props.style)).toContainEqual({
      translateX: 0,
    });
  });

  it('springs back and changes nothing when the drag stops short', () => {
    const onBlockchainChange = jest.fn();
    render(
      <BalanceHeader
        blockchains={BLOCKCHAINS}
        activeIndex={0}
        onBlockchainChange={onBlockchainChange}
      />
    );

    drag(-20);
    release(-20);

    expect(onBlockchainChange).not.toHaveBeenCalled();
  });

  it('changes the chain once, on the right index, when the drag passes the threshold', () => {
    const onBlockchainChange = jest.fn();
    render(
      <BalanceHeader
        blockchains={BLOCKCHAINS}
        activeIndex={0}
        onBlockchainChange={onBlockchainChange}
      />
    );

    release(-(SWIPE_THRESHOLD + 1));

    expect(onBlockchainChange).toHaveBeenCalledTimes(1);
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });

  it('leaves by the edge it is heading for, and comes back from the other one', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    mockWithTiming.mockClear();
    release(-(SWIPE_THRESHOLD + 1));
    // Heading left, so it finishes leaving to the left.
    expect(mockWithTiming).toHaveBeenCalledWith(
      -LATERAL_SWAP_TRAVEL,
      expect.anything(),
      expect.any(Function)
    );

    // Going the other way is the same verb with the sign flipped.
    const back = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    mockWithTiming.mockClear();
    release(SWIPE_THRESHOLD + 1);
    expect(mockWithTiming).toHaveBeenCalledWith(
      LATERAL_SWAP_TRAVEL,
      expect.anything(),
      expect.any(Function)
    );
    back.unmount();

    // And the arrival lands the amount back at rest on the same axis.
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    expect(transformsOf(view.getByTestId('balance-amount').props.style)).toContainEqual({
      translateX: 0,
    });
  });

  it('commits without animating when reduce motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const onBlockchainChange = jest.fn();
    const view = render(
      <BalanceHeader
        blockchains={BLOCKCHAINS}
        activeIndex={0}
        onBlockchainChange={onBlockchainChange}
      />
    );

    drag(-120);
    release(-(SWIPE_THRESHOLD + 1));
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    // A second pass, so the style is read after the arrival effect has run.
    view.rerender(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);

    // The chain still changes; the amount never travelled, and every clock the
    // block spent resolved to zero.
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
    expect(transformsOf(view.getByTestId('balance-amount').props.style)).toContainEqual({
      translateX: 0,
    });
    for (const call of mockWithTiming.mock.calls) {
      expect((call[1] as { duration: number }).duration).toBe(0);
    }
  });
});

describe('BalanceHeader next-chain hint', () => {
  const ink = (view: ReturnType<typeof render>) => {
    const [hint] = within(view.getByTestId('balance-next-hint')).UNSAFE_getAllByType(Text);
    const flat = StyleSheet.flatten(hint.props.style as StyleProp<TextStyle>) as { color: string };
    return flat.color;
  };

  it('takes the destination chain hue from the tokens, never from a literal', () => {
    // The whole hint — arrow and symbol — reads one token; the token decides
    // per mode whether that is the chain's hue or `text.secondary`.
    const toBitcoin = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(ink(toBitcoin)).toBe(semantic.chain.hintInk.bitcoin);

    const toSolana = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={1} />);
    expect(ink(toSolana)).toBe(semantic.chain.hintInk.solana);
    expect(ink(toSolana)).toBe(chainMarks.byChain.solana);
  });
});

describe('BalanceHeader unknown values', () => {
  const NO_CHANGE_YET = [
    { network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' }, usdTotal: 1200 },
  ] as any;

  it('renders an em-dash for a change the backend has not returned, never a fabricated 0', () => {
    const view = render(<BalanceHeader blockchains={NO_CHANGE_YET} activeIndex={0} />);

    expect(view.getByText('—')).toBeTruthy();
    // The fabricated flat day the `= 0` defaults used to draw.
    expect(view.queryByText(/0%/)).toBeNull();
    expect(view.queryByText(/\$0/)).toBeNull();
  });

  it('still reads the change when the data is there', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);
    expect(view.getByText('+$61.45 · 2.8% 24h')).toBeTruthy();
    expect(view.queryByText('—')).toBeNull();
  });
});

describe('BalanceHeader chain dots', () => {
  it('travels the active pill on the same beat the sub-tab underline uses', () => {
    render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    const durations = mockWithTiming.mock.calls.map(
      (call) => (call[1] as { duration?: number } | undefined)?.duration
    );
    expect(durations).toContain(motionMs.drift);
  });

  it('snaps instead of travelling when reduce motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    expect(mockWithTiming).toHaveBeenCalled();
    for (const call of mockWithTiming.mock.calls) {
      expect((call[1] as { duration: number }).duration).toBe(0);
    }
  });

  it('keeps the dot ids and their hit slop', () => {
    const onBlockchainChange = jest.fn();
    const view = render(
      <BalanceHeader blockchains={BLOCKCHAINS} onBlockchainChange={onBlockchainChange} />
    );

    const dot = view.getByTestId('balance-carousel-dot-1');
    expect(dot.props.hitSlop).toBeTruthy();
    fireEvent.press(dot);
    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });
});

describe('BalanceHeader flesh', () => {
  it('draws the flesh on the salmon-filled Send circle and never on the outline Receive circle', () => {
    const view = render(<BalanceHeader blockchains={BLOCKCHAINS} activeIndex={0} />);

    expect(
      within(view.getByTestId('home-send-button')).getByTestId('flesh-background')
    ).toBeTruthy();
    expect(
      within(view.getByTestId('home-receive-button')).queryByTestId('flesh-background')
    ).toBeNull();
  });
});

describe('BalanceHeader swipe', () => {
  it('claims the horizontal axis only', () => {
    // Inside the NFTs SectionList header an unconstrained pan swallowed
    // vertical drags, so a scroll started on the balance went nowhere.
    render(<BalanceHeader blockchains={BLOCKCHAINS} />);

    expect(panConfig.activeOffsetX).toEqual([-10, 10]);
    expect(panConfig.failOffsetY).toEqual([-10, 10]);
  });
});

describe('BalanceHeader environment chip', () => {
  // The active network decides, not a setting: a devnet session is told it is
  // on devnet whether or not Developer Networks is on (spec 026 D5,
  // DESIGN.md §Chain identity). Mainnet says nothing — there is no "Mainnet"
  // chip to read past.
  const withNetwork = (id: string, blockchain: string) =>
    [{ network: { id, name: id, blockchain }, usdTotal: 1 }] as any;

  it('says nothing on mainnet', () => {
    const view = render(<BalanceHeader blockchains={withNetwork('solana-mainnet', 'solana')} />);

    expect(view.queryByTestId('balance-network-chip')).toBeNull();
  });

  it('names the environment on devnet, with no developer flag in sight', () => {
    const view = render(
      <BalanceHeader blockchains={withNetwork('solana-devnet', 'solana-devnet')} />
    );

    expect(view.getByTestId('balance-network-chip')).toBeTruthy();
    expect(view.getByText('Devnet')).toBeTruthy();
  });

  it('names it on a single-chain wallet too, where there are no dots to sit beside', () => {
    const view = render(
      <BalanceHeader blockchains={withNetwork('bitcoin-testnet', 'bitcoin-testnet')} />
    );

    expect(view.getByText('Testnet')).toBeTruthy();
  });
});
