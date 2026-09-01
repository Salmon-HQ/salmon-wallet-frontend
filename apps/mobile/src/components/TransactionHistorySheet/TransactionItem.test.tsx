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
  // The real tokens: the row is a `ListRow` now, and the kit primitives it
  // composes read far more of the theme than the row itself does.
  ...jest.requireActual('../../../test-utils/themeTokens'),
  formatRawAmount: (amount: string | number, decimals: number) =>
    `${Number(amount) / 10 ** decimals}`,
  formatRelativeTimeCompact: () => '2h',
  getTransactionDescription: () => 'description',
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

  it('is a kit row: one `Card` ground, one radius, a pill for the protocol', () => {
    render(<TransactionItem transaction={RECEIVE_TRANSACTION} />);

    // The row no longer draws its own box: `ListRow` wraps it in `Card`, so
    // the ground and the corner are the kit's, not this file's.
    const row = StyleSheet.flatten(screen.getByTestId('activity-tx-row').props.style);
    expect(row.borderRadius).toBe(borderRadius.r4);
    expect(row.backgroundColor).toBe(semantic.surface.membraneThin);

    // And the protocol name is a `Chip` — a pill that may drop below the
    // title, never a slab that pushes it into "Receive…".
    const chip = StyleSheet.flatten(screen.getByTestId('tx-row-source').props.style);
    expect(chip.borderRadius).toBe(borderRadius.full);
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
