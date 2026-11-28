/**
 * ConfirmSheet - Generic confirmation bottom sheet for destructive/sensitive actions
 *
 * Mobile equivalent of the web ConfirmDialog. Supports danger styling,
 * optional password verification, and loading states. The body is the sheet
 * standard (DESIGN.md §Sheets): 12 under the title, every piece of
 * information in a card, 20 between blocks, and it scrolls inside the
 * container's 92% ceiling.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WarningIcon } from '../../icons';
import {
  spacing,
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  type ConfirmSheetPropsBase,
  type Semantic,
  usePasswordConfirm,
} from '@salmon/shared';
import { useAnnounce } from '../../../hooks/useAnnounce';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { sheetBodyStyles } from '../BottomSheetContainer/sheetBodyStyles';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { Card } from '../Card';
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
  onClosed,
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
  errorText,
  confirmTestID = 'confirm-dialog-confirm',
  cancelTestID = 'confirm-dialog-cancel',
  children,
  bedrock = false,
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
    actionError,
    canConfirm,
    setPassword: handlePasswordChange,
    confirm: handleConfirm,
  } = usePasswordConfirm({
    visible,
    requirePassword,
    validatePassword,
    onConfirm,
    onClose,
    errorText,
    t,
  });
  useAnnounce(actionError);

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      // A swipe while the action runs would close on a result nobody saw.
      dismissible={!loading}
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
      background={
        bedrock ? <View testID="confirm-sheet-bedrock" style={styles.bedrock} /> : undefined
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: compactContentBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}

        <Card padding="lg" gap={spacing.md}>
          <Text style={styles.message}>{message}</Text>
        </Card>

        {requirePassword && (
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
        )}

        {/*
            On a danger sheet the two buttons trade places. Backing out takes
            the primary fill and comes first, because on a sheet that destroys a
            wallet the recommended outcome is the one that changes nothing; the
            destructive action keeps the secondary shell with the danger fill
            painted into it, so it stays plainly a button without inviting the
            thumb that is already travelling toward the primary.
          */}
        {actionError ? (
          <Text style={styles.error} testID="confirm-dialog-error">
            {actionError}
          </Text>
        ) : null}

        {acknowledgeOnly ? null : (
          <View style={styles.actions}>
            {isDanger ? (
              <>
                <PrimaryButton onPress={onClose} disabled={loading} testID={cancelTestID}>
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
                    testID={confirmTestID}
                  >
                    {confirmText || t('actions.confirm', 'Confirm')}
                  </SecondaryButton>
                )}
              </>
            ) : (
              <>
                <SecondaryButton onPress={onClose} disabled={loading} testID={cancelTestID}>
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
                    testID={confirmTestID}
                  >
                    {confirmText || t('actions.confirm', 'Confirm')}
                  </PrimaryButton>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </BottomSheetContainer>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    ...sheetBodyStyles(t),
    error: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.snug,
      textAlign: 'center',
    },
  });
