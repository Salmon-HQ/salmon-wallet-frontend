/**
 * ConfirmSheet - Generic confirmation bottom sheet for destructive/sensitive actions
 *
 * Mobile equivalent of the web ConfirmDialog. Supports danger styling,
 * optional password verification, and loading states.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, fontFamilyNative, vs } from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button/PrimaryButton';
import { SecondaryButton } from '../Button/SecondaryButton';
import { PasswordInput } from '../PasswordInput';

// ============================================================================
// Types
// ============================================================================

export interface ConfirmSheetProps {
  /** Controls sheet visibility */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Sheet title */
  title: string;
  /** Description of the action to confirm */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether this is a destructive action (red confirm button) */
  isDanger?: boolean;
  /** Whether to require password confirmation */
  requirePassword?: boolean;
  /** Password validation function */
  validatePassword?: (password: string) => Promise<boolean>;
  /** Async callback when user confirms */
  onConfirm: () => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  requirePassword = false,
  validatePassword,
  onConfirm,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  const { compactContentBottomPadding } = useBottomSheetChrome();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setPassword('');
      setPasswordError(undefined);
      setLoading(false);
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (loading) return;

    // Validate password if required
    if (requirePassword && validatePassword) {
      if (!password) {
        setPasswordError(t('errors.password_required', 'Password is required'));
        return;
      }

      setLoading(true);
      try {
        const isValid = await validatePassword(password);
        if (!isValid) {
          setPasswordError(t('errors.invalid_password', 'Invalid password'));
          setLoading(false);
          return;
        }
      } catch {
        setPasswordError(t('errors.password_check_failed', 'Failed to verify password'));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Confirm action failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, requirePassword, validatePassword, password, t, onConfirm, onClose]);

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (passwordError) {
        setPasswordError(undefined);
      }
    },
    [passwordError]
  );

  const canConfirm = !requirePassword || password.length > 0;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={<Text style={styles.title}>{title}</Text>}
      style={styles.sheet}
    >
      <View style={[styles.content, { paddingBottom: compactContentBottomPadding }]}>
        <Text style={styles.message}>{message}</Text>

        {requirePassword && (
          <View style={styles.passwordSection}>
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder={t('general.password', 'Password')}
              error={passwordError}
              editable={!loading}
              autoFocus
              onSubmitEditing={handleConfirm}
            />
          </View>
        )}

        <View style={styles.actions}>
          <SecondaryButton onPress={onClose} disabled={loading}>
            {cancelText || t('actions.cancel', 'Cancel')}
          </SecondaryButton>
          <PrimaryButton
            onPress={handleConfirm}
            disabled={!canConfirm}
            loading={loading}
            style={isDanger ? styles.dangerButton : undefined}
          >
            {confirmText || t('actions.confirm', 'Confirm')}
          </PrimaryButton>
        </View>
      </View>
    </BottomSheetContainer>
  );
}

export default ConfirmSheet;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  sheet: {
    minHeight: undefined,
    maxHeight: undefined,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  message: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: vs(spacing.lg),
  },
  passwordSection: {
    marginBottom: vs(spacing.lg),
  },
  actions: {
    gap: vs(spacing.sm),
  },
  dangerButton: {
    backgroundColor: colors.status.error,
  },
});
