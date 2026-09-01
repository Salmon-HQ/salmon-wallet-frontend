import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-i18next', () => {
  // The real English copy: the row's subtitle IS the translated string, so a
  // mock that echoes keys would let a wrong key pass.
  const dictionary = require('../../../../../packages/shared/src/locales/en/translation.json');
  const resolve = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as never)?.[part], dictionary);
  const interpolate = (template: string, values: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(values[name] ?? ''));
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string | Record<string, unknown>) => {
        const values = fallback && typeof fallback === 'object' ? fallback : {};
        const template =
          (resolve(key) as string | undefined) ??
          (typeof fallback === 'string' ? fallback : (values.defaultValue as string)) ??
          key;
        return interpolate(template, values);
      },
    }),
  };
});

jest.mock('@salmon/shared', () => ({
  // The real tokens: the row is a `ListRow` now, and the kit primitives it
  // composes read far more of the theme than the row itself does.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  formatRelativeTimeCompact: () => '2h',
  getShortAddress: (address: string, chars: number) =>
    `${address.slice(0, chars)}…${address.slice(-chars)}`,
  getTransactionDescription: () => ({
    key: 'transactions.description.swap',
    values: { from: 'SOL', to: 'USDC' },
  }),
}));

// No worklets runtime in Jest: the kit's pressable bubble pulls reanimated in,
// so the animated touchable, the press hook and the two textures need
// plain-JS stand-ins (same shape as the IconBubble suite's).
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RNView,
      createAnimatedComponent: (Component: React.ComponentType<Record<string, unknown>>) =>
        ReactActual.forwardRef((props: Record<string, unknown>, ref: unknown) =>
          ReactActual.createElement(Component, { ...props, ref })
        ),
    },
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useReducedMotion: () => false,
    withTiming: (target: unknown) => target,
  };
});

jest.mock('../../../hooks/usePressMotion', () => ({
  usePressMotion: () => ({
    pressStyle: {},
    scale: { value: 1 },
    pressHandlers: { onPressIn: () => {}, onPressOut: () => {} },
    specular: { x: { value: 0 }, y: { value: 0 }, opacity: { value: 0 } },
  }),
}));

jest.mock('../FleshBackground', () => ({ FleshBackground: () => null }));

jest.mock('../PressSpecular', () => ({ PressSpecular: () => null, SPECULAR_OPACITY: 0.12 }));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import { borderRadius, semantic } from '@salmon/shared';
import { TransactionItem } from './TransactionItem';

/** The longest protocol name the Helius source enum can produce. */
const LONGEST_SOURCE = 'SOLANA_PROGRAM_LIBRARY';

const COUNTERPARTY = '9mpJqL4v2wRz1TgN7YbXcDeFgHiJkLmNoPqRsTuVSAd3';

const RECEIVE_TRANSACTION = {
  id: 'tx-1',
  type: 'receive',
  status: 'completed',
  source: LONGEST_SOURCE,
  timestamp: 1710000000000,
  inputs: [{ amount: '6773100', decimals: 6, symbol: 'USDC', source: COUNTERPARTY }],
  outputs: [],
} as never;

const SEND_TRANSACTION = {
  id: 'tx-2',
  type: 'send',
  status: 'completed',
  timestamp: 1710000000000,
  inputs: [],
  outputs: [{ amount: '1000000', decimals: 6, symbol: 'USDC', destination: COUNTERPARTY }],
} as never;

const SWAP_TRANSACTION = {
  id: 'tx-3',
  type: 'swap',
  status: 'completed',
  source: LONGEST_SOURCE,
  timestamp: 1710000000000,
  inputs: [{ amount: '1000000', decimals: 6, symbol: 'USDC' }],
  outputs: [{ amount: '2000000000', decimals: 9, symbol: 'SOL' }],
} as never;

describe('TransactionItem — the counterparty, not the program', () => {
  it('draws no program chip, whatever the indexer calls the protocol', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    expect(screen.queryByTestId('tx-row-source')).toBeNull();
    expect(screen.queryByText(LONGEST_SOURCE)).toBeNull();
  });

  it('says who it came from, in the header\'s short form', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    expect(screen.getByText('From 9mpJ…SAd3')).toBeTruthy();
  });

  it('says who it went to, in the header\'s short form', () => {
    render(<TransactionItem transaction={SEND_TRANSACTION} />);

    expect(screen.getByText('To 9mpJ…SAd3')).toBeTruthy();
  });

  it('prefers the address book name over the address', () => {
    render(
      <TransactionItem
        transaction={SEND_TRANSACTION}
        contacts={{ [COUNTERPARTY]: 'Alice' }}
      />
    );

    expect(screen.getByText('To Alice')).toBeTruthy();
    expect(screen.queryByText('To 9mpJ…SAd3')).toBeNull();
  });

  it('leaves a transaction with no counterparty to the shared description', () => {
    render(<TransactionItem transaction={SWAP_TRANSACTION} />);

    // A swap has no "to" or "from" — the shared describer names it instead.
    expect(screen.getByText('SOL to USDC')).toBeTruthy();
  });
});

describe('TransactionItem layout', () => {
  it('is a kit row: one `Card` ground, one radius', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    // The row does not draw its own box: `ListRow` wraps it in `Card`, so the
    // ground and the corner are the kit's, not this file's.
    const row = StyleSheet.flatten(screen.getByTestId('activity-tx-row').props.style);
    expect(row.borderRadius).toBe(borderRadius.r4);
    expect(row.backgroundColor).toBe(semantic.surface.membraneThin);
  });

  it('keeps the amount in its own reserved, right-aligned column', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    const amount = StyleSheet.flatten(screen.getByTestId('tx-row-amount').props.style);

    expect(amount.textAlign).toBe('right');
    // Tabular Rule: every rendered number carries tabular figures.
    expect(amount.fontVariant).toEqual(['tabular-nums']);
  });

  it('masks the amount when the balance is hidden', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} hiddenBalance />);

    expect(screen.getByTestId('tx-row-amount').props.children).toContain('****');
  });
});
