/**
 * The pagination dots' touch geometry.
 *
 * The dots are 4pt and sit 6pt apart, and that is deliberate — they are not
 * allowed to grow. What is allowed to grow is the invisible box around each
 * one, and it used to be enlarged past the gap: a hit area 20pt wide on dots
 * pitched 10pt apart means every gap belongs to two dots at once, so a tap
 * there switches to whichever chain the responder chain happened to pick.
 *
 * These assertions pin the two rules the fix follows, in order: boxes may
 * touch but never cross, and within that they take everything they can get.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  hiddenValue: '••••',
  getLabelValue: (value: number) => (value >= 0 ? 'positive' : 'negative'),
  showPercentage: (value: number) => `${value}%`,
  getNetworkLabel: () => null,
  useCurrencyContext: () => [
    {},
    { formatValue: (value: number) => `$${value}`, formatChange: () => '+$0.00' },
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
    },
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0, linear: () => 0 },
    runOnJS: (fn: unknown) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View: RNView } = jest.requireActual('react-native');
  const chainable: Record<string, unknown> = {};
  for (const method of ['onBegin', 'onUpdate', 'onEnd', 'onFinalize']) {
    chainable[method] = () => chainable;
  }
  return {
    Gesture: { Pan: () => chainable },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: RNView,
  };
});

jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    LinearGradient: ({ children, ...props }: Record<string, unknown>) =>
      ReactActual.createElement(View, props, children),
  };
});

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ heroCardTopInset: 0, topInset: 0 }),
}));

import { StyleSheet } from 'react-native';
import { BalanceCardCarousel } from './BalanceCardCarousel';

/** Mirrors the component's own floor; the arithmetic below is checked, not assumed. */
const TOUCH_TARGET_MIN = 44;

const BLOCKCHAINS = [
  { network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' }, usdTotal: 10 },
  { network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' }, usdTotal: 20 },
  { network: { id: 'ethereum-mainnet', name: 'Ethereum', blockchain: 'ethereum' }, usdTotal: 30 },
] as any;

function renderCarousel() {
  return render(<BalanceCardCarousel blockchains={BLOCKCHAINS} />);
}

function readDot(index: number) {
  const dot = renderCarousel().getByTestId(`balance-carousel-dot-${index}`);
  const style = StyleSheet.flatten(dot.props.style) as Record<string, number>;
  const hitSlop = dot.props.hitSlop as Record<string, number>;
  return { dot, style, hitSlop };
}

describe('BalanceCardCarousel pagination dots', () => {
  it('never lets one dot reach into its neighbour', () => {
    const { style, hitSlop } = readDot(0);

    // Pitch is what one dot may occupy in total: its own width plus the two
    // half-gaps around it. Anything wider crosses into the next dot.
    const pitch = style.width + style.marginHorizontal * 2;
    const hitWidth = style.width + hitSlop.left + hitSlop.right;

    expect(hitWidth).toBeLessThanOrEqual(pitch);
  });

  it('takes every point the geometry allows', () => {
    const { style, hitSlop } = readDot(0);

    const pitch = style.width + style.marginHorizontal * 2;
    const hitWidth = style.width + hitSlop.left + hitSlop.right;
    const hitHeight = style.height + hitSlop.top + hitSlop.bottom;

    // Sideways the ceiling is the pitch, and the box reaches it exactly.
    expect(hitWidth).toBe(pitch);
    // Vertically nothing is in the way, so the floor is reachable.
    expect(hitHeight).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
  });

  it('leaves the dots looking exactly as they did', () => {
    const { style } = readDot(0);

    expect(style.width).toBe(4);
    expect(style.height).toBe(4);
    expect(style.marginHorizontal).toBe(3);
  });

  it('still tells assistive tech which chain each dot switches to, and which is current', () => {
    const view = renderCarousel();

    const second = view.getByTestId('balance-carousel-dot-1');
    expect(second.props.accessibilityLabel).toContain('Bitcoin');
    expect(second.props.accessibilityState.selected).toBe(false);
    expect(view.getByTestId('balance-carousel-dot-0').props.accessibilityState.selected).toBe(true);
  });
});

describe('the neighbour light', () => {
  const renderAt = (activeIndex: number) =>
    render(<BalanceCardCarousel blockchains={BLOCKCHAINS} activeIndex={activeIndex} />);

  it('lights only the sides a swipe can actually go', () => {
    // First card: nothing to the left.
    const first = renderAt(0);
    expect(first.queryByTestId('balance-carousel-edge-light-left')).toBeNull();
    expect(first.getByTestId('balance-carousel-edge-light-right')).toBeTruthy();
    first.unmount();

    // Middle: a neighbour each way.
    const middle = renderAt(1);
    expect(middle.getByTestId('balance-carousel-edge-light-left')).toBeTruthy();
    expect(middle.getByTestId('balance-carousel-edge-light-right')).toBeTruthy();
    middle.unmount();

    // Last card: nothing to the right.
    const last = renderAt(2);
    expect(last.getByTestId('balance-carousel-edge-light-left')).toBeTruthy();
    expect(last.queryByTestId('balance-carousel-edge-light-right')).toBeNull();
  });

  it('leaves the middle of the card clear — the two edges may never meet', () => {
    const view = renderAt(1);
    const widthOf = (testID: string) =>
      (StyleSheet.flatten(view.getByTestId(testID).props.style) as { width?: string }).width;

    const left = parseFloat(String(widthOf('balance-carousel-edge-light-left')));
    const right = parseFloat(String(widthOf('balance-carousel-edge-light-right')));

    // The balance figure is centred and wide. Two edges that overlap stop
    // being edges and become a wash under the one number on the screen.
    expect(left + right).toBeLessThan(100);
  });

  it('never takes a touch — it is light, not a target', () => {
    const view = renderAt(1);
    expect(view.getByTestId('balance-carousel-edge-light-left').props.pointerEvents).toBe('none');
    expect(view.getByTestId('balance-carousel-edge-light-right').props.pointerEvents).toBe('none');
  });
});
