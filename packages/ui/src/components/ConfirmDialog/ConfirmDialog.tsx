/**
 * ConfirmDialog Component
 *
 * A reusable confirmation dialog for destructive actions.
 * Supports both simple confirmations and password-protected actions.
 *
 * Features:
 * - Danger styling for destructive actions
 * - Optional password verification
 * - Customizable title, message, and button text
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import { spacing } from '@salmon/shared';
import { BaseDialog, MessageText } from '../BaseDialog';
import type { ConfirmDialogProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const PasswordSection = styled('div')({
  marginTop: spacing.lg,
});

// ============================================================================
// Component
// ============================================================================

/**
 * Confirmation dialog for actions that need user verification.
 *
 * @example
 * ```tsx
 * // Simple confirmation
 * <ConfirmDialog
 *   visible={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   title="Remove Wallet"
 *   message="Are you sure you want to remove this wallet?"
 *   confirmText="Remove"
 *   isDanger
 *   onConfirm={handleRemove}
 * />
 *
 * // With password verification
 * <ConfirmDialog
 *   visible={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   title="Remove All Wallets"
 *   message="This will remove all wallets from this device."
 *   confirmText="Remove All"
 *   isDanger
 *   requirePassword
 *   validatePassword={checkPassword}
 *   onConfirm={handleRemoveAll}
 * />
 * ```
 */
export function ConfirmDialog({
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
  confirmTestID,
}: ConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setPassword('');
      setPasswordError(null);
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
        setPasswordError(null);
      }
    },
    [passwordError]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleConfirm();
      }
    },
    [handleConfirm]
  );

  const canConfirm = !requirePassword || password.length > 0;

  return (
    <BaseDialog visible={visible} onClose={onClose} ariaLabelledBy="confirm-dialog-title">
      <BaseDialog.Header title={title} showWarning={isDanger} />

      <BaseDialog.Content>
        <MessageText>{message}</MessageText>

        {requirePassword && (
          <PasswordSection>
            <BaseDialog.TextField
              type="password"
              label={t('general.password', 'Password')}
              value={password}
              onChange={handlePasswordChange}
              onKeyDown={handleKeyDown}
              error={!!passwordError}
              helperText={passwordError || undefined}
              disabled={loading}
              autoFocus
            />
          </PasswordSection>
        )}
      </BaseDialog.Content>

      <BaseDialog.Actions>
        <BaseDialog.CancelButton onClick={onClose} disabled={loading}>
          {cancelText || t('actions.cancel', 'Cancel')}
        </BaseDialog.CancelButton>
        <BaseDialog.ActionButton
          isDanger={isDanger}
          onClick={handleConfirm}
          disabled={!canConfirm}
          loading={loading}
          testID={confirmTestID}
        >
          {confirmText || t('actions.confirm', 'Confirm')}
        </BaseDialog.ActionButton>
      </BaseDialog.Actions>
    </BaseDialog>
  );
}
