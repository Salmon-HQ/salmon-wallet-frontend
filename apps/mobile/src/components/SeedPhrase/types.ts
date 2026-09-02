/**
 * SeedPhrase types, on native — the shared contracts plus native's focus and
 * key-event hooks. The DOM twin reads the same `*PropsBase`. The component
 * files declare these same shapes inline today — the next touch on those
 * files points them here.
 */
import type {
  SeedPhraseEntryPropsBase,
  SeedWordGridPropsBase,
  SeedWordInputPropsBase,
  SeedWordValidationState,
} from '@salmon/shared';
import type { Ref } from 'react';
import type { NativeSyntheticEvent, TextInput, TextInputKeyPressEventData } from 'react-native';

export type ValidationState = SeedWordValidationState;

export type SeedWordGridProps = SeedWordGridPropsBase;

export interface SeedWordInputProps extends SeedWordInputPropsBase {
  /** Handle to focus this box from a grid that owns the focus order. */
  inputRef?: Ref<TextInput>;
  /** Raw key events — a grid uses this to move back on backspace. */
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  /** Keyboard's return key. `next` by default. */
  returnKeyType?: 'next' | 'done';
}

export type SeedPhraseEntryProps = SeedPhraseEntryPropsBase;
