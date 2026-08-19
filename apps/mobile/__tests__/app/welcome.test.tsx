/**
 * Welcome says its name and its lema (owner, 2026-08-18, superseding "only
 * the fish"): the wordmark under the fish, the slogan under the wordmark —
 * and exactly one of the three announces "Salmon" to a screen reader.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseAccountsContext = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  useAccountsContext: () => mockUseAccountsContext(),
}));

// The layout collapses to a pass-through so the test sees the slots' content;
// the grid's geometry has its own suite. BrandMark and Wordmark are real —
// their presence and accessibility are what this file asserts.
jest.mock('../../src/components', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  const { BrandMark, Wordmark } = jest.requireActual('../../src/components/BrandMark');

  const Button = ({
    children,
    onPress,
    testID,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) =>
    React.createElement(
      TouchableOpacity,
      { onPress, testID, accessibilityRole: 'button' },
      React.createElement(Text, null, children)
    );

  return {
    BrandMark,
    Wordmark,
    PrimaryButton: Button,
    SecondaryButton: Button,
    TextButton: Button,
    OnboardingLayout: (props: Record<string, React.ReactNode>) =>
      React.createElement(
        View,
        { testID: props.testID },
        props.mark,
        props.title,
        props.description,
        props.assist,
        props.secondary,
        props.action
      ),
  };
});

import { wordmarkText } from '@salmon/shared';
import WelcomeScreen from '../../app/(auth)/index';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountsContext.mockReturnValue([{ accounts: [] }, { lockAccounts: jest.fn() }]);
  });

  it('shows the fish, the wordmark and the slogan', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('welcome-brand-mark')).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
    expect(screen.getByTestId('wordmark')).toBeTruthy();
    expect(screen.getByTestId('welcome-slogan')).toBeTruthy();
    expect(screen.getByText('Open code. Open ownership.')).toBeTruthy();
  });

  it('announces "Salmon" once — the wordmark, not the fish wrapper', () => {
    render(<WelcomeScreen />);

    // The wordmark is the screen's header and carries the name.
    expect(screen.getByTestId('wordmark').props.accessibilityLabel).toBe(wordmarkText);
    // The fish wrapper no longer duplicates the announcement.
    expect(screen.getByTestId('welcome-brand-mark').props.accessibilityLabel).toBeUndefined();
    expect(screen.getAllByLabelText(wordmarkText)).toHaveLength(1);
  });
});
