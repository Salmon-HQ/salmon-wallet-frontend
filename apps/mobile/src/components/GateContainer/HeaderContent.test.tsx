import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-image', () => ({
  Image: () => null,
}));

jest.mock('../Icon', () => ({
  ContentCopySvgIcon: () => null,
  SettingsSvgIcon: () => null,
  WalletSvgIcon: () => null,
}));

jest.mock('@salmon/shared', () => ({
  colors: { text: { primary: '#fff' } },
  fontFamilyNative: { bold: 'System', semiBold: 'System' },
  fontScaleCap: { chrome: 1.2 },
  fontSize: { xs: 10, sm: 14 },
  fontWeight: { semibold: '600', bold: '700' },
  letterSpacing: { header: 0 },
  componentSizes: { iconSizeLarge: 28, iconSizeMButton: 32, buttonHeightSmall: 28 },
  spacing: { headerPadding: 20, base: 12, sm: 8, xs: 4 },
  motionMs: { feedbackHold: 1500 },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  getShortAddress: (value: string, size = 4) => `${value.slice(0, size)}...${value.slice(-size)}`,
  getAvatarColor: () => '#123456',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  semantic: {
    text: { secondary: '#999', accent: '#f54' },
    status: { success: '#0f0' },
  },
}));

import { HeaderContent } from './HeaderContent';

describe('HeaderContent copy address', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows a copied tick after pressing copy, then reverts', () => {
    const onCopyAddress = jest.fn();

    render(
      <HeaderContent
        accountName="Account 1"
        address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        onCopyAddress={onCopyAddress}
      />
    );

    fireEvent.press(screen.getByTestId('wallet-header-copy-address'));

    expect(onCopyAddress).toHaveBeenCalled();
    expect(screen.getByLabelText('actions.copied')).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByLabelText('actions.copied')).toBeNull();
    expect(
      screen.getByLabelText('accessibility.copy_address:7xKX...gAsU')
    ).toBeTruthy();
  });
});
