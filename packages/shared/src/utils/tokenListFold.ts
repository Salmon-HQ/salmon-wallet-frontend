/**
 * Which tokens Home shows and which wait behind "Show more" (spec 044).
 * Pure: the list keeps its own order, nothing is dropped, nothing re-sorted.
 */
import type { Token } from '../types/ui';
import { STAKED_SKR_KEY, STAKED_SOL_KEY } from './staking';
import { isNativeSol } from './tokens';

export const TOKEN_LIST_COUNT_PRESETS = [3, 5, 10, 20] as const;
export const TOKEN_LIST_MIN_VALUE_PRESETS = [1, 5, 10, 50] as const;

export interface TokenListPreference {
  /** null = All */
  maxCount: number | null;
  /** In the display currency; null = Off */
  minValue: number | null;
}

export const DEFAULT_TOKEN_LIST_PREFERENCE: TokenListPreference = {
  maxCount: null,
  minValue: null,
};

const preset = (presets: readonly number[], value: unknown): number | null =>
  typeof value === 'number' && presets.includes(value) ? value : null;

/** Anything that is not a preset reads as off, half by half. */
export function normalizeTokenListPreference(raw: unknown): TokenListPreference {
  const record = (raw ?? {}) as Partial<Record<keyof TokenListPreference, unknown>>;
  return {
    maxCount: preset(TOKEN_LIST_COUNT_PRESETS, record.maxCount),
    minValue: preset(TOKEN_LIST_MIN_VALUE_PRESETS, record.minValue),
  };
}

const isStaked = (address: string) => address === STAKED_SOL_KEY || address === STAKED_SKR_KEY;

export function foldTokenList<T extends Pick<Token, 'address' | 'usdBalance'>>(
  tokens: readonly T[],
  preference: TokenListPreference,
  convert: (usd: number) => number
): { visible: T[]; folded: T[] } {
  const { maxCount, minValue } = preference;
  const visible: T[] = [];
  const folded: T[] = [];
  let place = 0;

  for (const token of tokens) {
    if (isStaked(token.address)) {
      visible.push(token);
      continue;
    }
    const inCount = maxCount === null || place < maxCount;
    place += 1;
    const usd = token.usdBalance;
    const worthEnough =
      minValue === null ||
      isNativeSol(token.address) ||
      (typeof usd === 'number' && Number.isFinite(usd) && convert(usd) >= minValue);
    (inCount && worthEnough ? visible : folded).push(token);
  }

  return { visible, folded };
}
