import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockNotificationAsync = jest.fn();

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

const mockReducedMotion = jest.fn(() => false);
/** Every `withTiming` config the component asked for, in order. */
const timings: Array<{ duration?: number }> = [];
/** Every `withDelay` delay the component asked for, in order. */
const delays: number[] = [];

jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => mockReducedMotion(),
    withSpring: (value: unknown) => value,
    withDelay: (delay: number, value: unknown) => {
      delays.push(delay);
      return value;
    },
    withTiming: (value: unknown, config?: { duration?: number }) => {
      if (config) timings.push(config);
      return value;
    },
    Easing: {
      out: (fn: unknown) => fn,
      cubic: (t: number) => t,
      bezier: (...args: number[]) => args,
    },
  };
});

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

jest.mock('@salmon/shared', () => ({
  // The motion vocabulary is the real thing on purpose: these tests assert
  // that the Surfacing's durations come out of `motionMs`, and a stubbed
  // `motionMs` would assert nothing.
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  // The caustic band is the scales motif, and the motif's geometry is data:
  // a stub would only assert that a stub renders.
  ...jest.requireActual('@salmon/shared/src/theme/scales'),
  letterSpacing: { normal: 0, wide: 0.3 },
  // The real gate is `useWaitGate` and it is tested where it lives
  // (packages/shared). Transparent here, so these cases stay about what the
  // screen renders in each state rather than about timing.
  useWaitGate: (active: boolean) => active,
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
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40 },
  borderRadius: { lg: 16, full: 999, card: 12 },
  fontSize: { sm: 14, base: 16, md: 18, title: 22, '4xl': 36 },
  fontWeight: { semibold: '600', bold: '700' },
  gradients: { primaryButton: { colors: ['#0f0'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } },
  shadows: { imageHero: {} },
  componentSizes: { logoSizeSmall: 80, buttonHeightCompact: 48, buttonMinWidthLg: 200 },
  ms: (value: number) => value,
  vs: (value: number) => value,
  s: (value: number) => value,
  fontFamilyNative: { bold: 'System', medium: 'System', regular: 'System' },
  borderWidth: { accent: 1 },
  lineHeight: { none: 1, condensed: 1.25, normal: 1.5 },
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 96 }),
}));

jest.mock('../Button', () => ({
  PrimaryButton: (props: { children?: React.ReactNode; testID?: string }) =>
    mockPrimaryButton(props),
}));

jest.mock('../LoadingScreen', () => ({
  LoadingScreen: (props: { title?: string }) => mockLoadingScreen(props),
}));

import { TransactionSuccessScreen } from './TransactionSuccessScreen';
import {
  AMOUNT_LAG_MS,
  BAND_TRAVEL_MS,
  STATIC_HIGHLIGHT_HOLD_MS,
  amountLandsAtMs,
  surfacingTimeline,
} from './surfacing';

const { motionMs } = jest.requireActual('@salmon/shared/src/theme/durations');

const baseProps = {
  title: 'Swap Complete',
  summary: '1 SOL → 200 USDC',
  explorerUrl: 'https://solscan.io/tx/abc',
  onContinue: jest.fn(),
};

describe('TransactionSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion.mockReturnValue(false);
    timings.length = 0;
    delays.length = 0;
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

    it('omits the explorer link when no url is available', () => {
      render(<TransactionSuccessScreen {...baseProps} explorerUrl={null} />);

      expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
      expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
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

  describe('The Surfacing', () => {
    const layout = (testID: string, box: { y: number; height: number }) =>
      fireEvent(screen.getByTestId(testID), 'layout', {
        nativeEvent: { layout: { x: 0, width: 390, ...box } },
      });

    const durations = () => timings.map((config) => config.duration);

    it('clears the membrane over `tide` — the duration reserved for this moment', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(durations()).toContain(motionMs.tide);
    });

    it('settles the amount over `drift`, delayed so it lands one lag after the band', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      const timeline = surfacingTimeline(false);
      expect(durations()).toContain(motionMs.drift);
      expect(delays).toContain(timeline.amount.delayMs);
      expect(amountLandsAtMs(timeline)).toBe(BAND_TRAVEL_MS + AMOUNT_LAG_MS);
    });

    it('travels the band only once the corridor has been measured', () => {
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(durations()).not.toContain(BAND_TRAVEL_MS);

      layout('tx-success-screen', { y: 0, height: 800 });
      layout('tx-success-amount', { y: 300, height: 60 });

      expect(durations()).toContain(BAND_TRAVEL_MS);
    });

    it('takes the parallel path under reduced motion, not a hole where the moment was', () => {
      mockReducedMotion.mockReturnValue(true);
      render(<TransactionSuccessScreen {...baseProps} />);
      layout('tx-success-screen', { y: 0, height: 800 });
      layout('tx-success-amount', { y: 300, height: 60 });

      // The membrane still clears — in one `swell` step, not over `tide`.
      expect(durations()).toContain(motionMs.swell);
      expect(durations()).not.toContain(motionMs.tide);
      // The band is drawn once and held; it never travels.
      expect(durations()).not.toContain(BAND_TRAVEL_MS);
      expect(delays).toContain(STATIC_HIGHLIGHT_HOLD_MS);
      // Nothing waits for a Surfacing that no longer travels.
      expect(delays).not.toContain(motionMs.tide);
    });

    it('keeps the success haptic under reduced motion', () => {
      mockReducedMotion.mockReturnValue(true);
      render(<TransactionSuccessScreen {...baseProps} />);

      expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('spends no duration outside the shared vocabulary', () => {
      render(<TransactionSuccessScreen {...baseProps} />);
      layout('tx-success-screen', { y: 0, height: 800 });
      layout('tx-success-amount', { y: 300, height: 60 });

      const timeline = surfacingTimeline(false);
      // Every duration is either a `motionMs` token or one of the Surfacing's
      // two named quantities — never a number someone typed at a call site.
      const allowed = new Set<number>([
        ...(Object.values(motionMs) as number[]),
        BAND_TRAVEL_MS,
        timeline.band.fadeMs,
      ]);
      for (const duration of durations()) {
        expect(allowed.has(duration as number)).toBe(true);
      }
    });
  });
});
