import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockPop = jest.fn();
const mockReset = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

jest.mock('@salmon/shared', () => ({
  colors: {
    status: { error: '#f00', errorBackground: '#300' },
    background: { card: '#111', secondary: '#000' },
    text: { primary: '#fff', secondary: '#999' },
    accent: { primary: '#0f0' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    '2xl': 24,
  },
  contentPadding: {
    screen: 16,
  },
  borderRadius: {
    md: 12,
  },
  fontSize: {
    sm: 14,
    md: 18,
  },
  componentSizes: {},
  fontFamilyNative: {
    medium: 'System',
  },
  useSettingsPanelStack: () => ({
    stack: [],
    push: mockPush,
    pop: mockPop,
    reset: mockReset,
    canGoBack: false,
  }),
  getSettingsItemTestId: (id: string) => `settings-item-${id}`,
  trackEvent: jest.fn(),
  letterSpacing: {
    wider: 1,
  },
}));

jest.mock('../SettingsPanelStack', () => ({
  SettingsPanelStack: () => null,
}));

jest.mock('../SettingsHeaderContext', () => {
  const React = require('react');
  return {
    SettingsHeaderContext: React.createContext({ setHeaderState: () => {} }),
  };
});

import { SettingsSheet } from './SettingsSheet';

describe('SettingsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the developer networks toggle callback from the switch row', () => {
    const onDeveloperNetworksToggle = jest.fn();

    const view = render(
      <SettingsSheet
        visible
        onClose={jest.fn()}
        onDeveloperNetworksToggle={onDeveloperNetworksToggle}
        developerNetworksEnabled={false}
      />
    );

    const switchControl = view.getByTestId('settings-developer-networks-toggle');
    expect(switchControl).toBeTruthy();

    fireEvent(switchControl, 'valueChange', true);

    expect(onDeveloperNetworksToggle).toHaveBeenCalledWith(true);
  });

  it('reflects granted analytics consent and withdraws it from the switch row', () => {
    const onAnalyticsToggle = jest.fn();

    const view = render(
      <SettingsSheet
        visible
        onClose={jest.fn()}
        onAnalyticsToggle={onAnalyticsToggle}
        analyticsEnabled
      />
    );

    const switchControl = view.getByTestId('settings-analytics-toggle');
    expect(switchControl.props.value).toBe(true);

    fireEvent(switchControl, 'valueChange', false);

    expect(onAnalyticsToggle).toHaveBeenCalledWith(false);
  });

  it('shows analytics off when consent was declined or never given', () => {
    const view = render(<SettingsSheet visible onClose={jest.fn()} />);

    expect(view.getByTestId('settings-analytics-toggle').props.value).toBe(false);
  });

  it('runs remove-all action and closes the sheet', () => {
    const onRemoveAllWallets = jest.fn();
    const onClose = jest.fn();

    render(
      <SettingsSheet
        visible
        onClose={onClose}
        onRemoveAllWallets={onRemoveAllWallets}
      />
    );

    fireEvent.press(screen.getByLabelText('settings.wallets.remove_all_wallets'));

    expect(onRemoveAllWallets).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pushes a settings panel for navigable options when a registry is available', () => {
    render(
      <SettingsSheet
        visible
        onClose={jest.fn()}
        panelRegistry={{} as any}
      />
    );

    fireEvent.press(screen.getByLabelText('settings.currency'));

    expect(mockPush).toHaveBeenCalledWith('currency', undefined);
    expect(mockPop).not.toHaveBeenCalled();
  });
});
