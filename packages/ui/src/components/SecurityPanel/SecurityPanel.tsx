/**
 * SecurityPanel — CORE 12 · Security, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/SecurityPanel`: the screen
 * answers "how protected am I" before it offers anything to change — a score
 * block reading the safeguards that exist on this device, then recovery,
 * then the lock, then the password form. A browser has no biometrics, so
 * the score counts the password alone and the biometric row is absent.
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fontFamily,
  fontSize,
  getPasswordIssue,
  lineHeight,
  PASSWORD_CONSTRAINTS,
  spacing,
  useAccountsContext,
  validatePassword,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { KeyIcon, ShieldCheckIcon, SquaresFourIcon, iconSize } from '../../icons';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { PasswordInput, PasswordStrengthBar } from '../PasswordInput';
import { SectionLabel } from '../SectionLabel';
import { SettingsPanelContent } from '../SettingsPanelContent';
import type { SecurityPanelProps } from './types';

/** The leading well every settings row carries (as the settings root). */
const ROW_BUBBLE_SIZE = 40;
/** The score block's mark. 48 is the kit step nearest the frame's 50. */
const SCORE_BUBBLE_SIZE = 48;

export function SecurityPanel({
  onBack,
  onNavigate,
  onPasswordChanged,
}: SecurityPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const { status } = useSemantic();
  const [accountState, accountActions] = useAccountsContext();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(newPassword);

  const handleChangePassword = useCallback(async () => {
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
      const changed = await accountActions.changePassword(currentPassword, newPassword);
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
    accountActions,
    onPasswordChanged,
    t,
  ]);

  const handleLockNow = useCallback(() => {
    void accountActions.lockAccounts();
  }, [accountActions]);

  const feedbackStyle = (color: string): React.CSSProperties => ({
    margin: 0,
    color,
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    lineHeight: `${fontSize.caption * lineHeight.snug}px`,
  });

  return (
    <SettingsPanelContent
      title={t('settings.security.title')}
      subtitle={t('settings.security.subtitle')}
      onBack={onBack}
    >
      {/* The score counts safeguards this wallet really has: a password
          always exists, and a browser offers nothing else to count. */}
      <ListRow
        testID="security-score"
        padding="lg"
        leading={
          <IconBubble
            size={SCORE_BUBBLE_SIZE}
            shape="rounded"
            tone="success-tint"
            icon={ShieldCheckIcon}
            iconSize={iconSize.lg}
          />
        }
        title={t('settings.security.score_strong')}
        subtitle={t('settings.security.score_detail', { enabled: 1, total: 1 })}
      />

      {onNavigate && (
        <>
          <SectionLabel variant="title">{t('settings.security.recovery')}</SectionLabel>

          <ListRow
            testID="security-recovery-phrase"
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="surface"
                icon={KeyIcon}
                iconSize={iconSize.md}
              />
            }
            title={t('settings.security.recovery_phrase')}
            subtitle={t('settings.security.recovery_phrase_description')}
            onPress={() => onNavigate('backup')}
          />

          <ListRow
            testID="security-connected-apps"
            leading={
              <IconBubble
                size={ROW_BUBBLE_SIZE}
                shape="rounded"
                tone="surface"
                icon={SquaresFourIcon}
                iconSize={iconSize.md}
              />
            }
            title={t('settings.security.connected_apps')}
            subtitle={t('settings.security.connected_apps_description')}
            onPress={() => onNavigate('trustedApps')}
          />
        </>
      )}

      {/* A wallet with no password to unlock with must never be locked, or
          the only way back in is wiping it. */}
      <SecondaryButton
        onPress={handleLockNow}
        disabled={!accountState.requiredLock}
        testID="security-lock-now-button"
      >
        {t('settings.security.lock_now')}
      </SecondaryButton>

      <Card padding="lg" gap={spacing.md} style={{ flexDirection: 'column' }}>
        <SectionLabel variant="title">{t('settings.security.change_password')}</SectionLabel>

        <PasswordInput
          value={currentPassword}
          onChangeText={(value: string) => {
            setCurrentPassword(value);
            if (error) setError('');
            if (success) setSuccess(false);
          }}
          placeholder={t('settings.security.current_password')}
          testID="security-current-password-input"
        />

        <div>
          <PasswordInput
            value={newPassword}
            onChangeText={(value: string) => {
              setNewPassword(value);
              if (success) setSuccess(false);
            }}
            placeholder={t('settings.security.new_password')}
            testID="security-new-password-input"
          />
          {newPassword.length > 0 && (
            <div style={{ marginTop: spacing.sm, padding: `0 ${spacing.xs}px` }}>
              <PasswordStrengthBar strength={passwordValidation.strength} />
            </div>
          )}
        </div>

        <PasswordInput
          value={confirmPassword}
          onChangeText={(value: string) => {
            setConfirmPassword(value);
            if (error) setError('');
            if (success) setSuccess(false);
          }}
          placeholder={t('settings.security.confirm_password')}
          testID="security-confirm-password-input"
        />

        {/* Both messages announce politely: status, not emergency. */}
        {error ? (
          <p role="status" data-testid="security-error" style={feedbackStyle(status.danger)}>
            {error}
          </p>
        ) : success ? (
          <p role="status" data-testid="security-success" style={feedbackStyle(status.success)}>
            {t('settings.security.password_changed')}
          </p>
        ) : null}

        <PrimaryButton
          onPress={() => void handleChangePassword()}
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          testID="security-change-password-button"
        >
          {t('settings.security.change_password_button')}
        </PrimaryButton>
      </Card>
    </SettingsPanelContent>
  );
}
