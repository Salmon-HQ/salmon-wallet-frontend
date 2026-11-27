/**
 * Welcome says its name and its lema (owner, 2026-08-18, superseding "only
 * the fish"): the wordmark under the fish, the slogan under the wordmark —
 * and exactly one of the three announces "Salmon" to a screen reader.
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseAccountsContext = jest.fn();
const mockRemoveAllAccounts = jest.fn();
const mockDisarm = jest.fn();

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

jest.mock('@salmon/shared', () =>
  require('../../test-utils/sharedWith').sharedWith({
    ...jest.requireActual('../../test-utils/themeTokens'),
    useAccountsContext: () => mockUseAccountsContext(),
  })
);

jest.mock('../../src/contexts/BiometricContext', () => ({
  useBiometric: () => ({ disarm: (...args: unknown[]) => mockDisarm(...args) }),
}));

// The reset is the real two-step confirmation, over the shared stand-in sheet.
jest.mock('../../src/components/ConfirmSheet', () => ({
  ConfirmSheet: jest.requireActual('../../test-utils/confirmSheetStandIn').ConfirmSheetStandIn,
}));

// The layout collapses to one view per slot so the test sees which slot holds
// what; the grid's geometry has its own suite. BrandMark and Wordmark are real —
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
    ResetConfirm: jest.requireActual('../../src/components/ResetConfirm').ResetConfirm,
    OnboardingLayout: (props: Record<string, React.ReactNode>) =>
      React.createElement(
        View,
        { testID: props.testID },
        ...['mark', 'title', 'description', 'body', 'assist', 'secondary', 'action'].map((slot) =>
          React.createElement(View, { key: slot, testID: `slot-${slot}` }, props[slot])
        )
      ),
  };
});

import { wordmarkText } from '@salmon/shared';
import { finishClosing } from '../../test-utils/confirmSheetStandIn';
import WelcomeScreen from '../../app/(auth)/index';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountsContext.mockReturnValue([{ accounts: [] }, { lockAccounts: jest.fn() }]);
  });

  it('shows the fish, the wordmark and the slogan', () => {
    render(<WelcomeScreen />);

    expect(screen.getByTestId('welcome-brand-mark')).toBeTruthy();
    // The mark is decorative here (no `title`), so it is hidden from
    // assistive tech — the same switch the DOM twin makes on `aria-hidden`.
    expect(screen.getByTestId('brand-mark', { includeHiddenElements: true })).toBeTruthy();
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

/**
 * A vault stored with no wallet listed lands here, behind a password nobody
 * can type on this screen: the lock screen's reset is the way out.
 */
describe('WelcomeScreen with a vault and no wallets', () => {
  const press = (testID: string) => act(async () => fireEvent.press(screen.getByTestId(testID)));
  const leave = () => act(() => finishClosing());

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveAllAccounts.mockResolvedValue(undefined);
    mockDisarm.mockResolvedValue(undefined);
    mockUseAccountsContext.mockReturnValue([
      { accounts: [], requiredLock: true },
      { removeAllAccounts: mockRemoveAllAccounts },
    ]);
  });

  it.each([
    ['no vault', { accounts: [], requiredLock: false }],
    ['wallets listed', { accounts: [{ id: 'wallet-1' }], requiredLock: true }],
  ])('offers no reset with %s', (_, state) => {
    mockUseAccountsContext.mockReturnValue([state, { removeAllAccounts: mockRemoveAllAccounts }]);
    render(<WelcomeScreen />);

    expect(screen.queryByTestId('welcome-forgot-password-button')).toBeNull();
  });

  it('offers "Forgot my password" in the body, where the layout has room, as the lock does', () => {
    render(<WelcomeScreen />);

    const link = within(screen.getByTestId('slot-body')).getByTestId(
      'welcome-forgot-password-button'
    );
    expect(link).toHaveTextContent('lock.forgot_password');
    // The action slot is one button tall: anything under the button there is
    // drawn below the screen's edge.
    expect(
      within(screen.getByTestId('slot-action')).queryByTestId('welcome-forgot-password-button')
    ).toBeNull();
  });

  it('resets after the warning and the last word, and stays on welcome', async () => {
    render(<WelcomeScreen />);

    await press('welcome-forgot-password-button');
    expect(screen.getByText('lock.reset_wallet_title')).toBeTruthy();
    await press('confirm-dialog-confirm');
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    await leave();
    expect(screen.getByText('lock.confirm_title')).toBeTruthy();
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
    await press('confirm-dialog-confirm');

    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    await leave();
    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(mockDisarm).toHaveBeenCalledTimes(1);
    expect(mockRemoveAllAccounts).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each([1, 2])('erases nothing when the reset is cancelled at step %i', async (step) => {
    render(<WelcomeScreen />);

    await press('welcome-forgot-password-button');
    if (step === 2) {
      await press('confirm-dialog-confirm');
      await leave();
    }
    await press('confirm-dialog-cancel');
    await leave();

    expect(screen.queryByText('lock.reset_wallet_title')).toBeNull();
    expect(screen.queryByText('lock.confirm_title')).toBeNull();
    expect(mockDisarm).not.toHaveBeenCalled();
    expect(mockRemoveAllAccounts).not.toHaveBeenCalled();
  });
});
