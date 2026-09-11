import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

// Reanimated pulls the Worklets native module, which does not exist under
// Jest; the banded floats only need a View and the reduce-motion flag.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useReducedMotion: () => false,
    withTiming: (toValue: unknown) => toValue,
    withDelay: (_delayMs: number, animation: unknown) => animation,
    Easing: { bezier: () => () => 0 },
  };
});

// The real barrel pulls in @solana/kit, which jest-expo cannot transform.
jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme/durations'),
  colors: {
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
    palette: { amber: '#cc0' },
    border: { subtle: 'rgba(255, 255, 255, 0.15)' },
  },
  semantic: {
    status: { warning: '#FFB020', warningTint: '#330', danger: '#F00' },
    text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' },
  },
  valueInkFor: () => ({ primary: '#fff', success: '#0f0', danger: '#f00', secondary: '#aaa' }),
  fontScaleCap: { dense: 1.2, chrome: 1.2 },
  componentSizes: { swapDetailRowHeight: 38 },
  fontSize: { sm: 14, body: 14, bodyLg: 16, headline: 24 },
  fontFamilyNative: { semiBold: 'System', medium: 'System', bold: 'System', extraBold: 'System' },
  borderRadius: { md: 12 },
  letterSpacing: { normal: 0, slight: 0, snug: -0.12 },
  lineHeight: { condensed: 1.2, snug: 1.4, normal: 1.5 },
  opacity: { faint: 0.05, soft: 0.8 },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 16,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    headerPadding: 20,
  },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
}));

jest.mock('../BlurContainer', () => {
  const { View: RNView } = require('react-native');
  return { BlurContainer: RNView };
});

// The card and the row have their own suites; here they only have to put
// the label and the value on screen.
jest.mock('../Card', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../KeyValueRow', () => {
  const ReactActual = require('react');
  const { Text, View } = require('react-native');
  return {
    KeyValueRow: ({ label, value }: { label: string; value: React.ReactNode }) =>
      ReactActual.createElement(View, null, ReactActual.createElement(Text, null, label), value),
  };
});

jest.mock('../PendingValue', () => {
  const { View: RNView } = require('react-native');
  return {
    PendingValue: ({ children }: { children: React.ReactNode }) => <RNView>{children}</RNView>,
  };
});

jest.mock('../../icons', () => {
  const { View: RNView } = require('react-native');
  return { CaretDownIcon: () => <RNView />, iconSize: { sm: 16, md: 20, lg: 24 } };
});

jest.mock('./ConfirmationExchange', () => {
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    ConfirmationExchange: ({
      send,
      receive,
    }: {
      send: { label: string };
      receive: { label: string };
    }) => (
      <RNView>
        <RNText>{send.label}</RNText>
        <RNText>{receive.label}</RNText>
      </RNView>
    ),
  };
});

jest.mock('./ConfirmationButtons', () => {
  const { View: RNView } = require('react-native');
  return {
    ConfirmationButtons: () => <RNView testID="confirmation-action-row" />,
  };
});

import { TransactionConfirmation } from './TransactionConfirmation';
import type { ProposalDisplay } from './types';

const display: ProposalDisplay = {
  title: 'Swap Review',
  exchange: {
    send: { label: 'You Send', symbol: 'USDC', amount: '1 USDC' },
    receive: { label: 'You Receive', symbol: 'SOL', amount: '0.0197 SOL' },
  },
  rows: [
    { label: 'Salmon fee', value: '0.0085 USDC (0.85%)' },
    { label: 'Slippage Tolerance', value: '0.5%' },
    { label: 'Total Price Impact', value: '0.1%', pending: true },
  ],
  advancedRows: [
    { label: 'Provider', value: '0x' },
    { label: 'Route', value: 'Raydium → Orca', pending: true },
  ],
  attribution: 'Powered by 0x',
  warning: { title: 'Please Note', body: 'Rates are estimates.' },
  pendingTitle: 'Processing swap',
};

function renderScreen(
  overrides: Partial<React.ComponentProps<typeof TransactionConfirmation>> = {}
) {
  return render(
    <TransactionConfirmation
      display={display}
      onBack={jest.fn()}
      onConfirm={jest.fn()}
      confirmLabel="Confirm (12)"
      {...overrides}
    />
  );
}

describe('TransactionConfirmation — the warning card can always be read', () => {
  it('keeps the action row outside the scroll area, so it cannot cover the content', () => {
    // The irreversibility warning is the last card on the screen where the
    // transaction is committed. If the action row ever moves inside — or on
    // top of — the scroll area, that card gets sliced.
    const { UNSAFE_getByType, getByTestId } = renderScreen();

    expect(getByTestId('confirmation-action-row')).toBeTruthy();
    expect(
      within(UNSAFE_getByType(ScrollView)).queryByTestId('confirmation-action-row')
    ).toBeNull();
  });

  it('ends the scroll content above the action row rather than flush against it', () => {
    const { UNSAFE_getByType } = renderScreen();
    const { paddingBottom } = StyleSheet.flatten(
      UNSAFE_getByType(ScrollView).props.contentContainerStyle
    );
    expect(paddingBottom).toBeGreaterThan(0);
  });
});

describe('TransactionConfirmation — every fee is its own line, the provider is named', () => {
  it('groups every detail row into a single card and folds the advanced ones', () => {
    const { getAllByTestId, getByText, queryByText } = renderScreen();

    expect(getAllByTestId('confirmation-details-card')).toHaveLength(1);
    expect(getByText('Salmon fee')).toBeTruthy();
    expect(getByText('0.0085 USDC (0.85%)')).toBeTruthy();
    expect(getByText('Slippage Tolerance')).toBeTruthy();
    expect(queryByText('Provider')).toBeNull();
    expect(queryByText('Route')).toBeNull();
  });

  it('reveals the advanced rows when the Details disclosure is pressed', () => {
    const { getByTestId, getByText } = renderScreen();

    const disclosure = getByTestId('confirmation-details-disclosure');
    expect(disclosure.props.accessibilityState).toMatchObject({ expanded: false });
    fireEvent.press(disclosure);

    expect(getByText('Provider')).toBeTruthy();
    expect(getByText('Raydium → Orca')).toBeTruthy();
  });

  it('renders the attribution verbatim under the details', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('confirmation-attribution').props.children).toBe('Powered by 0x');
  });

  it('draws the warning the proposal carried, and none when it carried none', () => {
    expect(renderScreen().getByText('Rates are estimates.')).toBeTruthy();
    expect(
      renderScreen({ display: { ...display, warning: undefined } }).queryByText(
        'Rates are estimates.'
      )
    ).toBeNull();
  });

  it('reports a failed signature above the controls, translated', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      error: 'transaction.errors.networkBusy',
    });
    expect(getByTestId('confirmation-error').props.children).toBe('transaction.errors.networkBusy');
    expect(queryByTestId('confirmation-error')).toBeTruthy();
    expect(renderScreen().queryByTestId('confirmation-error')).toBeNull();
  });
});

describe('TransactionConfirmation title typography', () => {
  it('sets the screen title in the headline role, not a bold wide one', () => {
    const { getByText } = renderScreen();
    const title = StyleSheet.flatten(getByText('Swap Review').props.style);
    expect(title.fontSize).toBe(24);
    expect(title.fontFamily).toBe('System');
    expect(title.letterSpacing).toBe(-0.12);
  });
});
