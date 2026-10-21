/**
 * useAmountShortcuts — the 25 / 50 / 75 / Max fills under an amount card
 * (CORE 05), on Send, both twins. One hook so the call
 * sites share the truncation and the selection rule:
 *
 * A fill stays lit — the chip and the amount card take the accent — until
 * the user types over it (owner ruling 2026-09-11). Route the field's own
 * edits through `onAmountChange` so a typed digit clears the selection.
 *
 * @module hooks/useAmountShortcuts
 */
import { useCallback, useMemo, useState } from 'react';
import type { ChipOption } from '../types/ui/chip';
import { fromBaseUnits, toBaseUnits } from '../utils/decimals';

/** Whole percents of the balance, so a fill is computed on integers; `100` is MAX. */
export const AMOUNT_SHORTCUTS = [
  { key: '25', percent: 25 },
  { key: '50', percent: 50 },
  { key: '75', percent: 75 },
  { key: 'max', percent: 100 },
] as const;

export type AmountShortcutKey = (typeof AMOUNT_SHORTCUTS)[number]['key'];

export interface UseAmountShortcutsParams {
  /** The balance the fills divide; `undefined` disables every fill. */
  balance: number | undefined;
  /** Token decimals the fill is truncated to (never rounded up past the balance). */
  decimals: number | undefined;
  /**
   * Receives every amount the field shows. A fill also names itself, so the
   * send can tell Max — the whole balance — from an amount that happens to
   * equal it.
   */
  setAmount: (amount: string, shortcut?: AmountShortcutKey) => void;
  /** Translated label for the whole-balance fill. */
  maxLabel: string;
}

export interface UseAmountShortcutsResult {
  options: ChipOption[];
  /** The lit fill, or `''` when the amount is the user's own. */
  selected: string;
  /** Apply a fill: sets the amount and lights the chip. */
  select: (key: string) => void;
  /** The amount field's `onChange`: sets the amount and clears the fill. */
  onAmountChange: (amount: string) => void;
}

export function useAmountShortcuts({
  balance,
  decimals,
  setAmount,
  maxLabel,
}: UseAmountShortcutsParams): UseAmountShortcutsResult {
  const [selected, setSelected] = useState('');

  const options = useMemo<ChipOption[]>(
    () =>
      AMOUNT_SHORTCUTS.map((shortcut) => ({
        key: shortcut.key,
        label: shortcut.key === 'max' ? maxLabel : `${shortcut.key}%`,
      })),
    [maxLabel]
  );

  const select = useCallback(
    (key: string) => {
      const option = AMOUNT_SHORTCUTS.find((shortcut) => shortcut.key === key);
      if (!option || balance === undefined || !(Number.isFinite(balance) && balance >= 0)) return;
      // On integers, so the fill never loses its last unit to floating point
      // (1.15 * 1e6 is 1149999.9999999998).
      const places = decimals ?? 9;
      const units = (toBaseUnits(balance, places) * BigInt(option.percent)) / 100n;
      setAmount(fromBaseUnits(units, places), option.key);
      setSelected(key);
    },
    [balance, decimals, setAmount]
  );

  const onAmountChange = useCallback(
    (amount: string) => {
      setSelected('');
      setAmount(amount);
    },
    [setAmount]
  );

  return { options, selected, select, onAmountChange };
}
