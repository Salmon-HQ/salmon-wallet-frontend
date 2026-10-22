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
 *
 * The body is the sheet standard (DESIGN.md §Sheets): 12 under the title,
 * the detail and the message each in a card, 20 between blocks, and no
 * buttons at all on a sheet that only reports something.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { fontFamily, fontSize, lineHeight, spacing, usePasswordConfirm } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { WarningIcon } from '../../icons';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { Card } from '../Card';
import { PrimaryButton, SecondaryButton } from '../Button';
import { PasswordInput } from '../PasswordInput';
import type { ConfirmDialogProps } from './types';

export function ConfirmDialog({
  visible,
  onClose,
  onClosed,
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
  children,
  bedrock = false,
}: ConfirmDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { status, text, surface } = useSemantic();
  // The gate's state lives once, in shared; this sheet only renders it.
  const {
    password,
    passwordError,
    loading,
    canConfirm,
    setPassword: handlePasswordChange,
    confirm: handleConfirm,
  } = usePasswordConfirm({ visible, requirePassword, validatePassword, onConfirm, onClose, t });

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      dismissible={!loading}
      testID="confirm-dialog"
      background={
        bedrock ? (
          <div
            data-testid="confirm-dialog-bedrock"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              backgroundColor: surface.bedrock,
            }}
          />
        ) : undefined
      }
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
          gap: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        }}
      >
        {children}

        <Card padding="lg" gap={spacing.md}>
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
        </Card>

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

        {acknowledgeOnly ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {isDanger ? (
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
                <SecondaryButton
                  onPress={onClose}
                  disabled={loading}
                  testID="confirm-dialog-cancel"
                >
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
        )}
      </div>
    </BottomSheetContainer>
  );
}
