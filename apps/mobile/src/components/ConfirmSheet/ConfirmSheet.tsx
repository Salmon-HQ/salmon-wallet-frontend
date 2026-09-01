/**
 * ConfirmSheet - Generic confirmation bottom sheet for destructive/sensitive actions
 *
 * Mobile equivalent of the web ConfirmDialog. Supports danger styling,
 * optional password verification, and loading states.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WarningIcon } from '../../icons';
import { colors, spacing, fontSize, fontFamilyNative, vs, semantic } from '@salmon/shared';
import { useBottomSheetChrome } from '../../../hooks/useBottomSheetChrome';
import { BottomSheetContainer, SheetTitle } from '../BottomSheetContainer';
import { PrimaryButton } from '../Button/PrimaryButton';
import { SecondaryButton } from '../Button/SecondaryButton';
import { PasswordInput } from '../PasswordInput';

// ============================================================================
// Types
// ============================================================================

export interface ConfirmSheetProps {
  /** Controls sheet visibility */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Sheet title */
  title: string;
  /** Description of the action to confirm */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Whether this is a destructive action (red confirm button) */
  isDanger?: boolean;
  /**
   * Renders a single dismiss button instead of the cancel/confirm pair.
   *
   * For a sheet that only reports something — a failure the user can do
   * nothing about here — two buttons that both dismiss read as a choice that
   * does not exist, and "Cancel" invites the user to think the thing might
   * still be undone.
   */
  acknowledgeOnly?: boolean;
  /** Whether to require password confirmation */
  requirePassword?: boolean;
  /** Password validation function */
  validatePassword?: (password: string) => Promise<boolean>;
  /**
   * Async callback when the user confirms.
   *
   * Receives the entered password when `requirePassword` is set, so a caller
   * can hand it to an operation that needs it — the sheet has already checked
   * it with `validatePassword` by then.
   */
  onConfirm: (password?: string) => Promise<void>;
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
  requirePassword = false,
  validatePassword,
  onConfirm,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  const { compactContentBottomPadding } = useBottomSheetChrome();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setPassword('');
      setPasswordError(undefined);
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
      if (passwordError) {
        setPasswordError(undefined);
      }
    },
    [passwordError]
  );

  const canConfirm = !requirePassword || password.length > 0;

  return (
    <BottomSheetContainer
      visible={visible}
      onClose={onClose}
      title={
        <SheetTitle
          // Colour is never the only channel: glyph, fill and label all say it
          leading={isDanger && <WarningIcon size={fontSize.lg} color={semantic.status.danger} />}
        >
          {title}
        </SheetTitle>
      }
      style={styles.sheet}
    >
      {/*
        The password field autofocuses, so on iOS the keyboard opens over the
        bottom-anchored sheet and hides the Confirm button. Padding grows the
        sheet upward instead. Android resizes the window itself.
      */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                autoFocus
                onSubmitEditing={handleConfirm}
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
              <PrimaryButton onPress={onClose} disabled={loading}>
                {confirmText || t('actions.close', 'Close')}
              </PrimaryButton>
            ) : isDanger ? (
              <>
                <PrimaryButton onPress={onClose} disabled={loading}>
                  {cancelText || t('actions.cancel', 'Cancel')}
                </PrimaryButton>
                <SecondaryButton
                  onPress={handleConfirm}
                  disabled={!canConfirm || loading}
                  style={styles.dangerButton}
                >
                  {confirmText || t('actions.confirm', 'Confirm')}
                </SecondaryButton>
              </>
            ) : (
              <>
                <SecondaryButton onPress={onClose} disabled={loading}>
                  {cancelText || t('actions.cancel', 'Cancel')}
                </SecondaryButton>
                <PrimaryButton onPress={handleConfirm} disabled={!canConfirm} loading={loading}>
                  {confirmText || t('actions.confirm', 'Confirm')}
                </PrimaryButton>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetContainer>
  );
}

export default ConfirmSheet;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  sheet: {
    maxHeight: undefined,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  message: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    // Left-aligned: the message runs to several lines, and a centred block
    // moves the start of every line.
    textAlign: 'left',
    marginBottom: vs(spacing.lg),
  },
  passwordSection: {
    marginBottom: vs(spacing.lg),
  },
  actions: {
    gap: vs(spacing.sm),
  },
  /**
   * `status.dangerFill` (`danger-700`) under `SecondaryButton`'s own
   * `text.primary` label: 6.58:1. It replaces a `status.danger` (`danger-500`)
   * fill, which put the same light ink at 2.50:1 — below even the
   * white-on-salmon pairing DESIGN.md bans at 3.06:1. `danger-500` is the
   * system's danger *ink*; `danger-700` is its fill.
   */
  dangerButton: {
    backgroundColor: semantic.status.dangerFill,
  },
});
