/**
 * The failure says why, and — when the chain said more — what came back,
 * under the message and quieter than it.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({ ...jest.requireActual('../../../test-utils/themeTokens') }));
jest.mock('../Button', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Button = ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement(Text, { testID }, children);
  return { PrimaryButton: Button, SecondaryButton: Button };
});

import { SendFailure } from './SendFailure';

const base = {
  title: 'Send failed',
  message: 'The program refused this transaction.',
  retryLabel: 'Retry',
  dismissLabel: 'Continue',
  onRetry: jest.fn(),
  onDismiss: jest.fn(),
  bottomInset: 0,
};

describe('SendFailure', () => {
  it('shows the detail line when there is one', () => {
    render(<SendFailure {...base} detail="Program Toke…Q5DA: AccountFrozen (#17)" />);
    expect(screen.getByTestId('send-failure-detail').props.children).toBe(
      'Program Toke…Q5DA: AccountFrozen (#17)'
    );
  });

  it('shows only the message when the message says it all', () => {
    render(<SendFailure {...base} />);
    expect(screen.getByTestId('send-failure-message')).toBeTruthy();
    expect(screen.queryByTestId('send-failure-detail')).toBeNull();
  });
});
