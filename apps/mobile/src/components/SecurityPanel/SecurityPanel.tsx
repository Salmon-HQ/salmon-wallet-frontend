/**
 * SecurityPanel - Security settings screen for mobile
 *
 * Features:
 * - Change password section with current/new/confirm inputs
 * - Password strength indicator
 * - Biometric toggle (if available and enrolled)
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontFamilyNative,
  useAccountsContext,
  validatePassword,
  getPasswordIssue,
  PASSWORD_CONSTRAINTS,
  letterSpacing,
  semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PasswordInput, PasswordStrengthBar } from '../PasswordInput';
import { PrimaryButton } from '../Button';
import type { SecurityPanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function SecurityPanel({
  onBack,
  isBiometricAvailable,
  isBiometricEnabled,
  onToggleBiometric,
  onPasswordChanged,
}: SecurityPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [, accountActions] = useAccountsContext();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleChangePassword = useCallback(async () => {
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError(t('settings.security.password_mismatch'));
      return;
    }

    const passwordIssue = getPasswordIssue(passwordValidation);
    if (passwordIssue) {
      setError(
        passwordIssue === 'too_short'
          ? t('wallet.create.password_too_short', { min: PASSWORD_CONSTRAINTS.MIN_LENGTH })
          : passwordIssue === 'too_long'
            ? t('wallet.create.password_too_long', { max: PASSWORD_CONSTRAINTS.MAX_LENGTH })
            : t('wallet.create.password_too_weak')
      );
      return;
    }

    setLoading(true);
    try {
      const changed = await accountActions.changePassword(currentPassword, newPassword);
      if (changed) {
        await onPasswordChanged?.();
        // Quiet confirmation: an inline announced line in the feedback slot,
        // matching how errors surface here, instead of a modal alert.
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(t('settings.security.wrong_password'));
      }
    } catch {
      setError(t('settings.security.wrong_password'));
    } finally {
      setLoading(false);
    }
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    passwordValidation,
    accountActions,
    onPasswordChanged,
    t,
  ]);

  return (
    <SettingsScreenLayout title={t('settings.security.title')} onBack={onBack}>
      {/* Change Password Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.security.change_password')}</Text>

        <View style={styles.inputGroup}>
          <PasswordInput
            value={currentPassword}
            onChangeText={(text: string) => {
              setCurrentPassword(text);
              if (error) setError('');
              if (success) setSuccess(false);
            }}
            placeholder={t('settings.security.current_password')}
            testID="security-current-password-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <PasswordInput
            value={newPassword}
            onChangeText={(text: string) => {
              setNewPassword(text);
              if (success) setSuccess(false);
            }}
            placeholder={t('settings.security.new_password')}
            testID="security-new-password-input"
          />
          {newPassword.length > 0 && (
            <View style={styles.strengthContainer}>
              <PasswordStrengthBar strength={passwordValidation.strength} />
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <PasswordInput
            value={confirmPassword}
            onChangeText={(text: string) => {
              setConfirmPassword(text);
              if (error) setError('');
              if (success) setSuccess(false);
            }}
            placeholder={t('settings.security.confirm_password')}
            testID="security-confirm-password-input"
          />
        </View>

        {error ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite" testID="security-error">
            {error}
          </Text>
        ) : success ? (
          <Text
            style={styles.successText}
            accessibilityLiveRegion="polite"
            testID="security-success"
          >
            {t('settings.security.password_changed')}
          </Text>
        ) : null}

        <View style={styles.buttonContainer}>
          <PrimaryButton
            onPress={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            testID="security-change-password-button"
          >
            {t('settings.security.change_password_button')}
          </PrimaryButton>
        </View>
      </View>

      {/* Biometric Section */}
      {isBiometricAvailable && (
        <View style={styles.section}>
          <View style={styles.biometricRow}>
            <View style={styles.biometricInfo}>
              <Text style={styles.biometricTitle}>{t('settings.security.biometric_unlock')}</Text>
              <Text style={styles.biometricDescription}>
                {t('settings.security.biometric_description')}
              </Text>
            </View>
            <Switch
              testID="security-biometric-toggle"
              value={isBiometricEnabled}
              onValueChange={onToggleBiometric}
              // Off-track on `border.default`: the card token vanished against
              // the row's own card ground, leaving the off state invisible.
              trackColor={{ false: semantic.border.default, true: semantic.accent.ink }}
              thumbColor={semantic.text.primary}
            />
          </View>
        </View>
      )}
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  // The `label` role: 10/600/uppercase/+0.3px, as the other on-system
  // surfaces render section labels.
  sectionTitle: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.semiBold,
    fontSize: fontSize.label,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  strengthContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  successText: {
    color: semantic.status.success,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.r3,
    padding: spacing.lg,
  },
  biometricInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  biometricTitle: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
    marginBottom: spacing.xxs,
  },
  biometricDescription: {
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.caption,
  },
});
