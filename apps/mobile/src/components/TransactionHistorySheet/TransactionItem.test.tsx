import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object') {
        const template = (fallback.defaultValue as string | undefined) ?? key;
        return template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(fallback[name] ?? ''));
      }
      return key;
    },
  }),
}));

jest.mock('@salmon/shared', () => ({
  borderRadius: { lg: 16, sm: 8, badge: 9, iconLg: 12, iconContainer: 12 },
  borderWidth: { medium: 2, thin: 1 },
  colors: {
    accent: { primary: '#FF5C45' },
    background: { card: '#111', secondary: '#0B0F19' },
    change: { negative: '#f44', positive: '#4f4' },
    palette: {
      purple: '#90f',
      cyan: '#0ff',
      orange: '#f90',
      green: '#0f0',
      amber: '#fc0',
      blue: '#09f',
    },
    text: { primary: '#fff', secondary: '#999', tertiary: '#666' },
  },
  semantic: { status: { danger: '#f00', warning: '#fc0', success: '#0f0' } },
  fontFamilyNative: { medium: 'System', regular: 'System', mono: 'GeistMonoRegular' },
  fontSize: { xs: 10, sm: 12, base: 14, lg: 18, mono: 13 },
  letterSpacing: { semiWide: 0.3 },
  spacing: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, headerPadding: 20 },
  tabularNums: { native: { fontVariant: ['tabular-nums'] }, css: {} },
  ms: (value: number) => value,
  s: (value: number) => value,
  vs: (value: number) => value,
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  formatRelativeTimeCompact: () => '2h',
  getTransactionDescription: () => 'description',
}));

jest.mock('../BlurContainer', () => ({
  BlurContainer: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import { TransactionItem } from './TransactionItem';

/** The longest protocol name the Helius source enum can produce. */
const LONGEST_SOURCE = 'SOLANA_PROGRAM_LIBRARY';

const RECEIVE_TRANSACTION = {
  id: 'tx-1',
  type: 'receive',
  status: 'completed',
  source: LONGEST_SOURCE,
  timestamp: 1710000000000,
  inputs: [{ amount: '6773100', decimals: 6, symbol: 'USDC' }],
  outputs: [],
} as never;

describe('TransactionItem layout', () => {
  it('bounds the protocol chip so it cannot grow into the amount', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    const chip = StyleSheet.flatten(screen.getByTestId('tx-row-source').props.style);

    expect(chip.maxWidth).toBeGreaterThan(0);
    expect(chip.flexShrink).toBe(1);

    // The chip's label truncates rather than overflowing its box.
    const label = screen.getByText(LONGEST_SOURCE);
    expect(label.props.numberOfLines).toBe(1);
  });

  it('keeps the amount in its own reserved, right-aligned column', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    const amount = StyleSheet.flatten(screen.getByTestId('tx-row-amount').props.style);

    expect(amount.textAlign).toBe('right');
    // Tabular Rule: every rendered number carries tabular figures.
    expect(amount.fontVariant).toEqual(['tabular-nums']);
  });

  it('renders the amount and the chip as siblings, never stacked', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    // Two distinct nodes: nothing composes the protocol name into the amount
    // string, which is what let them share a line and overprint.
    expect(screen.getByText(LONGEST_SOURCE)).toBeTruthy();
    expect(screen.getByTestId('tx-row-amount').props.children).not.toContain(LONGEST_SOURCE);
  });
});
