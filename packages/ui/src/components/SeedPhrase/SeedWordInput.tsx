/**
 * SeedWordInput — one word of the phrase, typed, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SeedPhrase/SeedWordInput.tsx`:
 * `input.ground` fill, `input.edge` stroke that turns `status.success` /
 * `status.danger` as the word is checked, `text.primary` mono value,
 * `input.placeholder` placeholder, `text.tertiary` index with its period in
 * `text.accent`. Every ink is read off the live mode.
 */
import styled from '@emotion/styled';
import {
  borderWidth,
  componentSizes,
  duration,
  easing,
  fontFamily,
  fontSize,
  fontWeight,
  opacity,
  spacing,
} from '@salmon/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { FIELD_SHELL_CLASS, FIELD_SHELL_ERROR_CLASS, focusRingNone } from '../../theme';
import type { SeedWordInputProps, ValidationState } from './types';

/**
 * The typed word is Geist Mono (Seed Phrase Rule) — a seed word must be
 * readable character by character, exactly like a displayed one. Bare flex
 * child: the box around it owns the border and the radius.
 */
const Field = styled('input')<{ $ink: string; $placeholder: string; $size: number }>(
  ({ $ink, $placeholder, $size }) => ({
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    ...focusRingNone,
    background: 'transparent',
    padding: 0,
    color: $ink,
    fontFamily: fontFamily.mono,
    fontSize: $size,
    '&::placeholder': {
      color: $placeholder,
      opacity: opacity.full,
    },
  })
);

/**
 * Everything that has to be off for a BIP-39 word.
 *
 * Autocorrect, autocapitalisation, spellcheck and the browser's own password
 * manager each silently turn a valid word into an invalid mnemonic, and the
 * user cannot see why — the box looks right. `autoComplete: 'off'` plus a
 * `name` the managers do not recognise keeps them from offering to remember
 * what was typed here.
 *
 * There is no DOM equivalent of the mobile `useSecretScreen` capture block;
 * a browser cannot stop a screenshot, and nothing here pretends otherwise.
 */
const secretInputProps = {
  autoCapitalize: 'none',
  autoCorrect: 'off',
  autoComplete: 'off',
  spellCheck: false,
  'data-1p-ignore': true,
  'data-lpignore': 'true',
} as const;

export function SeedWordInput({
  position,
  value,
  onChangeText: onChangeTextRaw,
  validationState = 'idle',
  autoFocus,
  onSubmitEditing,
  compact = false,
  dense = false,
  inputRef,
  onKeyDown: onKeyDownProp,
  onPasteText,
  testID,
}: SeedWordInputProps) {
  const { t } = useTranslation();
  const { input, status, text } = useSemantic();

  const edgeFor = (state: ValidationState): string =>
    state === 'correct' ? status.success : state === 'incorrect' ? status.danger : input.edge;
  const edge = edgeFor(validationState);
  // The box owns the field's shape, so focus is the shared rule's to answer;
  // a word already judged keeps the edge its verdict painted.
  const shellClass = [
    FIELD_SHELL_CLASS,
    validationState !== 'idle' ? FIELD_SHELL_ERROR_CLASS : null,
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * BIP-39 words are lowercase, and a capitalised one is an invalid mnemonic
   * the user cannot see the fault in — the box looks right. The attributes
   * above turn autocapitalisation off, but a mobile keyboard may still force a
   * capital through and a paste carries whatever it carried, so the value is
   * normalised regardless. Done here rather than per caller because every
   * caller wants it, and done on input rather than at validation time so the
   * user sees what will actually be checked.
   */
  const onChangeText = useCallback(
    (next: string) => onChangeTextRaw(next.toLowerCase()),
    [onChangeTextRaw]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSubmitEditing) {
        onSubmitEditing();
      }
      onKeyDownProp?.(e);
    },
    [onKeyDownProp, onSubmitEditing]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (!onPasteText) return;
      // Taken before the browser inserts it, so a whole phrase never lands in
      // one box first and then gets redistributed — which would flash the
      // phrase into a single field.
      const pasted = e.clipboardData.getData('text');
      if (!pasted) return;
      e.preventDefault();
      onPasteText(pasted);
    },
    [onPasteText]
  );

  if (compact) {
    /**
     * One box of the twelve- or twenty-four-word grid: the index, then the
     * word. The whole box is the click target, so tapping the number focuses
     * the field — a 44px row whose left third did nothing would be the
     * most-missed target on the screen.
     */
    return (
      <div
        data-testid={`${testID}-box`}
        className={shellClass}
        style={{
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          width: '100%',
          height: dense ? componentSizes.buttonHeightCompact : componentSizes.buttonHeightSmall,
          backgroundColor: input.ground,
          border: `${borderWidth.thin}px solid ${edge}`,
          borderRadius: componentSizes.inputRadius,
          paddingLeft: dense ? spacing.xs : spacing.sm,
          paddingRight: dense ? spacing.xs : spacing.sm,
          gap: dense ? spacing.xxs : spacing.xs,
          transition: `border-color ${duration.normal} ${easing.ease}`,
        }}
      >
        <span
          aria-label={String(position)}
          style={{
            color: text.tertiary,
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.medium,
            fontSize: fontSize.sm,
            minWidth: spacing.lg,
            textAlign: 'right',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {position}
          {/*
            The index's period, in the brand salmon. Decoration only (product,
            2026-08-18), mirroring the React Native implementation exactly.
            Three things it must never do, on a screen where a stray character
            is a wrong seed: never reach the value (it is markup, not content);
            never be announced (`aria-hidden`, and the bare number is the
            index's own `aria-label`); never move the word (nested inside the
            index's right-aligned box, so "1." still fits its `minWidth`).
          */}
          <span aria-hidden="true" style={{ color: text.accent }}>
            .
          </span>
        </span>
        <Field
          $ink={text.primary}
          $placeholder={input.placeholder}
          $size={fontSize.base}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoFocus={autoFocus}
          ref={inputRef}
          {...secretInputProps}
          aria-label={t('wallet.create.word_number', { position })}
          data-testid={testID}
        />
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <span
        style={{
          display: 'block',
          color: text.secondary,
          fontFamily: fontFamily.sans,
          fontWeight: fontWeight.medium,
          fontSize: fontSize.sm,
          marginBottom: spacing.xs,
        }}
      >
        {t('wallet.create.word_number', { position })}
      </span>
      <div
        className={shellClass}
        style={{
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          width: '100%',
          height: componentSizes.inputHeight,
          backgroundColor: input.ground,
          border: `${borderWidth.thin}px solid ${edge}`,
          borderRadius: componentSizes.inputRadius,
          paddingLeft: spacing.lg,
          paddingRight: spacing.lg,
          transition: `border-color ${duration.normal} ${easing.ease}`,
        }}
      >
        <Field
          $ink={text.primary}
          $placeholder={input.placeholder}
          $size={fontSize.bodyLg}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={t('wallet.create.enter_word_number', { position })}
          autoFocus={autoFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          ref={inputRef}
          {...secretInputProps}
          data-testid={testID}
        />
      </div>
    </div>
  );
}
