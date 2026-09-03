/**
 * The confirm gate's state, on both platforms: an optional password that is
 * checked before the action runs, the error the field shows, and the loading
 * that spans the check and the action.
 *
 * `ConfirmSheet` (mobile) and `ConfirmDialog` (DOM) render it; neither owns
 * it. `validatePassword` and `onConfirm` are injected — this hook never
 * touches storage or keys itself.
 */
import { useCallback, useEffect, useState } from 'react';

export interface UsePasswordConfirmParams {
  /** Resets the gate each time the sheet opens. */
  visible: boolean;
  requirePassword: boolean;
  validatePassword?: (password: string) => Promise<boolean>;
  onConfirm: (password?: string) => Promise<void> | void;
  onClose: () => void;
  /** The platform's translator — the three error strings are its keys. */
  t: (key: string, fallback: string) => string;
}

export interface PasswordConfirmState {
  password: string;
  passwordError: string | undefined;
  loading: boolean;
  /** `true` when the gate has what it needs to try. */
  canConfirm: boolean;
  setPassword: (value: string) => void;
  confirm: () => Promise<void>;
}

export function usePasswordConfirm({
  visible,
  requirePassword,
  validatePassword,
  onConfirm,
  onClose,
  t,
}: UsePasswordConfirmParams): PasswordConfirmState {
  const [password, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setPasswordValue('');
      setPasswordError(undefined);
      setLoading(false);
    }
  }, [visible]);

  const confirm = useCallback(async () => {
    if (loading) return;

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
      await onConfirm(requirePassword ? password : undefined);
      onClose();
    } catch (err) {
      console.error('Confirm action failed:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, requirePassword, validatePassword, password, t, onConfirm, onClose]);

  const setPassword = useCallback(
    (value: string) => {
      setPasswordValue(value);
      if (passwordError) setPasswordError(undefined);
    },
    [passwordError]
  );

  return {
    password,
    passwordError,
    loading,
    canConfirm: !requirePassword || password.length > 0,
    setPassword,
    confirm,
  };
}
