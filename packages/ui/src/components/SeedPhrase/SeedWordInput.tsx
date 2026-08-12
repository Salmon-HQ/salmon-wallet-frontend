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
  fontFamily: fontFamily.sans,
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

function getBorderColor(state: ValidationState): string {
  switch (state) {
    case 'correct':
      return colors.status.success;
    case 'incorrect':
      return colors.status.error;
    default:
      return colors.input.border;
  }
}

export function SeedWordInput({
  position,
  value,
  onChangeText,
  validationState = 'idle',
  autoFocus,
  onSubmitEditing,
  testID,
}: SeedWordInputProps) {
  const { t } = useTranslation();
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSubmitEditing) {
        onSubmitEditing();
      }
    },
    [onSubmitEditing]
  );

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
        autoComplete="off"
        fullWidth
        inputProps={{
          autoCapitalize: 'none',
          autoCorrect: 'off',
          spellCheck: false,
          'data-testid': testID,
        }}
      />
    </Container>
  );
}
