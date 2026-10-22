/**
 * Creating a wallet: the optional copy of the new phrase goes through the
 * clipboard Salmon clears, and the screen says when it is cleared.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

// The public BIP-39 test vector: no real phrase belongs in a test.
const PHRASE =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const mockSecretCopy = jest.fn(async (_text: string) => undefined);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

jest.mock('../../hooks/useSecretClipboard', () => ({
  secretClipboard: { copy: (text: string) => mockSecretCopy(text) },
}));

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../test-utils/themeTokens'),
  generateMnemonic: () => PHRASE,
  generateValidationPositions: () => [1, 2, 3],
  validateMnemonicWords: () => ({ isValid: false, results: [] }),
  setStashItem: jest.fn(),
  STASH_KEYS: { PENDING_MNEMONIC: 'pending-mnemonic' },
}));

jest.mock('../../src/icons', () => ({
  CheckCircleIcon: () => null,
  SparkleIcon: () => null,
  iconSize: { md: 20 },
}));

jest.mock('../../src/components', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, children);
  return {
    OnboardingTitle: Passthrough,
    OnboardingDescription: Passthrough,
    OnboardingLayout: (props: Record<string, React.ReactNode>) =>
      React.createElement(View, null, props.title, props.body, props.secondary, props.action),
    ScreenHeader: () => null,
    SeedWordGrid: () => null,
    SeedWordInput: () => null,
    Toggle: () => null,
    PrimaryButton: Passthrough,
    HoldToCopyButton: ({ onCopy, testID }: { onCopy: () => void; testID?: string }) =>
      React.createElement(TouchableOpacity, { onPress: onCopy, testID }),
    WarningNotice: ({ title }: { title: string }) => React.createElement(Text, null, title),
  };
});

import CreateWalletScreen from '../../app/(auth)/create';

describe('the create flow seed-phrase copy', () => {
  it('copies through the clearing clipboard and says when it is cleared', async () => {
    render(<CreateWalletScreen />);
    expect(screen.queryByTestId('create-seed-clipboard-clears')).toBeNull();

    fireEvent.press(screen.getByTestId('create-copy-seed-button'));

    await waitFor(() => expect(screen.getByTestId('create-seed-clipboard-clears')).toBeTruthy());
    expect(mockSecretCopy).toHaveBeenCalledWith(PHRASE);
    expect(screen.getByText('settings.secret_copied')).toBeTruthy();
  });
});
