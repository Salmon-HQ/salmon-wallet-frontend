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
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { styled } from '../../utils/styled';
import {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  letterSpacing,
  useAccountsContext,
  validatePassword,
  opacity,
} from '@salmon/shared';
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
  fontSize: fontSize.sm,
  textTransform: 'uppercase',
  letterSpacing: letterSpacing.wider,
  marginBottom: spacing.md,
});

const InputGroup = styled(Box)({
  marginBottom: spacing.md,
});

const SubmitButton = styled(Button)({
  backgroundColor: colors.accent.primary,
  color: colors.text.primary,
  fontWeight: fontWeight.semibold,
  textTransform: 'none',
  borderRadius: borderRadius.md,
  padding: `${spacing.md}px`,
  marginTop: spacing.md,
  '&:hover': {
    backgroundColor: colors.accent.primary,
    opacity: opacity.soft,
  },
  '&.Mui-disabled': {
    backgroundColor: colors.interactive.hoverStrong,
    color: colors.text.disabled,
  },
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
              <Box sx={{ marginTop: spacing.xs }}>
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

          {error && (
            <Alert
              severity="error"
              sx={{
                marginBottom: spacing.md,
                backgroundColor: colors.status.errorBackground,
                color: colors.status.error,
              }}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              severity="success"
              sx={{
                marginBottom: spacing.md,
                backgroundColor: colors.status.successBackground,
                color: colors.status.success,
              }}
            >
              {success}
            </Alert>
          )}

          <SubmitButton
            fullWidth
            variant="contained"
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            data-testid="security-change-password-button"
          >
            {t('settings.security.change_password_button')}
          </SubmitButton>
        </Section>
      </Box>
    </SettingsPanelContent>
  );
}
