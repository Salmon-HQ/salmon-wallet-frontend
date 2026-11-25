/**
 * @vitest-environment jsdom
 *
 * The two hooks Home and Settings read the token list preference through:
 * which tokens the list renders and whether it is unfolded, and the copy the
 * Settings row and screen print.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Token } from '../types/ui';
import type { CurrencyCode } from '../types/currency';
import { formatFiatValue } from '../utils/currencyFormatting';
import type { TokenListPreference } from '../utils/tokenListFold';

let preference: TokenListPreference = { maxCount: null, minValue: null };
let currency: { code: CurrencyCode; rate: number } = { code: 'usd', rate: 1 };

vi.mock('../contexts/DeveloperModeContext', () => ({
  useTokenListPreference: () => ({
    tokenListPreference: preference,
    setTokenListPreference: async () => {},
  }),
}));

vi.mock('../contexts/CurrencyContext', () => ({
  useCurrencyContext: () => [
    { currency: currency.code, exchangeRate: currency.rate },
    {
      convert: (usd: number) => usd * currency.rate,
      formatValue: (usd: number | null | undefined) =>
        formatFiatValue(usd, currency.code, currency.rate, 'en'),
    },
  ],
}));

vi.mock('react-i18next', async () => {
  const i18next = (await import('i18next')).default.createInstance();
  const en = (await import('../locales/en/translation.json')).default;
  await i18next.init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return { useTranslation: () => ({ t: i18next.t.bind(i18next) }) };
});

import {
  useTokenListFold,
  useTokenListFoldLabel,
  useTokenListLabels,
} from './useTokenListPreference';

const token = (address: string, usdBalance: number | null): Token => ({
  address,
  name: address,
  symbol: address,
  uiAmount: 1,
  usdBalance,
});

const tokens = [token('A', 120), token('B', 40), token('C', 6), token('D', 4), token('E', 1)];
const addresses = (list: Token[]) => list.map((t) => t.address);

beforeEach(() => {
  preference = { maxCount: null, minValue: null };
  currency = { code: 'usd', rate: 1 };
});

describe('useTokenListFold', () => {
  type Where = { address: string | undefined; networkId: string | undefined };
  const home: Where = { address: 'wallet', networkId: 'solana-mainnet' };
  const mount = (where: Where = home) =>
    renderHook(
      ({ list = tokens, ...where }: Where & { list?: Token[] }) =>
        useTokenListFold({ tokens: list, ...where }),
      { initialProps: where as Where & { list?: Token[] } }
    );

  it('renders every token when the preference is off', () => {
    const { result } = mount();
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.current.foldedCount).toBe(0);
  });

  it('folds after a preference change without remounting', () => {
    const { result, rerender } = mount();

    preference = { maxCount: 3, minValue: null };
    rerender(home);

    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C']);
    expect(result.current.foldedCount).toBe(2);
  });

  it('starts folded, unfolds on toggle with the folded tokens last, and folds again', () => {
    preference = { maxCount: 3, minValue: null };
    const { result } = mount();
    expect(result.current.expanded).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(true);
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(result.current.foldedCount).toBe(2);

    act(() => result.current.toggle());
    expect(result.current.expanded).toBe(false);
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C']);
  });

  // Owner, 2026-11-25: a token visit and back leaves the list as it was. Home
  // stays mounted under the token screen, so the visit is a rerender with the
  // same wallet and network (the balances may have refreshed meanwhile).
  it('stays unfolded across a token visit and back', () => {
    preference = { maxCount: 3, minValue: null };
    const { result, rerender } = mount();

    act(() => result.current.toggle());
    rerender({ ...home, list: [...tokens] });
    rerender({ ...home, list: [...tokens] });

    expect(result.current.expanded).toBe(true);
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it.each([
    ['another account', { address: 'other-wallet', networkId: 'solana-mainnet' }],
    ['another network', { address: 'wallet', networkId: 'solana-devnet' }],
  ])('folds again on %s, and stays folded when it comes back', (_, elsewhere) => {
    preference = { maxCount: 3, minValue: null };
    const { result, rerender } = mount();

    act(() => result.current.toggle());
    rerender(elsewhere);
    expect(result.current.expanded).toBe(false);

    rerender(home);
    expect(result.current.expanded).toBe(false);
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C']);
  });

  it('folds again when the preference changes', () => {
    preference = { maxCount: 3, minValue: null };
    const { result, rerender } = mount();

    act(() => result.current.toggle());
    preference = { maxCount: 3, minValue: 5 };
    rerender(home);

    expect(result.current.expanded).toBe(false);
    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C']);
  });

  it('compares the threshold in the display currency', () => {
    preference = { maxCount: null, minValue: 5 };
    currency = { code: 'eur', rate: 1.5 };
    const { result } = mount();

    expect(addresses(result.current.tokens)).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('useTokenListLabels', () => {
  const labels = () => renderHook(() => useTokenListLabels()).result.current;

  it('lists the count options and the threshold options, off first', () => {
    const { countOptions, minValueOptions } = labels();

    expect(countOptions.map((o) => [o.key, o.value, o.label])).toEqual([
      ['all', null, 'All'],
      ['3', 3, '3 tokens'],
      ['5', 5, '5 tokens'],
      ['10', 10, '10 tokens'],
      ['20', 20, '20 tokens'],
    ]);
    expect(minValueOptions.map((o) => [o.key, o.value, o.label])).toEqual([
      ['off', null, 'Off'],
      ['1', 1, '$1.00'],
      ['5', 5, '$5.00'],
      ['10', 10, '$10.00'],
      ['50', 50, '$50.00'],
    ]);
  });

  it.each([
    [{ maxCount: null, minValue: null }, 'All'],
    [{ maxCount: 3, minValue: null }, '3 tokens'],
    [{ maxCount: null, minValue: 5 }, 'from $5.00'],
    [{ maxCount: 3, minValue: 5 }, '3 tokens · from $5.00'],
  ])('states %o as "%s" in dollars', (chosen, expected) => {
    preference = chosen;
    expect(labels().rowValue).toBe(expected);
  });

  it('prints the threshold in the display currency, with the same number', () => {
    currency = { code: 'eur', rate: 0.925 };
    preference = { maxCount: 3, minValue: 5 };

    const { rowValue, minValueOptions } = labels();

    expect(rowValue).toBe('3 tokens · from €5.00');
    expect(minValueOptions[2].label).toBe('€5.00');
  });

  it('states a threshold alone in the display currency', () => {
    currency = { code: 'eur', rate: 0.925 };
    preference = { maxCount: null, minValue: 5 };

    expect(labels().rowValue).toBe('from €5.00');
  });
});

describe('useTokenListFold — the value the row shows', () => {
  const mountWith = (list: Token[]) =>
    renderHook(() =>
      useTokenListFold({ tokens: list, address: 'wallet', networkId: 'solana-mainnet' })
    );

  it('keeps a token whose row rounds up to the minimum', () => {
    preference = { maxCount: null, minValue: 5 };

    // 4.996 prints as $5.00; 4.994 prints as $4.99.
    const { result } = mountWith([token('A', 4.996), token('B', 4.994)]);

    expect(addresses(result.current.tokens)).toEqual(['A']);
    expect(result.current.foldedCount).toBe(1);
  });

  it('rounds to the decimals the display currency prints', () => {
    preference = { maxCount: null, minValue: 5 };
    currency = { code: 'clp', rate: 1 };

    // The Chilean peso prints no decimals: 4.6 reads 5, 4.4 reads 4.
    const { result } = mountWith([token('A', 4.6), token('B', 4.4)]);

    expect(addresses(result.current.tokens)).toEqual(['A']);
  });
});

describe('useTokenListFoldLabel', () => {
  it('says how many tokens are folded, and "Show less" once open', () => {
    const label = (foldedCount: number, expanded: boolean) =>
      renderHook(() => useTokenListFoldLabel(foldedCount, expanded)).result.current;

    expect(label(7, false)).toBe('Show 7 more tokens');
    expect(label(1, false)).toBe('Show 1 more token');
    expect(label(7, true)).toBe('Show less');
  });
});
