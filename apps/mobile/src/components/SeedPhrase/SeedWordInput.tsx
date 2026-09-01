/**
 * SeedWordInput - Input for validating a specific mnemonic word
 */
import { useTranslation } from 'react-i18next';
import type { Ref } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import {
  spacing,
  componentSizes,
  fontSize,
  borderWidth,
  fontFamilyNative,
  semantic,
} from '@salmon/shared';
import type { Testable } from '@salmon/shared';
import { useSecretScreen } from '../../../hooks/useSecretScreen';

type ValidationState = 'idle' | 'correct' | 'incorrect';

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
  /** Handle to focus this box from a grid that owns the focus order. */
  inputRef?: Ref<TextInput>;
  /** Raw key events — a grid uses this to move back on backspace. */
  onKeyPress?: (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
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
  /** Keyboard's return key. `next` by default. */
  returnKeyType?: 'next' | 'done';
}

export function SeedWordInput({
  position,
  value,
  onChangeText: onChangeTextRaw,
  validationState = 'idle',
  autoFocus,
  onSubmitEditing,
  inputRef,
  onKeyPress,
  compact = false,
  dense = false,
  returnKeyType = 'next',
  testID,
}: SeedWordInputProps) {
  const { t } = useTranslation();

  /**
   * BIP-39 words are lowercase, and a capitalised one is an invalid mnemonic
   * the user cannot see the fault in — the box looks right. The keyboard flags
   * below turn autocapitalisation off, but a keyboard may still force a
   * capital through (some Android IMEs ignore `autoCapitalize`, and a paste
   * carries whatever it carried), so the value is normalised regardless. Done
   * here rather than per caller because every caller wants it.
   */
  const onChangeText = (text: string) => onChangeTextRaw(text.toLowerCase());

  // A typed recovery word is worth as much as a displayed one.
  useSecretScreen('seed-word-input');

  const getBorderColor = () => {
    switch (validationState) {
      case 'correct':
        return semantic.status.success;
      case 'incorrect':
        return semantic.status.danger;
      default:
        return semantic.input.edge;
    }
  };

  if (compact) {
    return (
      <View
        style={[styles.compactBox, dense && styles.denseBox, { borderColor: getBorderColor() }]}
      >
        <Text style={styles.compactIndex} accessibilityLabel={String(position)}>
          {position}
          <Text style={styles.indexDot}>.</Text>
        </Text>
        <TextInput
          ref={inputRef}
          testID={testID}
          accessibilityLabel={t('wallet.create.word_number', { position })}
          style={styles.compactInput}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={semantic.text.tertiary}
          onKeyPress={onKeyPress}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          {...secretInputProps}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('wallet.create.word_number', { position })}</Text>
      <TextInput
        ref={inputRef}
        testID={testID}
        accessibilityLabel={t('wallet.create.word_number', { position })}
        style={[styles.input, { borderColor: getBorderColor() }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('wallet.create.enter_word_number', { position })}
        placeholderTextColor={semantic.text.tertiary}
        onKeyPress={onKeyPress}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        {...secretInputProps}
      />
    </View>
  );
}

/**
 * Everything that has to be off for a BIP-39 word.
 *
 * Autocorrect or autocapitalisation silently turns a valid word into an
 * invalid mnemonic, and the user cannot see why — the box looks right.
 * `textContentType: 'none'` and `autoComplete: 'off'` also keep the OS from
 * offering to remember what was typed here.
 */
const secretInputProps = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  textContentType: 'none',
  importantForAutofill: 'no',
  keyboardType: 'visible-password',
} as const;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.caption,
    marginBottom: spacing.xs,
  },
  compactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: componentSizes.buttonHeightSmall,
    backgroundColor: semantic.input.ground,
    borderWidth: borderWidth.thin,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  denseBox: {
    height: componentSizes.buttonHeightCompact,
    paddingHorizontal: spacing.xs,
    gap: spacing.xxs,
  },
  /**
   * The index's period, in the brand salmon.
   *
   * Decoration only (product, 2026-08-18). Three things it must never do, on a
   * screen where a stray character is a wrong seed:
   *
   * - **Never reach the value.** It is markup, not content: it is not in `value`,
   *   never passes through `onChangeText`, and cannot survive into the mnemonic
   *   that gets validated or stored.
   * - **Never be announced.** The `accessibilityLabel` on the wrapping `Text` is
   *   the bare number, which takes precedence over the rendered children, so a
   *   screen reader says "1", not "one full stop".
   * - **Never move the word.** It is nested inside the index's existing
   *   right-aligned box rather than added beside it, so "1." (about 12dp) still
   *   fits the box's `minWidth` and the word after it does not shift at all.
   */
  indexDot: {
    color: semantic.text.accent,
  },
  compactIndex: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.caption,
    minWidth: spacing.lg,
    textAlign: 'right',
  },
  // The typed word is Geist Mono (Seed Phrase Rule) — a seed word must be
  // readable character by character, exactly like a displayed one.
  compactInput: {
    flex: 1,
    height: '100%',
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.mono,
    fontSize: fontSize.body,
    padding: 0,
  },
  input: {
    width: '100%',
    minHeight: componentSizes.inputHeight,
    paddingVertical: spacing.xs,
    backgroundColor: semantic.input.ground,
    borderWidth: borderWidth.thin,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.lg,
    color: semantic.text.primary,
    // Seed Phrase Rule: the typed word renders in the mono face.
    fontFamily: fontFamilyNative.mono,
    fontSize: fontSize.bodyLg,
  },
});
