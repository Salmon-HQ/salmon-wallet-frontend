/**
 * SeedPhrase types, on the DOM — the shared contracts plus the DOM's focus
 * and key-event hooks. The mobile twin reads the same `*PropsBase`.
 */
import type {
  SeedPhraseEntryPropsBase,
  SeedWordGridPropsBase,
  SeedWordInputPropsBase,
  SeedWordValidationState,
} from '@salmon/shared';

export type ValidationState = SeedWordValidationState;

export type SeedWordGridProps = SeedWordGridPropsBase;

export interface SeedWordInputProps extends SeedWordInputPropsBase {
  /** Handle to focus this box from a grid that owns the focus order. */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Raw key events — a grid uses this to move back on backspace. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Whole-blob paste, so the grid can distribute it across every box. */
  onPasteText?: (text: string) => void;
}

export type SeedPhraseEntryProps = SeedPhraseEntryPropsBase;
