/**
 * The password step of onboarding, on both platforms: the two fields, the
 * strength and match checks, the lines of feedback, and the opening of a
 * submit — verifying an existing password, then raising the wait.
 *
 * What happens after the wait is up (creating, importing or protecting the
 * wallet, and where to go next) is the platform's own, so `begin` stops there
 * and hands back whether to carry on. `checkPassword` is injected — the
 * accounts context's own action; this hook never touches the vault.
 */
import { useCallback, useState } from 'react';
import { PASSWORD_CONSTRAINTS, getPasswordIssue, validatePassword } from '../crypto/password';
import { YIELD_TO_PAINT_MS } from '../theme/durations';
import { passwordCheckErrorKey } from '../utils/unlock-throttle';

export interface UseSetupPasswordFormParams {
  /** One field that verifies the wallet's existing password, instead of setting a new one. */
  showSingleInput: boolean;
  /** Setting a first password on a wallet that has none. */
  protect: boolean;
  flowType: string;
  /** False while the platform has nothing to protect yet (no phrase loaded). */
  canSubmit?: boolean;
  checkPassword: (password: string) => Promise<boolean>;
  t: (key: string, values?: Record<string, unknown>) => string;
}

export function useSetupPasswordForm({
  showSingleInput,
  protect,
  flowType,
  canSubmit = true,
  checkPassword,
  t,
}: UseSetupPasswordFormParams) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongPassword, setWrongPassword] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid =
    canSubmit &&
    (showSingleInput ? password.length > 0 : passwordValidation.isValid && passwordsMatch);

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      setError(null);
      if (showSingleInput) setWrongPassword(false);
    },
    [showSingleInput]
  );

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    setError(null);
  }, []);

  /**
   * Opens a submit. Resolves false when there is nothing to carry on with: an
   * invalid form, or an existing password that did not verify. Resolves true
   * with the wait already raised and painted; the caller lowers it with
   * `setIsLoading(false)` when its own work ends.
   */
  const begin = useCallback(async (): Promise<boolean> => {
    if (!isFormValid) return false;

    if (showSingleInput) {
      setIsChecking(true);
      setError(null);
      try {
        if (!(await checkPassword(password))) {
          setWrongPassword(true);
          return false;
        }
      } catch (err) {
        console.error('Failed to check password:', err);
        setError(t(passwordCheckErrorKey(err, 'wallet.create.invalid_password')));
        return false;
      } finally {
        setIsChecking(false);
      }
    }

    setIsLoading(true);
    setError(null);
    // Yield to the UI thread so the wait renders before the heavy key derivation
    await new Promise((resolve) => setTimeout(resolve, YIELD_TO_PAINT_MS));
    return true;
  }, [checkPassword, isFormValid, password, showSingleInput, t]);

  const passwordIssue =
    !showSingleInput && password.length > 0 ? getPasswordIssue(passwordValidation) : null;
  const passwordError =
    passwordIssue === 'too_short'
      ? t('wallet.create.password_too_short', { min: PASSWORD_CONSTRAINTS.MIN_LENGTH })
      : passwordIssue === 'too_long'
        ? t('wallet.create.password_too_long', { max: PASSWORD_CONSTRAINTS.MAX_LENGTH })
        : passwordIssue === 'too_weak'
          ? t('wallet.create.password_too_weak')
          : wrongPassword
            ? t('wallet.create.invalid_password') || 'Invalid Password'
            : undefined;

  const confirmError =
    !showSingleInput &&
    confirmPassword.length > 0 &&
    password.length >= PASSWORD_CONSTRAINTS.MIN_LENGTH &&
    !passwordsMatch
      ? t('wallet.create.passwords_dont_match') || 'Passwords do not match'
      : undefined;

  const buttonText = isChecking
    ? t('wallet.create.passwordChecking') || 'Checking...'
    : protect
      ? t('wallet.protect.button')
      : flowType === 'create'
        ? t('wallet.create_wallet') || 'CREATE WALLET'
        : t('wallet.recover_wallet') || 'RECOVER ACCOUNT';

  return {
    password,
    confirmPassword,
    passwordValidation,
    isLoading,
    setIsLoading,
    isChecking,
    error,
    setError,
    isFormValid,
    /** The submit control stays off until the form is valid and a refused password is retyped. */
    submitDisabled: !isFormValid || wrongPassword,
    handlePasswordChange,
    handleConfirmPasswordChange,
    begin,
    passwordError,
    confirmError,
    buttonText,
  };
}
