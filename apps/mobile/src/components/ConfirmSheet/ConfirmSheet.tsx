/**
 * ConfirmSheet - Generic confirmation bottom sheet for destructive/sensitive actions
 *
 * Mobile equivalent of the web ConfirmDialog. Supports danger styling,
 * optional password verification, and loading states.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WarningIcon } from '../../icons';
import {
  spacing,
  fontSize,
  fontFamilyNative,
  s,
  vs,
  type ConfirmSheetPropsBase,
  type Semantic,
  usePasswordConfirm,
} from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { HoldToApproveButton } from '../Button/HoldToCopyButton';
import { PrimaryButton } from '../Button/PrimaryButton';
import { SecondaryButton } from '../Button/SecondaryButton';
import { PasswordInput } from '../PasswordInput';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

// ============================================================================
// Types
// ============================================================================

/** The RN half of `ConfirmSheetPropsBase`. */
export interface ConfirmSheetProps extends ConfirmSheetPropsBase {
  /**
   * Confirm must be held, not tapped: a Mobile Wallet Adapter dApp whose
   * identity could not be verified (Android only, so the DOM twin has no
   * caller for it).
   */
  requiresHold?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ConfirmSheet({
  visible,
  onClose,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  acknowledgeOnly = false,
  confirmDisabled = false,
  requiresHold = false,
  requirePassword = false,
  validatePassword,
  onConfirm,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { status } = useSemantic();
  const { compactContentBottomPadding } = useBottomSheetChrome();
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
      title={
        <SheetTitle
          // Colour is never the only channel: glyph, fill and label all say it
          leading={isDanger && <WarningIcon size={fontSize.heading} color={status.danger} />}
        >
          {title}
        </SheetTitle>
      }
      // A password sheet stands full height with its content from the top, so
      // the keyboard opening under the autofocused field never covers Confirm.
      forTyping={!!requirePassword}
      style={styles.sheet}
    >
      <View style={[styles.content, { paddingBottom: compactContentBottomPadding }]}>
        <Text style={styles.message}>{message}</Text>

        {requirePassword && (
          <View style={styles.passwordSection}>
            <PasswordInput
              value={password}
              onChangeText={handlePasswordChange}
              placeholder={t('general.password', 'Password')}
              error={passwordError}
              editable={!loading}
              testID="confirm-dialog-password"
              autoFocus
              // On a held sheet the return key must not stand in for the hold.
              onSubmitEditing={requiresHold ? undefined : handleConfirm}
            />
          </View>
        )}

        {/*
            On a danger sheet the two buttons trade places. Backing out takes
            the primary fill and comes first, because on a sheet that destroys a
            wallet the recommended outcome is the one that changes nothing; the
            destructive action keeps the secondary shell with the danger fill
            painted into it, so it stays plainly a button without inviting the
            thumb that is already travelling toward the primary.
          */}
        <View style={styles.actions}>
          {acknowledgeOnly ? (
            <PrimaryButton onPress={onClose} disabled={loading} testID="confirm-dialog-confirm">
              {confirmText || t('actions.close', 'Close')}
            </PrimaryButton>
          ) : isDanger ? (
            <>
              <PrimaryButton onPress={onClose} disabled={loading} testID="confirm-dialog-cancel">
                {cancelText || t('actions.cancel', 'Cancel')}
              </PrimaryButton>
              {requiresHold ? (
                <HoldToApproveButton
                  onApprove={handleConfirm}
                  disabled={!canConfirm || loading || confirmDisabled}
                  danger
                  testID="confirm-dialog-hold"
                >
                  {confirmText || t('actions.confirm', 'Confirm')}
                </HoldToApproveButton>
              ) : (
                <SecondaryButton
                  onPress={handleConfirm}
                  disabled={!canConfirm || loading || confirmDisabled}
                  tone="danger-fill"
                  testID="confirm-dialog-confirm"
                >
                  {confirmText || t('actions.confirm', 'Confirm')}
                </SecondaryButton>
              )}
            </>
          ) : (
            <>
              <SecondaryButton onPress={onClose} disabled={loading} testID="confirm-dialog-cancel">
                {cancelText || t('actions.cancel', 'Cancel')}
              </SecondaryButton>
              {requiresHold ? (
                <HoldToApproveButton
                  onApprove={handleConfirm}
                  disabled={!canConfirm || loading || confirmDisabled}
                  testID="confirm-dialog-hold"
                >
                  {confirmText || t('actions.confirm', 'Confirm')}
                </HoldToApproveButton>
              ) : (
                <PrimaryButton
                  onPress={handleConfirm}
                  disabled={!canConfirm || confirmDisabled}
                  loading={loading}
                  testID="confirm-dialog-confirm"
                >
                  {confirmText || t('actions.confirm', 'Confirm')}
                </PrimaryButton>
              )}
            </>
          )}
        </View>
      </View>
    </BottomSheetContainer>
  );
}

export default ConfirmSheet;

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    sheet: {
      maxHeight: undefined,
    },
    content: {
      paddingHorizontal: spacing.lg,
    },
    message: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.bodyLg),
      // Left-aligned: the message runs to several lines, and a centred block
      // moves the start of every line.
      textAlign: 'left',
      marginBottom: vs(spacing.screenGutter),
    },
    passwordSection: {
      marginBottom: vs(spacing.screenGutter),
    },
    actions: {
      gap: vs(spacing.sm),
    },
  });
