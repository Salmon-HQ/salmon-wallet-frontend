/**
 * InputAddress Component
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * A text input for entering and validating blockchain addresses.
 *
 * Features:
 * - Address validation with debounce
 * - Visual feedback for validation states (loading, valid, invalid, warning)
 * - Domain name support with resolved address display
 * - Paste from clipboard support (web navigator.clipboard API)
 * - Accessible and customizable
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import {
  colors,
  spacing,
  borderRadius,
  borderWidth,
  fontFamily,
  fontWeight,
  useAddressValidation,
  useAccountsContext,
  fontSize,
  lineHeight,
  opacity,
  componentSizes,
  duration,
  durationMs,
  easing,
} from '@salmon/shared';
import type { InputAddressProps } from './types';
import type { ValidationState } from '@salmon/shared';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  width: '100%',
});

const Label = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  marginBottom: spacing.sm,
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
});

const InputWrapper = styled(Box)<{
  $borderColor: string;
  $isDisabled?: boolean;
}>(({ $borderColor, $isDisabled }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.lg,
  border: `${borderWidth.thin}px solid ${$borderColor}`,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  minHeight: componentSizes.inputHeight,
  transition: `border-color ${duration.normal} ${easing.ease}`,
  opacity: $isDisabled ? colors.button.disabledOpacity : 1,
}));

const StyledInput = styled(InputBase)<{
  $inputDisabled?: boolean;
}>(({ $inputDisabled }) => ({
  flex: 1,
  color: $inputDisabled ? colors.text.tertiary : colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  '& .MuiInputBase-input': {
    padding: `${spacing.md}px 0`,
    '&::placeholder': {
      color: colors.text.tertiary,
      opacity: opacity.full,
    },
  },
}));

const ValidationIcon = styled(Box)({
  marginLeft: spacing.md,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const ValidText = styled('span')({
  color: colors.status.success,
  fontSize: fontSize.lg,
  lineHeight: lineHeight.none,
});

const InvalidText = styled('span')({
  color: colors.status.error,
  fontSize: fontSize.lg,
  lineHeight: lineHeight.none,
});

const WarningText = styled('span')({
  color: colors.status.warning,
  fontSize: fontSize.lg,
  lineHeight: lineHeight.none,
});

const MessageContainer = styled(Box)({
  marginTop: spacing.sm,
});

const MessageText = styled(Typography)<{
  $messageType?: 'error' | 'warning' | null;
}>(({ $messageType }) => ({
  fontSize: fontSize.sm,
  lineHeight: `${fontSize.sm * lineHeight.normal}px`,
  fontFamily: fontFamily.sans,
  color:
    $messageType === 'error'
      ? colors.status.error
      : $messageType === 'warning'
        ? colors.status.warning
        : colors.text.secondary,
}));

const DomainInfo = styled(Box)({
  marginTop: spacing.sm,
  padding: spacing.md,
  backgroundColor: colors.input.background,
  borderRadius: borderRadius.md,
});

const DomainLabel = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  marginBottom: spacing.xs,
});

const DomainValue = styled(Typography)({
  fontSize: fontSize.sm,
  color: colors.text.primary,
  fontFamily: fontFamily.mono,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// ============================================================================
// Helper Components
// ============================================================================

interface ValidationIndicatorProps {
  state: ValidationState;
}

/**
 * Renders the validation state indicator (spinner, checkmark, or X)
 */
function ValidationIndicator({ state }: ValidationIndicatorProps) {
  switch (state) {
    case 'loading':
      return (
        <ValidationIcon data-testid="input-address-loading">
          <CircularProgress size={20} sx={{ color: colors.palette.indigo }} />
        </ValidationIcon>
      );
    case 'valid':
      return (
        <ValidationIcon data-testid="input-address-valid">
          <ValidText>{'\u2713'}</ValidText>
        </ValidationIcon>
      );
    case 'invalid':
      return (
        <ValidationIcon data-testid="input-address-invalid">
          <InvalidText>{'\u2715'}</InvalidText>
        </ValidationIcon>
      );
    case 'warning':
      return (
        <ValidationIcon data-testid="input-address-warning">
          <WarningText>{'\u26A0'}</WarningText>
        </ValidationIcon>
      );
    default:
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * InputAddress Component (Web)
 *
 * A specialized text input for entering blockchain addresses with built-in validation.
 * Supports Solana addresses and domain names (.sol, etc.)
 *
 * @example
 * ```tsx
 * const [address, setAddress] = useState('');
 *
 * <InputAddress
 *   address={address}
 *   onChange={setAddress}
 *   onValidation={(result) => {
 *     if (result.isValid) {
 *       console.log('Valid address:', result.resolvedAddress || address);
 *     }
 *   }}
 *   placeholder="Enter recipient address"
 * />
 * ```
 */
export function InputAddress({
  address,
  onChange,
  onValidation,
  placeholder,
  label,
  disabled = false,
  errorMessage,
  testID = 'input-address',
  className,
  style,
}: InputAddressProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [state] = useAccountsContext();
  const { activeBlockchainAccount } = state;

  // Use validation hook — account owns its own connection/provider
  const { validationState, isValidating, message, messageType, resolvedAddress, isDomain } =
    useAddressValidation(address, activeBlockchainAccount, {
      debounceMs: durationMs.debounce,
      onValidation,
    });

  // Handle text change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Determine border color based on validation state
  const getBorderColor = (): string => {
    if (errorMessage) return colors.status.error;
    if (isFocused) return colors.accent.primary;

    switch (validationState) {
      case 'valid':
        return colors.status.success;
      case 'invalid':
        return colors.status.error;
      case 'warning':
        return colors.status.warning;
      default:
        return colors.input.border;
    }
  };

  // Determine message to display
  const displayMessage = errorMessage || message;
  const displayMessageType = errorMessage ? 'error' : messageType;

  return (
    <Container data-testid={testID} className={className} style={style}>
      {/* Label */}
      {label && <Label data-testid={`${testID}-label`}>{label}</Label>}

      {/* Input Container */}
      <InputWrapper $borderColor={getBorderColor()} $isDisabled={disabled}>
        <StyledInput
          value={address}
          onChange={handleChange}
          placeholder={placeholder ?? t('send.enter_address_or_domain')}
          disabled={disabled || isValidating}
          $inputDisabled={disabled}
          autoComplete="off"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          inputProps={{
            'data-testid': `${testID}-input`,
            spellCheck: false,
            autoCapitalize: 'none',
            autoCorrect: 'off',
            style: { textTransform: 'none' },
          }}
          fullWidth
        />

        {/* Validation Indicator */}
        {address.length > 0 && <ValidationIndicator state={validationState} />}
      </InputWrapper>

      {/* Validation Message */}
      {displayMessage && (
        <MessageContainer data-testid={`${testID}-message`}>
          <MessageText $messageType={displayMessageType}>{t(displayMessage)}</MessageText>
        </MessageContainer>
      )}

      {/* Domain Resolution Info */}
      {isDomain && resolvedAddress && (
        <DomainInfo data-testid={`${testID}-domain-info`}>
          <DomainLabel>{t('send.resolved_address')}</DomainLabel>
          <DomainValue title={resolvedAddress}>{resolvedAddress}</DomainValue>
        </DomainInfo>
      )}
    </Container>
  );
}
