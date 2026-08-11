import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  colors,
  fontSize,
  letterSpacing,
  spacing,
  borderRadius,
  borderWidth,
  componentSizes,
  ms,
  vs,
  s,
  fontFamilyNative,
  useAddressValidation,
  useAccountsContext,
} from '@salmon/shared';
import type { RecipientAddressInputProps } from './types';

/**
 * RecipientAddressInput - Input field for bridge recipient address
 * Displays the destination address with validation feedback.
 * Integrates useAddressValidation for debounced address validation.
 */
export const RecipientAddressInput: React.FC<RecipientAddressInputProps> = ({
  value,
  onChangeValue,
  targetChain,
  label,
  placeholder,
  style,
  error,
  onValidation,
}) => {
  const { t } = useTranslation();
  const [state] = useAccountsContext();
  const { activeBlockchainAccount } = state;

  // Address validation hook — account owns its own connection/provider
  const {
    validationState,
    isValidating,
    message: validationMessage,
  } = useAddressValidation(value, activeBlockchainAccount, {
    debounceMs: 500,
    onValidation: onValidation
      ? (result) => onValidation({ isValid: result.isValid, message: null })
      : undefined,
  });

  const handleChangeText = useCallback(
    (text: string) => {
      // Trim whitespace but allow the user to paste addresses
      const trimmed = text.trim();
      onChangeValue(trimmed);
    },
    [onChangeValue]
  );

  // Determine which error/message to show (external error takes precedence)
  const displayMessage = error || validationMessage;
  const hasError = !!error || validationState === 'invalid';
  const hasWarning = !error && validationState === 'warning';
  const hasValue = value.length > 0;

  // Input container border style based on validation state
  const inputContainerStyle = useMemo(() => {
    if (hasError) return styles.inputContainerError;
    if (hasWarning) return styles.inputContainerWarning;
    if (hasValue && validationState === 'valid') return styles.inputContainerValid;
    return undefined;
  }, [hasError, hasWarning, hasValue, validationState]);

  return (
    <View style={[styles.container, style]}>
      {/* Label with chain hint */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label ?? t('bridge.recipient.title')}</Text>
        {targetChain && (
          <Text style={styles.chainHint}>
            {t('bridge.recipient.chainAddressHint', { chain: targetChain.name })}
          </Text>
        )}
      </View>

      {/* Input */}
      <View style={[styles.inputContainer, inputContainerStyle]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? t('bridge.recipient.enterDestinationAddress')}
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={false}
        />
        {/* Validation indicator */}
        {hasValue && isValidating && (
          <ActivityIndicator
            size="small"
            color={colors.text.secondary}
            style={styles.validationIndicator}
          />
        )}
        {hasValue && !isValidating && validationState === 'valid' && (
          <Text style={[styles.validationIndicator, styles.validIcon]}>{'\u2713'}</Text>
        )}
        {hasValue && !isValidating && validationState === 'invalid' && (
          <Text style={[styles.validationIndicator, styles.invalidIcon]}>{'\u2715'}</Text>
        )}
        {hasValue && !isValidating && validationState === 'warning' && (
          <Text style={[styles.validationIndicator, styles.warningIcon]}>{'\u26A0'}</Text>
        )}
      </View>

      {/* Validation / Error Message */}
      {displayMessage && (
        <Text style={[
          styles.messageText,
          hasError && styles.errorText,
          hasWarning && styles.warningText,
        ]}>
          {t(displayMessage)}
        </Text>
      )}

      {/* Helper Text (only when no errors/warnings) */}
      {!displayMessage && targetChain && (
        <Text style={styles.helperText}>
          {t('bridge.recipient.helper', { chain: targetChain.name, symbol: targetChain.symbol })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: vs(spacing.sm),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xs),
  },
  label: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.bold,
    color: colors.text.primary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(18),
  },
  chainHint: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(16),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: borderWidth.tokenListItem,
    borderColor: colors.border.default,
    borderRadius: borderRadius.md,
    minHeight: vs(componentSizes.inputHeightLg),
    paddingHorizontal: s(spacing.md),
    paddingVertical: vs(spacing.sm),
  },
  inputContainerError: {
    borderColor: colors.status.error,
  },
  inputContainerWarning: {
    borderColor: colors.status.warning,
  },
  inputContainerValid: {
    borderColor: colors.status.success,
  },
  input: {
    flex: 1,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  validationIndicator: {
    marginLeft: s(spacing.sm),
  },
  validIcon: {
    fontSize: ms(fontSize.lg),
    color: colors.status.success,
  },
  invalidIcon: {
    fontSize: ms(fontSize.lg),
    color: colors.status.error,
  },
  warningIcon: {
    fontSize: ms(fontSize.lg),
    color: colors.status.warning,
  },
  messageText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(16),
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.status.error,
  },
  warningText: {
    color: colors.status.warning,
  },
  helperText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.regular,
    color: colors.text.secondary,
    letterSpacing: letterSpacing.normal,
    lineHeight: ms(16),
  },
});

export default RecipientAddressInput;
