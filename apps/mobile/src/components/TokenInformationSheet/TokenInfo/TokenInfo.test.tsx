import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/hooks/useCopyFeedback'),
  borderRadius: { lg: 16, md: 12 },
  colors: {
    background: { card: '#111' },
    text: { primary: '#fff', secondary: '#999' },
    accent: { primary: '#f54' },
    input: { background: '#222' },
    skeleton: { base: '#333', highlight: '#444' },
  },
  ContentLoader: ({ children }: { children?: React.ReactNode }) => children,
  Rect: () => null,
  fontFamilyNative: { semiBold: 'System', regular: 'System', medium: 'System' },
  fontSize: { bodyLg: 16, base: 14, sm: 12 },
  fontWeight: { semibold: '600', regular: '400', medium: '500' },
  formatLargeNumber: (value: number) => String(value),
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  motionMs: { feedbackHold: 1500 },
  semantic: { text: { secondary: '#999' }, status: { success: '#0f0' } },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16 },
  useCurrencyContext: () => [null, { formatLarge: (value: number) => `$${value}` }],
}));

import { TokenInfo } from './TokenInfo';

describe('TokenInfo copy contract address', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('announces the copy confirmation and reverts to the copy label', async () => {
    render(<TokenInfo contractAddress="So11111111111111111111111111111111111111112" />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Copy contract address'));
    });

    expect(mockSetStringAsync).toHaveBeenCalledWith('So11111111111111111111111111111111111111112');
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(screen.getByLabelText('Copy contract address')).toBeTruthy();
  });
});
