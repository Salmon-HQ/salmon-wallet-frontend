import { describe, expect, it } from 'vitest';

import { CURRENCY_ITEMS, filterCurrencyItems } from './items';

const codes = (query: string) => filterCurrencyItems(CURRENCY_ITEMS, query).map((i) => i.code);

describe('filterCurrencyItems', () => {
  it('lists every currency for an empty or blank query', () => {
    expect(filterCurrencyItems(CURRENCY_ITEMS, '')).toHaveLength(45);
    expect(filterCurrencyItems(CURRENCY_ITEMS, '   ')).toHaveLength(45);
  });

  it('finds a currency by its code, in any case', () => {
    expect(codes('czk')).toEqual(['czk']);
    expect(codes('CZK')).toEqual(['czk']);
  });

  it('finds currencies by any part of their name, ignoring accents', () => {
    expect(codes('koruna')).toEqual(['czk']);
    expect(codes('zloty')).toEqual(['pln']);
    expect(codes('złoty')).toEqual(['pln']);
    expect(codes('dollar')).toEqual(expect.arrayContaining(['usd', 'aud', 'cad', 'nzd']));
  });

  it('keeps the list order', () => {
    expect(codes('krone')).toEqual(['dkk', 'nok']);
  });

  it('finds nothing for a query no currency matches', () => {
    expect(codes('bitcoin')).toEqual([]);
  });
});
