/**
 * useAmountShortcuts — the 25 / 50 / 75 / Max fills under an amount card
 * (CORE 05), on Send and on Swap, both twins. One hook so the four call
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

/** `1` is MAX — the whole balance. */
export const AMOUNT_SHORTCUTS = [
  { key: '25', value: 0.25 },
  { key: '50', value: 0.5 },
  { key: '75', value: 0.75 },
  { key: 'max', value: 1 },
] as const;

export type AmountShortcutKey = (typeof AMOUNT_SHORTCUTS)[number]['key'];

export interface UseAmountShortcutsParams {
  /** The balance the fills divide; `undefined` disables every fill. */
  balance: number | undefined;
  /** Token decimals the fill is truncated to (never rounded up past the balance). */
  decimals: number | undefined;
  setAmount: (amount: string) => void;
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
      if (!option || balance === undefined) return;
      const scale = 10 ** (decimals ?? 9);
      const truncated = Math.floor(balance * option.value * scale) / scale;
      setAmount(truncated > 0 ? truncated.toString() : '0');
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
