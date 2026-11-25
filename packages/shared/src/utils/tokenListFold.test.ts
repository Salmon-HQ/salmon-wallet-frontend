import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { SOL_CONSTANTS } from './balance';
import { STAKED_SKR_KEY, STAKED_SOL_KEY } from './staking';
import {
  DEFAULT_TOKEN_LIST_PREFERENCE,
  foldTokenList,
  normalizeTokenListPreference,
  type TokenListPreference,
} from './tokenListFold';

type Row = { address: string; usdBalance?: number | null };

const SOL = SOL_CONSTANTS.ADDRESS;
const sSOL = STAKED_SOL_KEY;
const sSKR = STAKED_SKR_KEY;
const same = (usd: number) => usd;

const rows = (...pairs: [string, number | null | undefined][]): Row[] =>
  pairs.map(([address, usdBalance]) => ({ address, usdBalance }));

const pref = (maxCount: number | null, minValue: number | null): TokenListPreference => ({
  maxCount,
  minValue,
});

const addresses = (list: Row[]) => list.map((t) => t.address);

const fold = (input: Row[], preference: TokenListPreference, convert = same) => {
  const { visible, folded } = foldTokenList(input, preference, convert);
  return { visible: addresses(visible), folded: addresses(folded) };
};

describe('foldTokenList', () => {
  const six = rows([SOL, 2], ['A', 120], ['B', 40], ['C', 6], ['D', 4.99], ['E', 0.02]);

  it('1: shows everything when both rules are off', () => {
    expect(fold(six, pref(null, null))).toEqual({ visible: addresses(six), folded: [] });
  });

  it('2: keeps SOL and the next two of ten when the count is 3', () => {
    const ten = rows(
      [SOL, 2],
      ...Array.from({ length: 9 }, (_, i): [string, number] => [`T${i}`, 9 - i])
    );
    expect(fold(ten, pref(3, null))).toEqual({
      visible: [SOL, 'T0', 'T1'],
      folded: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
    });
  });

  it('3: folds nothing when the wallet holds fewer tokens than the count', () => {
    expect(fold(rows([SOL, 2], ['A', 120]), pref(3, null))).toEqual({
      visible: [SOL, 'A'],
      folded: [],
    });
  });

  it('4: folds nothing when the wallet holds exactly the count', () => {
    const five = rows([SOL, 2], ['A', 4], ['B', 3], ['C', 2], ['D', 1]);
    expect(fold(five, pref(5, null))).toEqual({ visible: addresses(five), folded: [] });
  });

  it('5: folds what is worth less than the threshold and what has no price', () => {
    expect(fold([...six, { address: 'F', usdBalance: null }], pref(null, 5))).toEqual({
      visible: [SOL, 'A', 'B', 'C'],
      folded: ['D', 'E', 'F'],
    });
  });

  it('6: keeps a token worth exactly the threshold', () => {
    expect(fold(rows(['A', 5]), pref(null, 5))).toEqual({ visible: ['A'], folded: [] });
  });

  it('7: folds a token worth strictly less than the threshold', () => {
    expect(fold(rows(['A', 4.999999]), pref(null, 5))).toEqual({ visible: [], folded: ['A'] });
  });

  it('8: folds every unpriced token when a threshold is set', () => {
    const unpriced = rows(['F', null], ['G', undefined], ['H', NaN], ['I', Infinity]);
    expect(fold(unpriced, pref(null, 1))).toEqual({
      visible: [],
      folded: ['F', 'G', 'H', 'I'],
    });
  });

  it('9: keeps unpriced tokens when no threshold is set', () => {
    expect(fold(rows(['F', null], ['G', undefined]), pref(null, null))).toEqual({
      visible: ['F', 'G'],
      folded: [],
    });
  });

  it('10: never folds SOL by value', () => {
    expect(fold(rows([SOL, 0.1], ['A', 120]), pref(null, 50))).toEqual({
      visible: [SOL, 'A'],
      folded: [],
    });
  });

  it('11: applies the count after SOL with both rules on', () => {
    expect(fold(rows([SOL, 2], ['A', 120], ['B', 40], ['C', 6]), pref(3, 5))).toEqual({
      visible: [SOL, 'A', 'B'],
      folded: ['C'],
    });
  });

  it('12: folds one token by value and another by place', () => {
    expect(fold(rows([SOL, 2], ['A', 120], ['B', 3], ['C', 60]), pref(3, 5))).toEqual({
      visible: [SOL, 'A'],
      folded: ['B', 'C'],
    });
  });

  it('13: on devnet, where only SOL has a price, keeps SOL alone', () => {
    expect(fold(rows([SOL, 2], ['A', null], ['B', null]), pref(null, 1))).toEqual({
      visible: [SOL],
      folded: ['A', 'B'],
    });
  });

  it('14: compares the value in the display currency (rate above 1)', () => {
    expect(fold(rows(['A', 4]), pref(null, 5), (usd) => usd * 1.5)).toEqual({
      visible: ['A'],
      folded: [],
    });
  });

  it('15: compares the value in the display currency (rate below 1)', () => {
    expect(fold(rows(['A', 4]), pref(null, 5), (usd) => usd * 0.5)).toEqual({
      visible: [],
      folded: ['A'],
    });
  });

  it('16: staked positions take no place in the count', () => {
    const input = rows([SOL, 2], [sSOL, 0.5], [sSKR, 0.5], ['A', 120], ['B', 40], ['C', 6]);
    expect(fold(input, pref(3, null))).toEqual({
      visible: [SOL, sSOL, sSKR, 'A', 'B'],
      folded: ['C'],
    });
  });

  it('17: staked positions are never folded by value', () => {
    const input = rows([SOL, 2], [sSOL, 0.5], [sSKR, 0.01], ['A', 120]);
    expect(fold(input, pref(null, 50))).toEqual({
      visible: [SOL, sSOL, sSKR, 'A'],
      folded: [],
    });
  });

  it('18: a staked position with no price is still shown', () => {
    expect(fold(rows([sSOL, null], ['A', 1]), pref(1, 5))).toEqual({
      visible: [sSOL],
      folded: ['A'],
    });
  });

  const anyRow = fc.record({
    address: fc.oneof(fc.constantFrom(SOL, sSOL, sSKR), fc.string()),
    usdBalance: fc.oneof(fc.double(), fc.constant(null), fc.constant(undefined)),
  });
  const anyPreference = fc.record({
    maxCount: fc.constantFrom(null, 3, 5, 10, 20),
    minValue: fc.constantFrom(null, 1, 5, 10, 50),
  });

  it('19: visible and folded together are the input, each in input order, nothing duplicated', () => {
    fc.assert(
      fc.property(fc.array(anyRow), anyPreference, (input: Row[], preference) => {
        const { visible, folded } = foldTokenList(input, preference, same);
        const position = (t: Row) => input.indexOf(t);
        const ascending = (list: Row[]) =>
          list.every((t, i) => i === 0 || position(list[i - 1]) < position(t));

        expect(visible.length + folded.length).toBe(input.length);
        expect(new Set([...visible, ...folded]).size).toBe(input.length);
        expect([...visible, ...folded].every((t) => input.includes(t))).toBe(true);
        expect(ascending(visible)).toBe(true);
        expect(ascending(folded)).toBe(true);
      })
    );
  });

  it('20: leaves the input array as it was', () => {
    const input = Object.freeze([...six]) as Row[];
    const before = [...input];
    foldTokenList(input, pref(3, 5), same);
    expect(input).toEqual(before);
  });
});

describe('normalizeTokenListPreference', () => {
  it.each([undefined, null, {}])('reads %s as the default', (raw) => {
    expect(normalizeTokenListPreference(raw)).toEqual(DEFAULT_TOKEN_LIST_PREFERENCE);
  });

  it('keeps two presets', () => {
    expect(normalizeTokenListPreference({ maxCount: 3, minValue: 5 })).toEqual(pref(3, 5));
  });

  it.each([
    [{ maxCount: 4, minValue: 5 }, pref(null, 5)],
    [{ maxCount: '3', minValue: 5 }, pref(null, 5)],
    [{ maxCount: -1, minValue: 5 }, pref(null, 5)],
    [{ maxCount: 3, minValue: NaN }, pref(3, null)],
    [{ maxCount: 3, minValue: 2 }, pref(3, null)],
  ])('reads a half that is not a preset as off: %o', (raw, expected) => {
    expect(normalizeTokenListPreference(raw)).toEqual(expected);
  });
});
