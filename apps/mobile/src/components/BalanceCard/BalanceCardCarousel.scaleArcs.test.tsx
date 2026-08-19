/**
 * The chain selector on the balance carousel — the pager is the motif.
 *
 * Each position under the balance renders as a seigaiha scale arc, the brand
 * motif, not a generic pager dot: one per available network, each tappable
 * inside a 44pt cell (WCAG AA touch floor, PRODUCT.md), each labelled for
 * assistive tech, and a tap drives the same updateIndex path a swipe settle
 * does. The active arc is filled in the primary ink and one step larger; the
 * inactive ones are faint stroke arcs. In developer mode the network list
 * grows (devnet/testnet entries) and the arc row must grow with it, in list
 * order.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// The real module pulls in @solana/kit, which jest-expo will not transform.
// Only the tokens and helpers this carousel (and its motion util) read.
jest.mock('@salmon/shared', () => ({
  seigaihaTile: { width: 806.4, height: 25.2 },
  semantic: {
    text: { primary: '#F6F8FB', secondary: '#A7B1C4' },
  },
  colors: {
    text: { primary: '#F6F8FB', balance: '#DDE3ED' },
    change: { positive: '#33D6A6', negative: '#FF6B85', neutral: '#8B96AD' },
    background: { glass: 'rgba(0, 0, 0, 0.4)' },
    step: { inactive: 'rgba(255, 255, 255, 0.3)' },
  },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, '2xl': 24, paginationGap: 42 },
  borderRadius: { sm: 4, card: 28, full: 9999 },
  componentSizes: {
    blockchainIcon: 42,
    logoContainer: 48,
    eyeIcon: 20,
    changeArrowIcon: 14,
    headerInnerHeight: 63,
    stepDotSize: 8,
    headerButtonSize: 44,
  },
  fontSize: { xs: 10, sm: 14, balance: 60 },
  fontWeight: { medium: '500', semibold: '600' },
  fontFamilyNative: { medium: 'DMSans', semiBold: 'DMSans' },
  letterSpacing: { wide: 0.3, balance: -0.245, change: 0 },
  opacity: { faint: 0.4 },
  motionMs: { drift: 260, ebb: 180 },
  motionEasing: {
    current: { native: [0.16, 1, 0.3, 1] },
    settle: { native: [0.22, 1, 0.36, 1] },
    sink: { native: [0.4, 0, 1, 1] },
    swellIn: { native: [0.34, 1.3, 0.64, 1] },
  },
  resolveMotionMs: (ms: number) => ms,
  shadows: {
    card: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    logo: { shadowColor: '#000', shadowOffset: {}, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    balanceText: {
      shadowColor: '#000',
      shadowOffset: {},
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
  gradients: {
    balanceCardSolana: { colors: ['#212938', '#161C2D', '#10131C'] },
    balanceCardSolanaDevnet: { colors: ['#212938', '#161C2D', '#10131C'] },
    balanceCardBitcoin: { colors: ['#212938', '#161C2D', '#10131C'] },
    balanceCardBitcoinTestnet: { colors: ['#212938', '#161C2D', '#10131C'] },
    balanceCardEthereum: { colors: ['#212938', '#161C2D', '#10131C'] },
    balanceCardEthereumSepolia: { colors: ['#212938', '#161C2D', '#10131C'] },
  },
  hiddenValue: '••••',
  ms: (n: number) => n,
  s: (n: number) => n,
  vs: (n: number) => n,
  getLabelValue: (v: number) => (v >= 0 ? 'positive' : 'negative'),
  showPercentage: (v: number) => `${v}%`,
  getNetworkLabel: () => null,
  useCurrencyContext: () => [
    {},
    { formatValue: (v: number) => `$${v}`, formatChange: () => '+$0' },
  ],
}));

// Reanimated's native side is unavailable under jest-expo (same hand mock the
// other suites use). withTiming resolves immediately and fires its callback,
// which lets the tap → slide → updateIndex chain be asserted synchronously.
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
    withTiming: (toValue: unknown, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return toValue;
    },
    runOnJS: (fn: unknown) => fn,
    Easing: { bezier: () => () => 0 },
  };
});

// Gestures never fire in this suite; the detector just renders its child.
jest.mock('react-native-gesture-handler', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  const chain: Record<string, unknown> = {};
  chain.onUpdate = () => chain;
  chain.onEnd = () => chain;
  return {
    GestureHandlerRootView: passthrough,
    GestureDetector: passthrough,
    Gesture: { Pan: () => chain },
  };
});

jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, opts?: { name?: string }) =>
      opts?.name ? fallback.replace('{{name}}', opts.name) : fallback,
  }),
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ heroCardTopInset: 0, topInset: 0 }),
}));

jest.mock('../../icons', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Icon = () => ReactActual.createElement(View);
  return { CaretDownIcon: Icon, CaretUpIcon: Icon, EyeIcon: Icon, EyeSlashIcon: Icon };
});

jest.mock('../Icon/SvgIcons', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Icon = () => ReactActual.createElement(View);
  return { BitcoinSvgIcon: Icon, EthereumSvgIcon: Icon, SolanaSvgIcon: Icon };
});

jest.mock('../../debug/layerColors', () => ({
  DEBUG_LAYER_COLORS: false,
  DEBUG_LAYER_COLOR: {},
}));

import { Path } from 'react-native-svg';

import { BalanceCardCarousel } from './BalanceCardCarousel';

const MAINNET_BLOCKCHAINS = [
  { network: { id: 'solana-mainnet', name: 'Solana', blockchain: 'solana' as const }, usdTotal: 1 },
  {
    network: { id: 'bitcoin-mainnet', name: 'Bitcoin', blockchain: 'bitcoin' as const },
    usdTotal: 2,
  },
  {
    network: { id: 'ethereum-mainnet', name: 'Ethereum', blockchain: 'ethereum' as const },
    usdTotal: 3,
  },
];

// What useAvailableNetworks yields with developerNetworks on: each chain's
// mainnet followed by its dev/test network, grouped per blockchain.
const DEVELOPER_BLOCKCHAINS = [
  MAINNET_BLOCKCHAINS[0],
  {
    network: { id: 'solana-devnet', name: 'Solana Devnet', blockchain: 'solana-devnet' as const },
    usdTotal: 0,
  },
  MAINNET_BLOCKCHAINS[1],
  {
    network: {
      id: 'bitcoin-testnet',
      name: 'Bitcoin Testnet',
      blockchain: 'bitcoin-testnet' as const,
    },
    usdTotal: 0,
  },
  MAINNET_BLOCKCHAINS[2],
  {
    network: {
      id: 'ethereum-sepolia',
      name: 'Ethereum Sepolia',
      blockchain: 'ethereum-sepolia' as const,
    },
    usdTotal: 0,
  },
];

describe('BalanceCardCarousel — the scale arcs are the chain selector', () => {
  it('renders one scale arc per network, keyed by network id', () => {
    const api = render(<BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} />);

    expect(api.getByTestId('balance-carousel-dots').children).toHaveLength(3);
    for (const chain of MAINNET_BLOCKCHAINS) {
      expect(api.getByTestId(`balance-carousel-dot-${chain.network.id}`)).toBeTruthy();
    }
    // The glyph is the seigaiha arc — a single cubic per cell, derived from
    // the shared tile (w = tile.width/28 = 28.8, rise = tile.height/2 = 12.6).
    const paths = api.UNSAFE_getAllByType(Path);
    expect(paths).toHaveLength(3);
    for (const path of paths) {
      expect(path.props.d).toContain('M0 12.6 C0 -4.2');
      expect(path.props.d).toContain('28.8 -4.2 28.8 12.6');
    }
  });

  it('fills the active arc with primary ink and strokes the rest faintly', () => {
    const api = render(<BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} />);

    const paths = api.UNSAFE_getAllByType(Path);
    const filled = paths.filter((p) => p.props.fill === '#F6F8FB');
    const stroked = paths.filter((p) => p.props.stroke === 'rgba(255, 255, 255, 0.3)');

    // Exactly one filled (the active, closed along its baseline) — the others
    // are open faint strokes with no fill.
    expect(filled).toHaveLength(1);
    expect(filled[0].props.d.endsWith('Z')).toBe(true);
    expect(stroked).toHaveLength(2);
    for (const p of stroked) {
      expect(p.props.fill).toBe('none');
      expect(p.props.d.endsWith('Z')).toBe(false);
    }
  });

  it('switches chain through the same updateIndex path a swipe uses', () => {
    const onBlockchainChange = jest.fn();
    const { getByTestId } = render(
      <BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} onBlockchainChange={onBlockchainChange} />
    );

    fireEvent.press(getByTestId('balance-carousel-dot-bitcoin-mainnet'));

    expect(onBlockchainChange).toHaveBeenCalledWith('bitcoin', 1);
  });

  it('does nothing when the active arc is tapped again', () => {
    const onBlockchainChange = jest.fn();
    const { getByTestId } = render(
      <BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} onBlockchainChange={onBlockchainChange} />
    );

    fireEvent.press(getByTestId('balance-carousel-dot-solana-mainnet'));

    expect(onBlockchainChange).not.toHaveBeenCalled();
  });

  it('labels every arc for assistive tech and marks the active one selected', () => {
    const { getByLabelText, getByTestId } = render(
      <BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} />
    );

    expect(getByLabelText('Switch to Solana')).toBeTruthy();
    expect(getByLabelText('Switch to Bitcoin')).toBeTruthy();
    expect(getByLabelText('Switch to Ethereum')).toBeTruthy();
    expect(
      getByTestId('balance-carousel-dot-solana-mainnet').props.accessibilityState
    ).toEqual({ selected: true });
    expect(
      getByTestId('balance-carousel-dot-bitcoin-mainnet').props.accessibilityState
    ).toEqual({ selected: false });
  });

  it('gives each arc a 44pt touch cell (WCAG AA floor)', () => {
    const { getByTestId } = render(<BalanceCardCarousel blockchains={MAINNET_BLOCKCHAINS} />);

    const cell = StyleSheet.flatten(
      getByTestId('balance-carousel-dot-solana-mainnet').props.style
    );
    expect(cell.width).toBeGreaterThanOrEqual(44);
    expect(cell.height).toBeGreaterThanOrEqual(44);
  });

  it('grows to one arc per developer-mode network, in list order', () => {
    const { getByTestId } = render(<BalanceCardCarousel blockchains={DEVELOPER_BLOCKCHAINS} />);

    const row = getByTestId('balance-carousel-dots');
    expect(row.children).toHaveLength(6);
    for (const chain of DEVELOPER_BLOCKCHAINS) {
      expect(getByTestId(`balance-carousel-dot-${chain.network.id}`)).toBeTruthy();
    }
  });

  it('switches to a developer network when its arc is tapped', () => {
    const onBlockchainChange = jest.fn();
    const { getByTestId } = render(
      <BalanceCardCarousel
        blockchains={DEVELOPER_BLOCKCHAINS}
        onBlockchainChange={onBlockchainChange}
      />
    );

    fireEvent.press(getByTestId('balance-carousel-dot-ethereum-sepolia'));

    expect(onBlockchainChange).toHaveBeenCalledWith('ethereum-sepolia', 5);
  });
});
