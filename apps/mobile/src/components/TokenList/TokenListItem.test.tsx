/**
 * The card's secondary line: "SOL · $159.58 · +4.2%". Price and change are
 * kept (owner call, redesign follow-up) — this pins the row string and that
 * `hiddenBalance` masks the price but not the percentage, same as before.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import type { Token } from '@salmon/shared';

jest.mock('@salmon/shared', () => ({
  ...jest.requireActual('@salmon/shared/src/theme'),
  s: (value: number) => value,
  vs: (value: number) => value,
  ms: (value: number) => value,
  hiddenValue: '••••',
  getLabelValue: (value: number) => (value >= 0 ? 'positive' : 'negative'),
  showPercentage: (value: number) => `${value >= 0 ? '+' : ''}${value}%`,
  formatTokenAmount: (value: unknown) => String(value),
  formatLargeNumber: (value: number) =>
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(2)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(2)}K`
        : String(value),
  useCurrencyContext: () => [
    {},
    {
      formatValue: (value: number) => `$${value}`,
      formatChange: (value: number) => `${value >= 0 ? '+' : ''}$${value}`,
    },
  ],
}));

// Interpolating `t`: the masked-label assertions below are about what lands
// in `{{amount}}` / `{{price}}`, which a fallback-only stub throws away.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown, options?: Record<string, unknown>) => {
      const template = typeof fallback === 'string' ? fallback : key;
      const vars = (typeof fallback === 'object' ? fallback : options) ?? {};
      return template.replace(/\{\{(\w+)\}\}/g, (_m: string, name: string) =>
        String((vars as Record<string, unknown>)[name] ?? '')
      );
    },
  }),
}));

jest.mock('../TokenLogo', () => ({
  TokenLogo: () => null,
}));

import TokenListItem from './TokenListItem';

const TOKEN: Token = {
  address: 'So111',
  name: 'Solana',
  symbol: 'SOL',
  logo: 'https://example.com/sol.png',
  price: 159.58,
  uiAmount: '1.2',
  usdBalance: 191.5,
  last24HoursChange: { perc: 4.2, abs: 6.4 },
} as Token;

const flat = (node: { props: { style: unknown } }) =>
  Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));

describe('TokenListItem secondary line', () => {
  it('renders the ticker, the price and the change as three runs', () => {
    const { getByTestId } = render(<TokenListItem token={TOKEN} />);

    expect(getByTestId('token-row-ticker-SOL').props.children).toBe('SOL · ');
    expect(getByTestId('token-row-price-SOL').props.children).toBe('$159.58');
    expect(getByTestId('token-row-change-SOL').props.children).toBe(' · +4.2%');
  });

  it('masks the price but keeps the ticker and change when hiddenBalance is set', () => {
    const { getByTestId } = render(<TokenListItem token={TOKEN} hiddenBalance />);

    expect(getByTestId('token-row-ticker-SOL').props.children).toBe('SOL · ');
    expect(getByTestId('token-row-price-SOL').props.children).toBe('••••');
    expect(getByTestId('token-row-change-SOL').props.children).toBe(' · +4.2%');
  });

  it('drops a missing segment without stray separators', () => {
    const noChange: Token = { ...TOKEN, last24HoursChange: undefined };
    const { getByTestId, queryByTestId } = render(<TokenListItem token={noChange} />);

    expect(getByTestId('token-row-ticker-SOL').props.children).toBe('SOL · ');
    expect(getByTestId('token-row-price-SOL').props.children).toBe('$159.58');
    expect(queryByTestId('token-row-change-SOL')).toBeNull();
  });

  it('gives up the ticker before the price or the change', () => {
    // The order of sacrifice, as layout: only the ticker may shrink, and it
    // clips instead of ellipsising, so a narrow row reads "$159.58 · +4.2%"
    // rather than "SOL · $159.…".
    const { getByTestId } = render(<TokenListItem token={TOKEN} />);

    const ticker = getByTestId('token-row-ticker-SOL');
    expect(flat(ticker).flexShrink).toBe(1);
    expect(ticker.props.ellipsizeMode).toBe('clip');
    expect(flat(getByTestId('token-row-price-SOL')).flexShrink).toBe(0);
    expect(flat(getByTestId('token-row-change-SOL')).flexShrink).toBe(0);
  });
});

describe('TokenListItem hidden balance', () => {
  it('masks the balance for the screen reader too', () => {
    // The spoken label used to interpolate the raw amount and price whatever
    // `hiddenBalance` said, so VoiceOver read out the number the user hid.
    const { getByLabelText, queryByLabelText } = render(
      <TokenListItem token={TOKEN} hiddenBalance />
    );

    expect(getByLabelText('Solana token, balance •••• SOL')).toBeTruthy();
    expect(queryByLabelText(/1\.2/)).toBeNull();
  });

  it('masks the spoken price on the bitcoin row as well', () => {
    const btc: Token = { ...TOKEN, symbol: 'BTC', price: 64000, uiAmount: '0.51' } as Token;
    const { getByLabelText, queryByLabelText } = render(
      <TokenListItem token={btc} blockchain="bitcoin" hiddenBalance onPress={jest.fn()} />
    );

    expect(getByLabelText('Solana token, price ••••, balance •••• BTC')).toBeTruthy();
    expect(queryByLabelText(/64000|0\.51/)).toBeNull();
  });

  it('hides the absolute change, which is money, and keeps the percentage', () => {
    const { queryByText, getByTestId } = render(
      <TokenListItem token={TOKEN} blockchain="bitcoin" hiddenBalance />
    );

    expect(queryByText(/\+\$6.4/)).toBeNull();
    expect(getByTestId('token-row-change-SOL').props.children).toBe(' · +4.2%');
  });
});

describe('TokenListItem amount', () => {
  it('compacts a large holding instead of truncating the ticker off the row', () => {
    // "28896.26376 Bo…" on device (owner, first device run).
    const whale: Token = { ...TOKEN, symbol: 'BONK', uiAmount: '28896.26376' } as Token;
    const { getByText } = render(<TokenListItem token={whale} />);

    expect(getByText('28.90K BONK')).toBeTruthy();
  });

  it('keeps full precision below a thousand — dust is read digit by digit', () => {
    const dust: Token = { ...TOKEN, uiAmount: '0.00013129' } as Token;
    const { getByText } = render(<TokenListItem token={dust} />);

    expect(getByText('0.00013129 SOL')).toBeTruthy();
  });
});
