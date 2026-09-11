/**
 * TokenSelectList — the rows the picker sheet lists. The swap's regression:
 * a caller that curated its list passes `verifiedOnly={false}`, and the
 * sheet must list every token it was given, not hide the untagged ones.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  ...jest.requireActual('../../../../../packages/shared/src/hooks/useTokenSearch'),
  formatTokenAmount: (v: number) => String(v),
  useUnverifiedTokens: () => false,
}));
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    View,
    Easing: { bezier: () => (value: unknown) => value, linear: (value: unknown) => value },
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: unknown) => value,
    withDelay: (_delay: number, value: unknown) => value,
    withRepeat: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    runOnJS: (fn: unknown) => fn,
  };
});
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: string) => f ?? k }),
}));
jest.mock('../../../hooks/useBottomSheetChrome', () => ({
  useBottomSheetChrome: () => ({ bottomInset: 0, standardContentBottomPadding: 0 }),
}));
jest.mock('../TokenLogo', () => {
  const { Text } = jest.requireActual('react-native');
  return { TokenLogo: ({ symbol }: { symbol?: string }) => <Text>{`logo-${symbol}`}</Text> };
});

import { TokenSelectList } from './TokenSelectList';

const TOKENS = [
  { address: 'a', name: 'Solana', symbol: 'SOL', uiAmount: 1, decimals: 9 },
  { address: 'b', name: 'USD Coin', symbol: 'USDC', uiAmount: 0, decimals: 6 },
];

it('lists every token it was given when verifiedOnly is off', () => {
  render(<TokenSelectList tokens={TOKENS} onSelectToken={() => {}} verifiedOnly={false} />);
  expect(screen.getByTestId('send-token-row-SOL')).toBeTruthy();
  expect(screen.getByTestId('send-token-row-USDC')).toBeTruthy();
});

it('shows the symbol alone in the trailing cell when balances are off', () => {
  render(
    <TokenSelectList
      tokens={TOKENS}
      onSelectToken={() => {}}
      verifiedOnly={false}
      showBalances={false}
    />
  );
  expect(screen.getByTestId('send-token-row-USDC').props.accessibilityLabel).toBe('USD Coin, USDC');
});

it('hides untagged tokens when verifiedOnly is on (default)', () => {
  render(<TokenSelectList tokens={TOKENS} onSelectToken={() => {}} />);
  expect(screen.queryByTestId('send-token-row-SOL')).toBeNull();
});
