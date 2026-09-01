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
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  hiddenValue: '••••',
  getLabelValue: (value: number) => (value >= 0 ? 'positive' : 'negative'),
  showPercentage: (value: number) => `${value}%`,
  getNetworkLabel: () => null,
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
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: unknown) => toValue,
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

// The textures are SVG and say nothing about behaviour.
jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));
jest.mock('../PressSpecular', () => ({ PressSpecular: () => null }));
jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

import { BalanceHeader } from './BalanceHeader';

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

describe('BalanceHeader swipe', () => {
  it('claims the horizontal axis only', () => {
    // Inside the NFTs SectionList header an unconstrained pan swallowed
    // vertical drags, so a scroll started on the balance went nowhere.
    render(<BalanceHeader blockchains={BLOCKCHAINS} />);

    expect(panConfig.activeOffsetX).toEqual([-10, 10]);
    expect(panConfig.failOffsetY).toEqual([-10, 10]);
  });
});
