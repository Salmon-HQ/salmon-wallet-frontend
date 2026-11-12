/**
 * The merchant sheet (spec 043): the domain at once, the label and icon once
 * they arrive, the step the payment is at, and the reason it stopped.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('../../../test-utils/themeTokens'),
  vs: (value: number) => value,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { message?: string }) =>
      values?.message ? `${key}: ${values.message}` : key,
  }),
}));

// The container drags in Reanimated/expo-blur; its behaviour has its own suite.
jest.mock('../BottomSheetContainer', () => ({
  BottomSheetContainer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
function mockButton({
  children,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  const RN = require('react-native');
  const R = require('react');
  return R.createElement(
    RN.TouchableOpacity,
    { onPress, testID },
    R.createElement(RN.Text, null, children)
  );
}
jest.mock('../Button/SecondaryButton', () => ({ SecondaryButton: mockButton }));
jest.mock('../Button/PrimaryButton', () => ({ PrimaryButton: mockButton }));
jest.mock('../Spinner', () => ({ Spinner: () => null }));
jest.mock('../WarningNotice', () => ({
  WarningNotice: ({ title, children }: { title: string; children?: React.ReactNode }) => {
    const RN = require('react-native');
    const R = require('react');
    // As the real notice: the body is a Text of its own.
    return R.createElement(
      RN.View,
      null,
      R.createElement(RN.Text, null, title),
      children != null ? R.createElement(RN.Text, null, children) : null
    );
  },
}));
// The identity row has its own suite (TransactionConfirmation/RequesterRow).
jest.mock('../TransactionConfirmation/RequesterRow', () => ({
  RequesterRow: ({
    name,
    icon,
    domain,
    testID,
  }: {
    name?: string;
    icon?: string | null;
    domain: string;
    testID?: string;
  }) => {
    const RN = require('react-native');
    const R = require('react');
    return R.createElement(RN.Text, { testID }, `${name ?? ''}|${icon ?? ''}|${domain}`);
  },
}));

import { SolanaPayRequestSheet } from './SolanaPayRequestSheet';
import type { SolanaPayRequestSheetProps } from './types';

function renderSheet(overrides: Partial<SolanaPayRequestSheetProps> = {}) {
  const onClose = jest.fn();
  const view = render(
    <SolanaPayRequestSheet
      visible
      merchant={{ domain: 'merchant.example' }}
      phase="contacting"
      onClose={onClose}
      {...overrides}
    />
  );
  return { ...view, onClose };
}

describe('SolanaPayRequestSheet', () => {
  it('names the domain while the merchant is contacted, before any label arrives', () => {
    const { getByTestId } = renderSheet();
    expect(getByTestId('solana-pay-merchant').props.children).toBe('||merchant.example');
    expect(getByTestId('solana-pay-status')).toBeTruthy();
    expect(getByTestId('solana-pay-status-text').props.children).toBe('solanaPay.contacting');
  });

  it("shows the merchant's label and icon once they arrive, while the payment is prepared", () => {
    const { getByTestId } = renderSheet({
      phase: 'preparing',
      merchant: {
        domain: 'merchant.example',
        label: 'Corner Café',
        icon: 'https://merchant.example/logo.svg',
      },
    });
    expect(getByTestId('solana-pay-merchant').props.children).toBe(
      'Corner Café|https://merchant.example/logo.svg|merchant.example'
    );
    expect(getByTestId('solana-pay-status-text').props.children).toBe('solanaPay.preparing');
  });

  it('says why the payment stopped, in place of the status', () => {
    const { getByTestId, queryByTestId, getByText } = renderSheet({
      phase: 'failed',
      error: { key: 'solanaPay.errors.unreachable' },
    });
    expect(queryByTestId('solana-pay-status')).toBeNull();
    expect(getByTestId('solana-pay-error')).toBeTruthy();
    expect(getByText('solanaPay.errors.unreachable')).toBeTruthy();
  });

  it("shows the merchant's own words as plain text, markup included", () => {
    const { getByText } = renderSheet({
      phase: 'failed',
      error: { key: 'solanaPay.errors.merchantError', merchantMessage: '<b>Out of stock</b>' },
    });
    expect(getByText('solanaPay.merchantMessage: <b>Out of stock</b>')).toBeTruthy();
  });

  it('offers a retry only when the failure allows one', () => {
    const refused = renderSheet({
      phase: 'failed',
      error: { key: 'solanaPay.errors.invalidSignature' },
    });
    expect(refused.queryByTestId('solana-pay-retry')).toBeNull();
    refused.unmount();

    const onRetry = jest.fn();
    const { getByTestId, getByText } = renderSheet({
      phase: 'failed',
      error: { key: 'solanaPay.errors.unreachable' },
      onRetry,
    });
    fireEvent.press(getByTestId('solana-pay-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(getByText('solanaPay.retry')).toBeTruthy();
  });

  it('closes on its button', () => {
    const { getByTestId, onClose } = renderSheet();
    fireEvent.press(getByTestId('solana-pay-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('draws nothing while hidden', () => {
    const { queryByTestId } = renderSheet({ visible: false });
    expect(queryByTestId('solana-pay-merchant')).toBeNull();
  });
});
