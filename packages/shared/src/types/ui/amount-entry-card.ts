/**
 * AmountEntryCard — the big centred amount card Send's amount step draws
 * (CORE 05): the number alone, centred, and an optional line under it (a
 * fiat value). The token is named by the row above the card, never beside
 * the number (owner ruling 2026-09-11: the number and its placeholder sit
 * centred on Send and Swap alike). Hoisted out of Send's amount step so
 * Swap's input form reuses the same visual (mobile
 * `apps/mobile/src/components/AmountEntryCard`, DOM
 * `packages/ui/src/components/AmountEntryCard`).
 */
import type { Testable } from './testable';

export interface AmountEntryCardPropsBase<TStyle> extends Testable {
  value: string;
  onChangeValue: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
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
