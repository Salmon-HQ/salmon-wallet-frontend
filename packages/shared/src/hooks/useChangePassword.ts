/**
 * The Security panel's change-password form, on both platforms: the three
 * fields, the mismatch/strength checks, the attempt, and the one line of
 * feedback (an error, or the quiet success).
 *
 * `changePassword` is injected — the accounts context's own action; this
 * hook never touches the vault. The strength rules are `validatePassword`'s.
 */
import { useCallback, useState } from 'react';
import { PASSWORD_CONSTRAINTS, getPasswordIssue, validatePassword } from '../crypto/password';

export interface UseChangePasswordParams {
  changePassword: (current: string, next: string) => Promise<boolean>;
  /** Runs after a successful change, before the success line shows. */
  onPasswordChanged?: () => Promise<void> | void;
  t: (key: string, values?: Record<string, unknown>) => string;
}

export function useChangePassword({
  changePassword,
  onPasswordChanged,
  t,
}: UseChangePasswordParams) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const submit = useCallback(async () => {
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
      const changed = await changePassword(currentPassword, newPassword);
      if (changed) {
        await onPasswordChanged?.();
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
    changePassword,
    onPasswordChanged,
    t,
  ]);

  /** Typing into any field clears the last line of feedback — the rule every field had. */
  const field = (set: (v: string) => void) => (value: string) => {
    set(value);
    if (error) setError('');
    if (success) setSuccess(false);
  };

  return {
    currentPassword,
    newPassword,
    confirmPassword,
    setCurrentPassword: field(setCurrentPassword),
    setNewPassword: field(setNewPassword),
    setConfirmPassword: field(setConfirmPassword),
    passwordValidation,
    error,
    success,
    loading,
    canSubmit: !loading && !!currentPassword && !!newPassword && !!confirmPassword,
    submit,
  };
}
