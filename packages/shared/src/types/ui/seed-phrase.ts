import type { Testable } from './testable';

/** How a typed word stands against the phrase it is checked against. */
export type SeedWordValidationState = 'idle' | 'correct' | 'incorrect';

/** The recovery phrase shown in numbered cells — the Bedrock Rule's surface. */
export interface SeedWordGridPropsBase {
  /** Array of mnemonic words */
  words: string[];
  /** Number of columns (default: 3) */
  columns?: number;
}

/**
 * One word of the phrase, typed. The grid that owns the focus order adds its
 * platform's ref and key-event hooks on top of this.
 */
export interface SeedWordInputPropsBase extends Testable {
  /** Word position (1-indexed) */
  position: number;
  /** Current input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Validation state */
  validationState?: SeedWordValidationState;
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
}

/**
 * A recovery phrase typed one word per box. Space commits and advances, a
 * paste fills every box, backspace in an empty box steps back — the string
 * handling is `distributePhrase`, one implementation for both platforms.
 */
export interface SeedPhraseEntryPropsBase extends Testable {
  /** One entry per box. Its length is the number of boxes drawn. */
  words: string[];
  onChange: (words: string[]) => void;
  /** Number of boxes to draw. The grid grows to 24 when a paste needs it. */
  onLengthChange: (length: number) => void;
  /** Reported when a paste does not divide into a usable phrase length. */
  onPasteRejected?: (count: number) => void;
}
