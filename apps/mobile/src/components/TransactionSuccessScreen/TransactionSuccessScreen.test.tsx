import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const mockNotificationAsync = jest.fn();

const mockPrimaryButton = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => (
  <Text testID={testID}>{children}</Text>
);

const mockLoadingScreen = ({ title, bottomOffset }: { title?: string; bottomOffset?: number }) => (
  <Text testID="loading-screen" accessibilityLabel={String(bottomOffset)}>
    {title}
  </Text>
);

jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: { View, Text },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withSpring: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: (value: unknown) => value,
    Easing: { out: (fn: unknown) => fn, cubic: (t: number) => t },
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
  lineHeight: { none: 1 },
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 96 }),
}));

jest.mock('../Button', () => ({
  PrimaryButton: (props: { children?: React.ReactNode; testID?: string }) => mockPrimaryButton(props),
}));

jest.mock('../LoadingScreen', () => ({
  LoadingScreen: (props: { title?: string }) => mockLoadingScreen(props),
}));

import { TransactionSuccessScreen } from './TransactionSuccessScreen';

const baseProps = {
  title: 'Swap Complete',
  summary: '1 SOL → 200 USDC',
  explorerUrl: 'https://solscan.io/tx/abc',
  onContinue: jest.fn(),
};

describe('TransactionSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('while settling', () => {
    it('shows the loader with the pending title instead of the success content', () => {
      render(
        <TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />,
      );

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
        <TransactionSuccessScreen {...baseProps} settling pendingTitle="Processing swap" />,
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
        />,
      );

      expect(screen.getByText('bc1qdeposit')).toBeTruthy();
      expect(screen.getByText('33 USDC')).toBeTruthy();
    });
  });
});
