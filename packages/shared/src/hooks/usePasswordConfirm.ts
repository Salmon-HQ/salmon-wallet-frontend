/**
 * The confirm gate's state, on both platforms: an optional password that is
 * checked before the action runs, the error the field shows, and the loading
 * that spans the check and the action.
 *
 * `ConfirmSheet` (mobile) and `ConfirmDialog` (DOM) render it; neither owns
 * it. `validatePassword` and `onConfirm` are injected — this hook never
 * touches storage or keys itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { UnlockThrottledError } from '../utils/unlock-throttle';

export interface UsePasswordConfirmParams {
  /** Resets the gate each time the sheet opens. */
  visible: boolean;
  requirePassword: boolean;
  validatePassword?: (password: string) => Promise<boolean>;
  onConfirm: (password?: string) => Promise<void> | void;
  onClose: () => void;
  /** Shown as `actionError` when `onConfirm` rejects. */
  errorText?: string;
  /** The platform's translator — the three error strings are its keys. */
  t: (key: string, fallback: string) => string;
}

export interface PasswordConfirmState {
  password: string;
  passwordError: string | undefined;
  loading: boolean;
  /** `errorText`, after the action rejected and until the next try. */
  actionError: string | undefined;
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
  errorText,
  t,
}: UsePasswordConfirmParams): PasswordConfirmState {
  const [password, setPasswordValue] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  // `loading` is the render's copy: two taps in one tick both read it false,
  // and after success the button is live again while the sheet slides out.
  // Held from a press until a failure, or until the sheet opens again.
  const claimed = useRef(false);

  useEffect(() => {
    if (visible) {
      claimed.current = false;
      setPasswordValue('');
      setPasswordError(undefined);
      setActionError(undefined);
      setLoading(false);
    }
  }, [visible]);

  const confirm = useCallback(async () => {
    if (claimed.current) return;
    claimed.current = true;
    setActionError(undefined);

    if (requirePassword && validatePassword) {
      if (!password) {
        setPasswordError(t('errors.password_required', 'Password is required'));
        claimed.current = false;
        return;
      }
      setLoading(true);
      try {
        const isValid = await validatePassword(password);
        if (!isValid) {
          setPasswordError(t('errors.invalid_password', 'Invalid password'));
          setLoading(false);
          claimed.current = false;
          return;
        }
      } catch (err) {
        claimed.current = false;
        setPasswordError(
          err instanceof UnlockThrottledError
            ? t(
                'errors.password_throttled',
                'Too many wrong passwords. Wait a moment and try again — your wallet is untouched.'
              )
            : t('errors.password_check_failed', 'Failed to verify password')
        );
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
      setActionError(errorText);
      claimed.current = false;
    } finally {
      setLoading(false);
    }
  }, [requirePassword, validatePassword, password, t, onConfirm, onClose, errorText]);

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
    actionError,
    canConfirm: !requirePassword || password.length > 0,
    setPassword,
    confirm,
  };
}
