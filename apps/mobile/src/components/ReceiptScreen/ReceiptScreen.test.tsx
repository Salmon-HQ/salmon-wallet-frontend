/**
 * ReceiptScreen — one test per tone.
 *
 * `transfer` proves the CORE 07 composition (seal, title, body, receipt
 * card of rows, two actions) renders from the crisp prop shape. `exchange`
 * proves the same `ReceiptScreen` delegates to the graphic receipt
 * `TransactionSuccessScreen` is a thin alias over — its own suite
 * (`TransactionSuccessScreen.test.tsx`) is the exhaustive one; this case only
 * has to show the `tone="exchange"` branch renders that receipt's e2e
 * vocabulary when driven straight through `ReceiptScreen`.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockNotificationAsync = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) =>
      (typeof fallback === 'string' ? fallback : undefined) ?? key,
  }),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: (...args: unknown[]) => mockNotificationAsync(...args),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('@salmon/shared/src/theme/onboardingGrid'),
  ...jest.requireActual('@salmon/shared/src/motion/sinkFloat'),
  useWaitGate: (active: boolean) => active,
  useWaitExit: (showWait: boolean) => ({ held: showWait, onExited: () => {} }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => true,
    withDelay: (delayMs: number, animation: unknown) => ({ delayMs, animation }),
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

jest.mock('../../utils/sinkAndFloat', () => ({
  floatEntering: () => undefined,
}));

jest.mock('../../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 96, insets: { top: 0, bottom: 34 } }),
}));

jest.mock('../Button', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    PrimaryButton: ({ children, testID, onPress, disabled }: Record<string, unknown>) => (
      <Text testID={testID as string} onPress={disabled ? undefined : (onPress as () => void)}>
        {children as string}
      </Text>
    ),
    SecondaryButton: ({ children, testID, onPress }: Record<string, unknown>) => (
      <Text testID={testID as string} onPress={onPress as () => void}>
        {children as string}
      </Text>
    ),
    TextButton: ({ children, testID, onPress }: Record<string, unknown>) => (
      <Text testID={testID as string} onPress={onPress as () => void}>
        {children as string}
      </Text>
    ),
  };
});

jest.mock('../Card', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Card: ({ children, testID }: Record<string, unknown>) => (
      <View testID={testID as string}>{children as React.ReactNode}</View>
    ),
  };
});

jest.mock('../IconBubble', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    IconBubble: ({ testID }: Record<string, unknown>) => <Text testID={testID as string} />,
  };
});

jest.mock('../LoadingScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    LoadingScreen: ({ title }: { title?: string }) => <Text testID="loading-screen">{title}</Text>,
  };
});

jest.mock('../TokenLogo', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    TokenLogo: ({ symbol }: { symbol?: string }) => <Text testID={`token-logo-${symbol}`} />,
  };
});

import { ReceiptScreen } from './ReceiptScreen';

describe('ReceiptScreen — transfer tone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the CORE 07 composition: seal, title, body, receipt rows, and both actions', () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();

    render(
      <ReceiptScreen
        tone="transfer"
        title="Sent successfully"
        body="5 SOL is on its way to bob.sol."
        rows={[
          { label: 'Amount', value: '5 SOL' },
          { label: 'To', value: 'bob.sol' },
        ]}
        primary={{
          label: 'Back to wallet',
          onPress: onPrimary,
          testID: 'tx-success-continue-button',
        }}
        secondary={{ label: 'Share', onPress: onSecondary, testID: 'tx-success-share' }}
        testID="tx-success-screen"
      />
    );

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByTestId('tx-success-seal')).toBeTruthy();
    expect(screen.getByText('Sent successfully')).toBeTruthy();
    expect(screen.getByText('5 SOL is on its way to bob.sol.')).toBeTruthy();
    expect(screen.getByText('Amount')).toBeTruthy();
    expect(screen.getByText('To')).toBeTruthy();
    expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
    expect(screen.getByTestId('tx-success-share')).toBeTruthy();
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('prefers the explorer link over a generic secondary, and disables the primary while settling', () => {
    render(
      <ReceiptScreen
        tone="transfer"
        title="NFT sent"
        rows={[]}
        primary={{
          label: 'Back to wallet',
          onPress: jest.fn(),
          testID: 'tx-success-continue-button',
        }}
        secondary={{ label: 'Share', onPress: jest.fn(), testID: 'tx-success-share' }}
        explorerUrl="https://solscan.io/tx/abc"
        settling
      />
    );

    expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
    expect(screen.getByTestId('tx-success-continue-button').props.onPress).toBeUndefined();
    expect(screen.queryByTestId('tx-success-share')).toBeNull();
    // Settling hides the explorer link too — nowhere to navigate away to yet.
    expect(screen.queryByTestId('tx-success-explorer-link')).toBeNull();
    expect(mockNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('ReceiptScreen — exchange tone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates to the graphic receipt and its e2e vocabulary', () => {
    const onContinue = jest.fn();

    render(
      <ReceiptScreen
        tone="exchange"
        title="Swap Complete"
        summary="1 SOL → 200 USDC"
        explorerUrl="https://solscan.io/tx/abc"
        onContinue={onContinue}
      />
    );

    expect(screen.getByTestId('tx-success-screen')).toBeTruthy();
    expect(screen.getByText('Swap Complete')).toBeTruthy();
    expect(screen.getByText('1 SOL → 200 USDC')).toBeTruthy();
    expect(screen.getByTestId('tx-success-continue-button')).toBeTruthy();
    expect(screen.getByTestId('tx-success-explorer-link')).toBeTruthy();
  });
});
