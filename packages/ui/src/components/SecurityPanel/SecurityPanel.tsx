/**
 * SecurityPanel - Security settings
 *
 * Features:
 * - Change password with current/new/confirm inputs
 * - Password strength indicator
 * - No biometric toggle (not supported in browser extensions)
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { styled } from '../../utils/styled';
import {
  colors,
  semantic,
  spacing,
  fontSize,
  fontWeight,
  letterSpacing,
  useAccountsContext,
  validatePassword,
} from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { SettingsPanelContent } from '../SettingsPanelContent';
import { PasswordInput } from '../PasswordInput';
import { PasswordStrengthBar } from '../PasswordInput/PasswordStrengthBar';
import type { SecurityPanelProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const Section = styled(Box)({
  marginBottom: spacing.xl,
});

const SectionTitle = styled(Typography)({
  color: colors.text.secondary,
  fontWeight: fontWeight.semibold,
  fontSize: fontSize.label,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.label,
  marginBottom: spacing.md,
});

const InputGroup = styled(Box)({
  marginBottom: spacing.md,
});

// ============================================================================
// Component
// ============================================================================

export function SecurityPanel({
  onBack,
  onPasswordChanged,
}: SecurityPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [, accountActions] = useAccountsContext();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleChangePassword = useCallback(async () => {
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('settings.security.password_mismatch'));
      return;
    }

    if (!passwordValidation.isValid) {
      return;
    }

    setLoading(true);
    try {
      const result = await accountActions.changePassword(currentPassword, newPassword);
      if (result) {
        await onPasswordChanged?.();
        setSuccess(t('settings.security.password_changed'));
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
    passwordValidation.isValid,
    accountActions,
    onPasswordChanged,
    t,
  ]);

  return (
    <SettingsPanelContent title={t('settings.security.title')} onBack={onBack}>
      <Box sx={{ padding: `0 ${spacing.lg}px` }}>
        <Section>
          <SectionTitle>{t('settings.security.change_password')}</SectionTitle>

          <InputGroup>
            <PasswordInput
              value={currentPassword}
              onChangeText={(text: string) => {
                setCurrentPassword(text);
                if (error) setError('');
                if (success) setSuccess('');
              }}
              placeholder={t('settings.security.current_password')}
              testID="security-current-password-input"
            />
          </InputGroup>

          <InputGroup>
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t('settings.security.new_password')}
              testID="security-new-password-input"
            />
            {newPassword.length > 0 && (
              <Box
                sx={{
                  marginTop: `${spacing.sm}px`,
                  paddingLeft: `${spacing.xs}px`,
                  paddingRight: `${spacing.xs}px`,
                }}
              >
                <PasswordStrengthBar strength={passwordValidation.strength} />
              </Box>
            )}
          </InputGroup>

          <InputGroup>
            <PasswordInput
              value={confirmPassword}
              onChangeText={(text: string) => {
                setConfirmPassword(text);
                if (error) setError('');
              }}
              placeholder={t('settings.security.confirm_password')}
              testID="security-confirm-password-input"
            />
          </InputGroup>

          {/* Both messages announce politely. An inline validation error and a
              password-changed confirmation are status, not emergency, so
              neither interrupts a screen reader mid-sentence — MUI's Alert
              would otherwise default to the assertive `role="alert"`
              (PRODUCT.md: WCAG 2.2 AA at full scope). */}
          {error && (
            <Alert
              severity="error"
              role="status"
              sx={{
                marginBottom: spacing.md,
                backgroundColor: semantic.status.dangerTint,
                color: semantic.status.danger,
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              role="status"
              sx={{
                marginBottom: spacing.md,
                backgroundColor: semantic.status.successTint,
                color: semantic.status.success,
              }}
            >
              {success}
            </Alert>
          )}

          {/* The one committing action on the panel, on the system's own
              primary button (DESIGN.md §Components/Buttons) — the salmon is
              never dimmed, only absent, and the disabled fill is
              `surface.crest`. */}
          <PrimaryButton
            fullWidth
            onPress={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            testID="security-change-password-button"
            style={{ marginTop: spacing.md }}
          >
            {t('settings.security.change_password_button')}
          </PrimaryButton>
        </Section>
      </Box>
    </SettingsPanelContent>
  );
}
