import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';

const mockNotificationAsync = jest.fn();
let mockReduceMotion = false;

const mockPrimaryButton = ({
  children,
  testID,
}: {
  children?: React.ReactNode;
  testID?: string;
}) => <Text testID={testID}>{children}</Text>;

const mockLoadingScreen = ({ title, bottomOffset }: { title?: string; bottomOffset?: number }) => (
  <Text testID="loading-screen" accessibilityLabel={String(bottomOffset)}>
    {title}
  </Text>
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest. The arrival only needs a View to hang the entering animation on, the
// reduce-motion flag, and the two timing helpers the verb spends.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => mockReduceMotion,
    withDelay: (delayMs: number, animation: unknown) => ({ delayMs, animation }),
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  ...jest.requireActual('@salmon/shared/src/theme/scales'),
  // The ending's bands and the verb's constants are the real ones: this screen
  // reads the onboarding grid rather than restating it, so a test that mocked
  // the table would be asserting its own numbers.
  ...jest.requireActual('@salmon/shared/src/theme/onboardingGrid'),
  ...jest.requireActual('@salmon/shared/src/motion/sinkFloat'),
  letterSpacing: { normal: 0, wide: 0.3, snug: -0.12 },
  // The real gate is `useWaitGate` and it is tested where it lives
  // (packages/shared). Transparent here, so these cases stay about what the
  // screen renders in each state rather than about timing.
  useWaitGate: (active: boolean) => active,
  // Likewise the hold that keeps the wait mounted until its closing wave has
  // left. Transparent here: `useWaitExit` is tested in packages/shared, and
  // these cases are about what the screen renders in each state.
  useWaitExit: (showWait: boolean) => ({ held: showWait, onExited: () => {} }),
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
  semantic: {
    accent: { fill: '#FF5C45', onFill: '#070911', ink: '#FF5C45', tint: 'rgba(255,92,69,0.1)' },
    text: {
      primary: '#F6F8FB',
      secondary: '#A7B1C4',
      tertiary: '#8B96AD',
      disabled: '#6F7B95',
      accent: '#FF5C45',
      onAccent: '#070911',
      onGlass: '#F6F8FB',
    },
    border: { default: '#58637B', raised: '#6F7B95', strong: '#8B96AD' },
    surface: {
      shelf: '#10131C',
      raised: '#161C2D',
      crest: '#1B2233',
      bedrock: '#0B0F19',
      membraneThick: 'rgba(11, 15, 25, 0.80)',
    },
    scales: {
      refractionScale: 0.5,
      deepFieldStroke: 'rgba(199,211,232,0.06)',
      deepFieldScale: 3.2,
      fishStroke: 'rgba(7,9,17,0.10)',
      fishScale: 1,
    },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    state: { hover: 'rgba(199,211,232,0.06)', press: 'rgba(199,211,232,0.10)' },
  },
  colors: {
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
    accent: { primary: '#0f0', border: '#0c0' },
    background: { tertiary: '#111' },
    status: { success: '#0f0' },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48 },
  borderRadius: { lg: 16, full: 999, card: 12 },
  fontSize: { sm: 12, base: 14, body: 14, bodyLg: 16, title: 20, headline: 24, '4xl': 36 },
  fontWeight: { semibold: '600', bold: '700' },
  gradients: { primaryButton: { colors: ['#0f0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
  shadows: { imageHero: {} },
  componentSizes: {
    logoSizeSmall: 80,
    buttonHeight: 56,
    buttonHeightSmall: 44,
    buttonHeightCompact: 48,
    buttonMinWidthLg: 200,
    // The token marks are the graphic's subject; the tick and the arrow are
    // chrome-sized glyphs.
    iconSize3XL: 48,
    iconSizeMedium: 24,
  },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  fontFamilyNative: { bold: 'System', semiBold: 'System', medium: 'System', regular: 'System' },
  borderWidth: { accent: 1 },
  lineHeight: { none: 1, tight: 1.25, condensed: 1.25, normal: 1.5 },
}));

// The verb's own animation is tested where it lives (`utils/sinkAndFloat`).
// Here it is transparent, so a case can read back the beat each band was given
// — the order of the reveal is what these cases are about.
jest.mock('../../utils/sinkAndFloat', () => ({
  floatEntering: (isReduceMotionEnabled: boolean, options?: { delayMs?: number }) =>
    isReduceMotionEnabled ? undefined : { delayMs: options?.delayMs ?? 0 },
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 96, insets: { top: 0, bottom: 34 } }),
}));

jest.mock('../Button', () => ({
  PrimaryButton: (props: { children?: React.ReactNode; testID?: string }) =>
    mockPrimaryButton(props),
  TextButton: (props: { children?: React.ReactNode; testID?: string }) => mockPrimaryButton(props),
}));

jest.mock('../LoadingScreen', () => ({
  LoadingScreen: (props: { title?: string }) => mockLoadingScreen(props),
}));

// The real one reaches expo-image; what matters here is which token each mark
// was asked to draw and how big.
jest.mock('../TokenLogo', () => {
  const { Text } = require('react-native');
  return {
    TokenLogo: ({ uri, symbol, size }: { uri?: string; symbol?: string; size: number }) => (
      <Text testID={`token-logo-${symbol}`} accessibilityLabel={`${uri ?? 'none'}:${size}`}>
        {symbol}
      </Text>
    ),
  };
});

import {
  resolveOnboardingBands,
  resolveOnboardingGrid,
  SINK_FLOAT_STAGGER_MS,
} from '@salmon/shared';
import { TransactionSuccessScreen } from './TransactionSuccessScreen';

/** The bands the receipt reads: the onboarding ending's, with no secondary. */
const endingBands = resolveOnboardingBands(resolveOnboardingGrid('identity'), false);

const exchange = {
  send: { label: 'Sent', symbol: 'USDC', amount: '1.1 USDC', logo: 'https://u/usdc.png' },
  receive: { label: 'Received', symbol: 'SOL', amount: '0.0132 SOL', logo: 'https://u/sol.png' },
};

const baseProps = {
  title: 'Swap Complete',
  summary: '1 SOL → 200 USDC',
  explorerUrl: 'https://solscan.io/tx/abc',
  onContinue: jest.fn(),
};

describe('TransactionSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion = false;
  });

  describe('while settling', () => {
    it('shows the loader with the pending title instead of the success content', () => {
      render(<TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />);

      expect(screen.getByTestId('loading-screen')).toHaveTextContent('Processing swap');
      expect(screen.queryByText('Swap Complete')).toBeNull();
    });

    it('falls back to the success title when no pending title is given', () => {
      render(<TransactionSuccessScreen {...baseProps} settling />);

      expect(screen.getByTestId('loading-screen')).toHaveTextContent('Swap Complete');
    });

    it('reserves the floating tab bar space so the loader is not centred behind it', () => {
      render(<TransactionSuccessScreen {...baseProps} settling />);

      expect(screen.getByTestId('loading-screen').props.accessibilityLabel).toBe('96');
    });

    it('hides the controls that would navigate away from an unsettled balance', () => {
      render(<TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />);

      expect(screen.queryByTestId('tx-success-continue-button')).toBeNull();
      expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
    });

    it('holds the success haptic until the transaction settles', () => {
      const { rerender } = render(
        <TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />
      );

      expect(mockNotificationAsync).not.toHaveBeenCalled();

      rerender(<TransactionSuccessScreen {...baseProps} settling={false} />);

      expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('once settled', () => {
    it('shows the success content and the e2e selectors', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByText('Swap Complete')).toBeTruthy();
      expect(screen.getByText('1 SOL → 200 USDC')).toBeTruthy();
      expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
      expect(screen.getByTestId('tx-success-explorer-link')).toBeTruthy();
      expect(screen.queryByTestId('loading-screen')).toBeNull();
    });

    it('composes like the onboarding ending — the quiet explorer link over the bottom-most primary', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const tree = JSON.stringify(screen.toJSON());
      expect(tree.indexOf('tx-success-explorer-link')).toBeGreaterThan(-1);
      expect(tree.indexOf('tx-success-explorer-link')).toBeLessThan(
        tree.indexOf('tx-success-continue-button')
      );
    });

    it('centres the report cluster in the corridor above the actions', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const cluster = screen.getByTestId('tx-success-cluster');
      const style = StyleSheet.flatten(cluster.props.style);
      expect(style.flex).toBe(1);
      expect(style.justifyContent).toBe('center');
    });

    it('omits the explorer link when no url is available', () => {
      render(<TransactionSuccessScreen {...baseProps} explorerUrl={null} />);

      expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
      expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
    });

    it('replaces the status sentence with the graphic on an exchange', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      // The graphic says what happened: the mark of what left, the arrow down
      // to what arrived, and the tick on it. No sentence is printed.
      expect(screen.queryByTestId('tx-success-title')).toBeNull();
      expect(screen.queryByText('Swap Complete')).toBeNull();
      expect(screen.getByTestId('tx-success-tick')).toBeTruthy();
      // The arrow is decoration: it is neither announced nor an element the
      // reader can land on.
      // It takes `includeHiddenElements` to find it at all, which is the
      // proof: the arrow is out of the accessibility tree.
      const arrow = screen.getByTestId('tx-success-arrow', { includeHiddenElements: true });
      expect(arrow.props.accessibilityElementsHidden).toBe(true);
      expect(arrow.props.importantForAccessibility).toBe('no-hide-descendants');
      // The two token lines are what the reader hears, in the order they are
      // drawn, and the result the sentence used to carry rides on the line of
      // the token that arrived — the tick's meaning, attached where the tick is.
      expect(screen.getByTestId('tx-success-sent').props.accessible).toBe(true);
      const received = screen.getByTestId('tx-success-received');
      expect(received.props.accessible).toBe(true);
      expect(received.props.accessibilityLabel).toBe('0.0132 SOL, Swap Complete');
    });

    it('keeps the status sentence on a receipt with a single token', () => {
      // A send has one token, not two: an arrow between two marks would be
      // meaningless, so the sentence stays and is the only thing that says
      // what happened.
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByTestId('tx-success-title')).toBeTruthy();
      expect(screen.queryByTestId('tx-success-hero')).toBeNull();
    });

    it('reads the exchange down the screen, each amount with its own token', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          exchange={exchange}
          exchangeRate="1 USDC ≈ 0.0127 SOL"
          exchangeFee="0.85%"
        />
      );

      // The amounts stay with their tokens rather than sharing a row of
      // their own, and the tick belongs to the one that arrived.
      const sent = screen.getByTestId('tx-success-sent');
      const received = screen.getByTestId('tx-success-received');
      expect(within(sent).getByText('1.1 USDC')).toBeTruthy();
      expect(within(sent).getByTestId('token-logo-USDC')).toBeTruthy();
      expect(within(received).getByText('0.0132 SOL')).toBeTruthy();
      expect(within(received).getByTestId('token-logo-SOL')).toBeTruthy();
      expect(within(received).getByTestId('tx-success-tick')).toBeTruthy();
      expect(screen.queryByTestId('tx-success-amount')).toBeNull();
      expect(screen.getByTestId('tx-success-receipt')).toBeTruthy();
      expect(screen.getByText('1 USDC ≈ 0.0127 SOL')).toBeTruthy();
      expect(screen.getByText('0.85%')).toBeTruthy();
      expect(screen.getByText('Time')).toBeTruthy();
    });

    it('puts each token mark on the graphic, at the size that makes it the subject', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      const hero = screen.getByTestId('tx-success-hero');
      expect(within(hero).getByTestId('token-logo-USDC').props.accessibilityLabel).toBe(
        'https://u/usdc.png:48'
      );
      expect(within(hero).getByTestId('token-logo-SOL').props.accessibilityLabel).toBe(
        'https://u/sol.png:48'
      );
    });

    it('falls back to the plain summary line when there is no exchange', () => {
      // A send receipt has one amount and no second token; nothing to flank.
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(screen.getByTestId('tx-success-summary')).toHaveTextContent('1 SOL → 200 USDC');
      expect(screen.queryByTestId('token-logo-SOL')).toBeNull();
    });

    it('omits rate and fee rows when the flow did not have the data', () => {
      render(<TransactionSuccessScreen {...baseProps} exchange={exchange} />);

      expect(screen.queryByText('Rate')).toBeNull();
      expect(screen.queryByText('Salmon fee')).toBeNull();
      expect(screen.getByText('Time')).toBeTruthy();
    });

    it('keeps the bridge deposit instructions', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          title="Bridge Initiated"
          bridgeDepositAddress="bc1qdeposit"
          bridgeAmountIn="33 USDC"
        />
      );

      expect(screen.getByText('bc1qdeposit')).toBeTruthy();
      expect(screen.getByText('33 USDC')).toBeTruthy();
    });
  });

  it('keeps the amount on one line — a receipt prints an amount, not a sentence', () => {
    render(<TransactionSuccessScreen {...baseProps} summary="0.0512345 SOL → 8.1234567 USDC" />);

    const amount = screen.getByTestId('tx-success-summary');
    expect(amount.props.numberOfLines).toBe(1);
    expect(amount.props.adjustsFontSizeToFit).toBe(true);
  });

  describe('the ending, and the arrival', () => {
    it('takes both bottom bands from the grid instead of restating them', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      // The receipt does not approximate the onboarding ending — it reads the
      // same table, so the primary lands on the bottom edge the grid defines.
      const assist = StyleSheet.flatten(screen.getByTestId('tx-success-assist').props.style);
      const action = StyleSheet.flatten(screen.getByTestId('tx-success-action').props.style);
      expect(assist.height).toBe(endingBands.assist);
      expect(action.height).toBe(endingBands.action);
    });

    it('reserves the safe area under the action band, not a tab bar that has sunk away', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const column = StyleSheet.flatten(screen.getByTestId('tx-success-screen').props.style);
      expect(column.paddingBottom).toBe(34);
    });

    // The verb is transparent here (see the mock at the top), so a case reads
    // the beat a band was handed rather than the animation it would run.
    const beatOf = (testID: string) =>
      screen.getByTestId(testID, { includeHiddenElements: true }).props.entering?.delayMs;

    it('reveals a send receipt top to bottom — status, amount, actions', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      // The plain shape is the same rhythm as the exchange, not a second one:
      // each element after the one above it, one stagger step apart.
      expect(beatOf('tx-success-status')).toBe(0);
      expect(beatOf('tx-success-amount')).toBe(SINK_FLOAT_STAGGER_MS);
      expect(beatOf('tx-success-actions')).toBe(2 * SINK_FLOAT_STAGGER_MS);
    });

    it('reveals an exchange receipt top to bottom — sent, arrow, received, rows, actions', () => {
      render(
        <TransactionSuccessScreen
          {...baseProps}
          exchange={exchange}
          exchangeRate="1 USDC ≈ 0.0127 SOL"
        />
      );

      // Never all at once and never bottom-up: the order down the screen is
      // the order the parts arrive in. The tick rides with the token that
      // arrived, so it has no beat of its own.
      const beats = [
        beatOf('tx-success-sent'),
        beatOf('tx-success-arrow'),
        beatOf('tx-success-received'),
        beatOf('tx-success-receipt'),
        beatOf('tx-success-actions'),
      ];
      expect(beats).toEqual([0, 1, 2, 3, 4].map((step) => step * SINK_FLOAT_STAGGER_MS));
      expect(screen.getByTestId('tx-success-tick').props.entering).toBeUndefined();
    });

    it('cuts rather than reorders under reduced motion', () => {
      mockReduceMotion = true;
      render(
        <TransactionSuccessScreen
          {...baseProps}
          exchange={exchange}
          exchangeRate="1 USDC ≈ 0.0127 SOL"
        />
      );

      // No animation at all is handed to any band — the receipt is simply
      // there, whole, in the order it is drawn.
      for (const testID of [
        'tx-success-sent',
        'tx-success-arrow',
        'tx-success-received',
        'tx-success-receipt',
        'tx-success-actions',
      ]) {
        expect(
          screen.getByTestId(testID, { includeHiddenElements: true }).props.entering
        ).toBeUndefined();
      }
    });

    it('still confirms the arrival with the success haptic', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    });
  });
});
