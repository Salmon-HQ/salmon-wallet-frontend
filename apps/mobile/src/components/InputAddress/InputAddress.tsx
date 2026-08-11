/**
 * InputAddress Component
 * A text input for entering and validating blockchain addresses
 *
 * Migrated from salmon-wallet-v2/src/features/InputAddress/InputAddress.js
 *
 * Features:
 * - Address validation with debounce
 * - Visual feedback for validation states (loading, valid, invalid, warning)
 * - Domain name support with resolved address display
 * - Accessible and customizable
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { borderWidth, colors, useAddressValidation, useAccountsContext, type ValidationState, spacing, borderRadius, fontSize, fontWeight, fontFamilyNative, } from '@salmon/shared';
import type { InputAddressProps } from './types';

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
        <ActivityIndicator
          size="small"
          color={colors.palette.indigo}
          style={styles.validationIcon}
          testID="input-address-loading"
        />
      );
    case 'valid':
      return (
        <Text style={[styles.validationIcon, { color: colors.status.success, fontSize: 18 }]} testID="input-address-valid">
          {'\u2713'}
        </Text>
      );
    case 'invalid':
      return (
        <Text style={[styles.validationIcon, { color: colors.status.error, fontSize: 18 }]} testID="input-address-invalid">
          {'\u2715'}
        </Text>
      );
    case 'warning':
      return (
        <Text style={[styles.validationIcon, { color: colors.status.warning, fontSize: 18 }]} testID="input-address-warning">
          {'\u26A0'}
        </Text>
      );
    default:
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * InputAddress Component
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
  ...textInputProps
}: InputAddressProps) {
  const { t } = useTranslation();
  const [state] = useAccountsContext();
  const { activeBlockchainAccount } = state;

  // Use validation hook — account owns its own connection/provider
  const {
    validationState,
    isValidating,
    message,
    messageType,
    resolvedAddress,
    isDomain,
  } = useAddressValidation(address, activeBlockchainAccount, {
    debounceMs: 500,
    onValidation,
  });

  // Handle text change
  const handleChangeText = useCallback(
    (text: string) => {
      onChange(text);
    },
    [onChange]
  );

  // Determine container style based on validation state
  const getContainerStyle = (): ViewStyle[] => {
    const containerStyles: ViewStyle[] = [styles.inputContainer];

    if (disabled) {
      containerStyles.push(styles.inputContainerDisabled);
    }

    if (errorMessage) {
      containerStyles.push(styles.inputContainerInvalid);
      return containerStyles;
    }

    switch (validationState) {
      case 'valid':
        containerStyles.push(styles.inputContainerValid);
        break;
      case 'invalid':
        containerStyles.push(styles.inputContainerInvalid);
        break;
      case 'warning':
        containerStyles.push(styles.inputContainerWarning);
        break;
    }

    return containerStyles;
  };

  // Determine message to display
  const displayMessage = errorMessage || message;
  const displayMessageType = errorMessage ? 'error' : messageType;

  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      {label && (
        <Text style={styles.label} testID={`${testID}-label`}>
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View style={getContainerStyle()}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={address}
          onChangeText={handleChangeText}
          placeholder={placeholder ?? t('send.enter_address_or_domain')}
          placeholderTextColor={colors.text.tertiary}
          editable={!disabled && !isValidating}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          testID={`${testID}-input`}
          {...textInputProps}
        />

        {/* Validation Indicator */}
        {address.length > 0 && (
          <ValidationIndicator state={validationState} />
        )}
      </View>

      {/* Validation Message */}
      {displayMessage && (
        <View style={styles.messageContainer} testID={`${testID}-message`}>
          <Text
            style={[
              styles.message,
              displayMessageType === 'error' && styles.messageError,
              displayMessageType === 'warning' && styles.messageWarning,
            ]}
          >
            {t(displayMessage)}
          </Text>
        </View>
      )}

      {/* Domain Resolution Info */}
      {isDomain && resolvedAddress && (
        <View style={styles.domainInfo} testID={`${testID}-domain-info`}>
          <Text style={styles.domainLabel}>{t('send.resolved_address')}</Text>
          <Text style={styles.domainValue} numberOfLines={1} ellipsizeMode="middle">
            {resolvedAddress}
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: fontSize.base,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.scanner.background,
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.thin,
    borderColor: colors.input.border,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  inputContainerValid: {
    borderColor: colors.status.success,
  },
  inputContainerInvalid: {
    borderColor: colors.status.error,
  },
  inputContainerWarning: {
    borderColor: colors.status.warning,
  },
  inputContainerDisabled: {
    opacity: colors.button.disabledOpacity,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  inputDisabled: {
    color: colors.text.tertiary,
  },
  validationIcon: {
    marginLeft: spacing.md,
  },
  messageContainer: {
    marginTop: spacing.sm,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageError: {
    color: colors.status.error,
  },
  messageWarning: {
    color: colors.status.warning,
  },
  domainInfo: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.scanner.background,
    borderRadius: borderRadius.md,
  },
  domainLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  domainValue: {
    fontSize: 13,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
  },
});

export default InputAddress;
