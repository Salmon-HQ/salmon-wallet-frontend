/**
 * Success — "Check derivables" (owner, 2026-09-09).
 *
 * The button asks the scan the user wants, and the answer arrives over this
 * screen in the same sheet Wallets uses: the wait first, then the finds. The hook
 * itself (`useCheckDerivables`) has its own suite in shared.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockCheck = jest.fn();
const mockUseCheckDerivables = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  useCheckDerivables: () => mockUseCheckDerivables(),
}));

jest.mock('../../src/components', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  const Button = ({
    children,
    onPress,
    disabled,
    testID,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      { onPress, disabled, testID, accessibilityRole: 'button' },
      React.createElement(Text, null, children)
    );
  return {
    BrandMark: () => null,
    PrimaryButton: Button,
    SecondaryButton: Button,
    OnboardingTitle: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    OnboardingDescription: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, null, children),
    OnboardingLayout: (props: Record<string, React.ReactNode>) =>
      React.createElement(View, { testID: props.testID }, props.secondary, props.action),
    DerivedAccountsSheet: ({ visible, scanning }: { visible: boolean; scanning: boolean }) =>
      visible
        ? React.createElement(View, { testID: scanning ? 'sheet-scanning' : 'sheet-answer' })
        : null,
  };
});

import SuccessScreen from '../../app/(auth)/success';

const scanState = (over: Partial<Record<string, unknown>> = {}) => ({
  scanning: false,
  check: mockCheck,
  sheet: { visible: false, scanning: false, finds: [] },
  ...over,
});

describe('SuccessScreen — check derivables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCheckDerivables.mockReturnValue(scanState());
  });

  it('asks the scan for the active wallet when tapped', () => {
    render(<SuccessScreen />);
    fireEvent.press(screen.getByTestId('success-check-derived-button'));
    expect(mockCheck).toHaveBeenCalledTimes(1);
  });

  it('shows the wait over this screen while the scan runs, then the answer', () => {
    mockUseCheckDerivables.mockReturnValue(
      scanState({ scanning: true, sheet: { visible: true, scanning: true, finds: [] } })
    );
    const { rerender } = render(<SuccessScreen />);
    expect(screen.getByTestId('sheet-scanning')).toBeTruthy();

    mockUseCheckDerivables.mockReturnValue(
      scanState({ sheet: { visible: true, scanning: false, finds: [] } })
    );
    rerender(<SuccessScreen />);
    expect(screen.getByTestId('sheet-answer')).toBeTruthy();
  });

  it('still enters the wallet through the consent step', () => {
    render(<SuccessScreen />);
    fireEvent.press(screen.getByTestId('success-go-to-wallet-button'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/analytics-consent');
  });
});
