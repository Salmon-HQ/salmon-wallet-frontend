import type { Testable } from '@salmon/shared';

export type ValidationState = 'idle' | 'correct' | 'incorrect';

export interface SeedWordGridProps {
  /** Array of mnemonic words */
  words: string[];
  /** Number of columns (default: 3) */
  columns?: number;
}

export interface SeedWordInputProps extends Testable {
  /** Word position (1-indexed) */
  position: number;
  /** Current input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Validation state */
  validationState?: ValidationState;
  /** Auto focus this input */
  autoFocus?: boolean;
  /** Called when user submits */
  onSubmitEditing?: () => void;
  /**
   * Compact: the number sits inside the box instead of on a line above it, so
   * twelve of these fit in a grid rather than a column.
   */
  compact?: boolean;
  /**
   * Denser box, for the 24-word grid. Twenty-four boxes have to occupy the
   * band twelve did — the grid gets tighter rather than taller, because a grid
   * that grows would shove the layout the slot grid exists to hold still.
   */
  dense?: boolean;
  /** Handle to focus this box from a grid that owns the focus order. */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Raw key events — a grid uses this to move back on backspace. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Whole-blob paste, so the grid can distribute it across every box. */
  onPasteText?: (text: string) => void;
}

export interface SeedPhraseEntryProps extends Testable {
  /** One entry per box. Its length is the number of boxes drawn. */
  words: string[];
  onChange: (words: string[]) => void;
  /** Number of boxes to draw. The grid grows to 24 when a paste needs it. */
  onLengthChange: (length: number) => void;
  /** Reported when a paste does not divide into a usable phrase length. */
  onPasteRejected?: (count: number) => void;
}
