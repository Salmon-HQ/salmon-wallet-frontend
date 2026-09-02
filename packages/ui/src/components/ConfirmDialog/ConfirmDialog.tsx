/**
 * ConfirmDialog — the confirmation sheet for destructive and sensitive
 * actions, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/ConfirmSheet`: a
 * `BottomSheetContainer` with a `SheetTitle` (a danger glyph before it when
 * the action destroys something), the message, an optional password gate,
 * and the two kit buttons. On a danger sheet the buttons trade places —
 * backing out takes the primary fill and comes first, because on a sheet
 * that destroys a wallet the recommended outcome is the one that changes
 * nothing; the destructive action keeps the secondary shell with the danger
 * fill painted into it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, lineHeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { WarningIcon } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton, SecondaryButton } from '../Button';
import { PasswordInput } from '../PasswordInput';
import type { ConfirmDialogProps } from './types';

export function ConfirmDialog({
  visible,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  acknowledgeOnly = false,
  requirePassword = false,
  validatePassword,
  onConfirm,
  confirmTestID,
}: ConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { status, text } = useSemantic();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Reset state when the sheet opens
  useEffect(() => {
    if (visible) {
      setPassword('');
      setPasswordError(undefined);
      setLoading(false);
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
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

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (passwordError) setPasswordError(undefined);
    },
    [passwordError]
  );

  const canConfirm = !requirePassword || password.length > 0;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      dismissible={!loading}
      testID="confirm-dialog"
      title={
        <SheetTitle
          // Colour is never the only channel: glyph, fill and label all say it
          leading={
            isDanger ? <WarningIcon size={fontSize.heading} color={status.danger} /> : undefined
          }
        >
          {title}
        </SheetTitle>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.screenGutter,
          padding: `0 ${spacing.lg}px ${spacing.lg}px`,
        }}
      >
        <p
          data-testid="confirm-dialog-message"
          style={{
            margin: 0,
            color: text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.bodyLg,
            lineHeight: `${fontSize.bodyLg * lineHeight.normal}px`,
            // Left-aligned: the message runs to several lines, and a centred
            // block moves the start of every line.
            textAlign: 'left',
          }}
        >
          {message}
        </p>

        {requirePassword && (
          <PasswordInput
            value={password}
            onChangeText={handlePasswordChange}
            placeholder={t('general.password', 'Password')}
            error={passwordError}
            editable={!loading}
            autoFocus
            onSubmitEditing={handleConfirm}
            testID="confirm-dialog-password"
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {acknowledgeOnly ? (
            <PrimaryButton onPress={onClose} disabled={loading} testID={confirmTestID}>
              {confirmText || t('actions.close', 'Close')}
            </PrimaryButton>
          ) : isDanger ? (
            <>
              <PrimaryButton onPress={onClose} disabled={loading} testID="confirm-dialog-cancel">
                {cancelText || t('actions.cancel', 'Cancel')}
              </PrimaryButton>
              <SecondaryButton
                onPress={handleConfirm}
                disabled={!canConfirm || loading}
                tone="danger-fill"
                testID={confirmTestID ?? 'confirm-dialog-confirm'}
              >
                {confirmText || t('actions.confirm', 'Confirm')}
              </SecondaryButton>
            </>
          ) : (
            <>
              <SecondaryButton onPress={onClose} disabled={loading} testID="confirm-dialog-cancel">
                {cancelText || t('actions.cancel', 'Cancel')}
              </SecondaryButton>
              <PrimaryButton
                onPress={handleConfirm}
                disabled={!canConfirm}
                loading={loading}
                testID={confirmTestID ?? 'confirm-dialog-confirm'}
              >
                {confirmText || t('actions.confirm', 'Confirm')}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>
    </BottomSheetContainer>
  );
}
