/**
 * AmountEntryCard — the big centred amount card Send's amount step draws
 * (CORE 05): the number, a trailing control beside it on the baseline (a
 * static symbol or a pressable token chip), and an optional line under it
 * (a fiat value). Hoisted out of Send's amount step so Swap's input form
 * reuses the same visual instead of its own (mobile
 * `apps/mobile/src/components/AmountEntryCard`, DOM
 * `packages/ui/src/components/AmountEntryCard`).
 */
import type { ReactNode } from 'react';
import type { Testable } from './testable';

export interface AmountEntryCardPropsBase<TStyle> extends Testable {
  value: string;
  onChangeValue: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
  /**
   * Drawn beside the number on its baseline — a symbol or a token chip.
   * Omitted, the number alone is centred (Swap's cards: the token chip
   * moved to a header row above the card).
   */
  trailing?: ReactNode;
  /** The line under the number, e.g. "≈ 0.00 USD". Omitted when there is none. */
  subtext?: string;
  /** True while the amount waits on something else (Swap's quote). */
  loading?: boolean;
  /** Highlights the card's border, as Send does while the field is focused. */
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: TStyle;
}
