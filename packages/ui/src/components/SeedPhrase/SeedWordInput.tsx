/**
 * SeedWordInput - Input for validating a specific mnemonic word
 *
 * Web version using MUI and @emotion/styled for browser extension.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  opacity,
  duration,
  easing,
  semantic,
} from '@salmon/shared';
import type { SeedWordInputProps, ValidationState } from './types';

const Container = styled(Box)({
  width: '100%',
});

const Label = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.sm,
  marginBottom: spacing.xs,
});

const StyledInput = styled(InputBase)<{ $borderColor: string }>(({ $borderColor }) => ({
  width: '100%',
  height: componentSizes.inputHeight,
  backgroundColor: colors.input.background,
  border: `${borderWidth.thin}px solid ${$borderColor}`,
  borderRadius: componentSizes.inputRadius,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  color: colors.text.primary,
  // Seed Phrase Rule: the typed word renders in the mono face.
  fontFamily: fontFamily.mono,
  fontSize: fontSize.md,
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '& .MuiInputBase-input': {
    padding: 0,
    '&::placeholder': {
      color: colors.text.tertiary,
      opacity: opacity.full,
    },
  },
}));

/**
 * One box of the twelve- or twenty-four-word grid: the index, then the word.
 *
 * The whole box is the click target, so tapping the number focuses the field
 * — a 44px row whose left third did nothing would be the most-missed target on
 * the screen.
 */
const CompactBox = styled(Box)<{ $borderColor: string; $dense: boolean }>(
  ({ $borderColor, $dense }) => ({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    height: $dense ? componentSizes.buttonHeightCompact : componentSizes.buttonHeightSmall,
    backgroundColor: colors.input.background,
    border: `${borderWidth.thin}px solid ${$borderColor}`,
    borderRadius: componentSizes.inputRadius,
    paddingLeft: $dense ? spacing.xs : spacing.sm,
    paddingRight: $dense ? spacing.xs : spacing.sm,
    gap: $dense ? spacing.xxs : spacing.xs,
    transition: `border-color ${duration.normal} ${easing.ease}`,
    boxSizing: 'border-box',
  })
);

const CompactIndex = styled(Typography<'span'>)({
  color: colors.text.tertiary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.medium,
  fontSize: fontSize.sm,
  minWidth: spacing.lg,
  textAlign: 'right',
  flexShrink: 0,
  userSelect: 'none',
});

/**
 * The index's period, in the brand salmon.
 *
 * Decoration only (product, 2026-08-18), mirroring the React Native
 * implementation exactly. Three things it must never do, on a screen where a
 * stray character is a wrong seed:
 *
 * - **Never reach the value.** It is markup, not content: it is not in `value`,
 *   never passes through `onChangeText`, and cannot survive into the mnemonic
 *   that gets validated or stored.
 * - **Never be announced.** `aria-hidden` on the period, and the bare number as
 *   the index's own `aria-label`, so a screen reader says "1", not
 *   "one full stop".
 * - **Never move the word.** It is nested inside the index's existing
 *   right-aligned box rather than added beside it, so "1." still fits the box's
 *   `minWidth` and the word after it does not shift at all.
 */
const IndexDot = styled('span')({
  color: semantic.text.accent,
});

// The typed word is Geist Mono (Seed Phrase Rule) — a seed word must be
// readable character by character, exactly like a displayed one.
const CompactInput = styled(InputBase)({
  flex: 1,
  minWidth: 0,
  height: '100%',
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
  fontSize: fontSize.base,
  '& .MuiInputBase-input': {
    padding: 0,
    '&::placeholder': {
      color: colors.text.tertiary,
      opacity: opacity.full,
    },
  },
});

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

function getBorderColor(state: ValidationState): string {
  switch (state) {
    case 'correct':
      return semantic.status.success;
    case 'incorrect':
      return semantic.status.danger;
    default:
      return colors.input.border;
  }
}

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
    (text: string) => onChangeTextRaw(text.toLowerCase()),
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
      const text = e.clipboardData.getData('text');
      if (!text) return;
      e.preventDefault();
      onPasteText(text);
    },
    [onPasteText]
  );

  if (compact) {
    return (
      <CompactBox
        $borderColor={getBorderColor(validationState)}
        $dense={dense}
        data-testid={`${testID}-box`}
      >
        <CompactIndex component="span" aria-label={String(position)}>
          {position}
          <IndexDot aria-hidden="true">.</IndexDot>
        </CompactIndex>
        <CompactInput
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          autoFocus={autoFocus}
          inputRef={inputRef}
          fullWidth
          inputProps={{
            ...secretInputProps,
            'aria-label': t('wallet.create.word_number', { position }),
            'data-testid': testID,
          }}
        />
      </CompactBox>
    );
  }

  return (
    <Container>
      <Label>{t('wallet.create.word_number', { position })}</Label>
      <StyledInput
        $borderColor={getBorderColor(validationState)}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder={t('wallet.create.enter_word_number', { position })}
        autoFocus={autoFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        inputRef={inputRef}
        fullWidth
        inputProps={{
          ...secretInputProps,
          'data-testid': testID,
        }}
      />
    </Container>
  );
}
