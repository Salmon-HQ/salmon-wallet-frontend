/**
 * PasswordInput - Secure text input with visibility toggle
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Provides a password field with show/hide toggle and optional error message.
 */
import { iconSize } from '../../icons';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import {
  colors,
  componentSizes,
  semantic,
  spacing,
  fontFamily,
  fontSize as fontSizeTokens,
  opacity,
  borderWidth,
  duration,
  easing,
} from '@salmon/shared';
import { focusRingNone, focusRingOnWrapper } from '../../theme';
import { EyeIcon, EyeOffIcon } from '../Icon';
import type { PasswordInputProps } from './types';

const Container = styled(Box)({
  width: '100%',
});

// This wrapper — not the InputBase inside it — is the field's visual
// boundary, so it is what carries the keyboard focus ring.
const InputWrapper = styled(Box)<{
  $borderColor: string;
}>(({ $borderColor }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: componentSizes.inputHeight,
  backgroundColor: colors.input.background,
  border: `${borderWidth.thin}px solid ${$borderColor}`,
  borderRadius: componentSizes.inputRadius,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  transition: `border-color ${duration.normal} ${easing.ease}`,
  '&:has(:focus-visible)': {
    ...focusRingOnWrapper,
    '& .MuiInputBase-root.MuiInputBase-root': focusRingNone,
  },
}));

// Bare flex child: no border, no radius. Ringing it is what drew the
// hard-cornered rectangle inside the rounded wrapper. InputWrapper rings it.
const StyledInput = styled(InputBase)({
  flex: 1,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSizeTokens.md,
  '& .MuiInputBase-input': {
    padding: 0,
    '&::placeholder': {
      color: colors.text.tertiary,
      opacity: opacity.full,
    },
  },
});

const ToggleButton = styled(IconButton)({
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: 'transparent',
  },
});

const ErrorText = styled(Typography)({
  color: semantic.status.danger,
  fontFamily: fontFamily.sans,
  fontSize: fontSizeTokens.xs,
  marginTop: spacing.xs,
  paddingLeft: spacing.xs,
  paddingRight: spacing.xs,
});

/**
 * PasswordInput component for secure text entry
 *
 * Features:
 * - Password visibility toggle (eye icon)
 * - Focus state with accent border color
 * - Error state with error border color and message
 * - Consistent styling with design tokens
 *
 * @example
 * ```tsx
 * <PasswordInput
 *   value={password}
 *   onChangeText={setPassword}
 *   placeholder="Enter your password"
 *   error={passwordError}
 *   autoFocus
 * />
 * ```
 */
export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  error,
  editable = true,
  autoFocus,
  onSubmitEditing,
  className,
  style,
  testID,
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return semantic.status.danger;
    if (isFocused) return colors.accent.primary;
    return colors.input.border;
  };

  const handleToggle = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSubmitEditing) {
        onSubmitEditing();
      }
    },
    [onSubmitEditing]
  );

  return (
    <Container className={className} style={style}>
      <InputWrapper $borderColor={getBorderColor()}>
        <StyledInput
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder ?? t('lock.password_placeholder')}
          disabled={!editable}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          fullWidth
          inputProps={{ 'data-testid': testID }}
        />
        <ToggleButton
          onClick={handleToggle}
          aria-label={showPassword ? t('general.hide_password') : t('general.show_password')}
          data-testid={testID ? `${testID}-toggle` : undefined}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOffIcon size={iconSize.lg} color={colors.text.secondary} />
          ) : (
            <EyeIcon size={iconSize.lg} color={colors.text.secondary} />
          )}
        </ToggleButton>
      </InputWrapper>
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
}
