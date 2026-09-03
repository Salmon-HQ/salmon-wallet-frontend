/**
 * SecurityPanel — CORE 12 · Security.
 *
 * The screen answers "how protected am I" before it offers anything to
 * change: a score block reading the safeguards that actually exist on this
 * device, then the rows that flip them, then recovery, then the password
 * form. Every block is a kit sibling handed flat to `SettingsScreenLayout`,
 * which spaces them 20 (DESIGN.md §Layout, the component gap).
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  useAccountsContext,
  type Semantic,
  useChangePassword,
} from '@salmon/shared';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { FingerprintIcon, KeyIcon, ShieldCheckIcon, SquaresFourIcon, iconSize } from '../../icons';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PasswordInput, PasswordStrengthBar } from '../PasswordInput';
import { PrimaryButton, SecondaryButton } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconBubble } from '../IconBubble';
import { ListRow } from '../ListRow';
import { SectionLabel } from '../SectionLabel';
import type { SecurityPanelProps } from './types';

// ============================================================================
// Component
// ============================================================================

/** The leading well every settings row carries (as `settings/index.tsx`). */
const ROW_BUBBLE_SIZE = 40;
/** The score block's mark. 48 is the kit step nearest the frame's 50. */
const SCORE_BUBBLE_SIZE = 48;

export function SecurityPanel({
  onBack,
  onNavigate,
  isBiometricAvailable,
  isBiometricEnabled,
  biometricType,
  onToggleBiometric,
  onPasswordChanged,
}: SecurityPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { border, accent, text } = useSemantic();
  const [accountState, accountActions] = useAccountsContext();

  // Password state
  // The form's state lives once, in shared; the vault call is the context's.
  const {
    currentPassword,
    newPassword,
    confirmPassword,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    passwordValidation,
    error,
    success,
    canSubmit,
    submit: handleChangePassword,
  } = useChangePassword({
    changePassword: accountActions.changePassword,
    onPasswordChanged,
    t,
  });

  // The score counts safeguards this wallet really has, not a target list: a
  // password always exists, and biometric unlock only counts on a device that
  // can offer it — scoring a phone down for hardware it does not have would
  // make the number unreachable.
  const safeguards = useMemo(() => {
    const total = 1 + (isBiometricAvailable ? 1 : 0);
    const enabled = 1 + (isBiometricAvailable && isBiometricEnabled ? 1 : 0);
    return { total, enabled, isStrong: enabled === total };
  }, [isBiometricAvailable, isBiometricEnabled]);

  const biometricKind = t(
    biometricType === 'facial'
      ? 'settings.security.biometric_face_id'
      : biometricType === 'fingerprint'
        ? 'settings.security.biometric_touch_id'
        : 'settings.security.biometric_generic'
  );

  // Locking is the context's own action; the global LockOverlay is mounted on
  // `state.locked`, so there is nothing to navigate to afterwards.
  const handleLockNow = useCallback(() => {
    void accountActions.lockAccounts();
  }, [accountActions]);

  return (
    <SettingsScreenLayout
      title={t('settings.security.title')}
      subtitle={t('settings.security.subtitle')}
      onBack={onBack}
    >
      <ListRow
        testID="security-score"
        padding="lg"
        leading={
          <IconBubble
            size={SCORE_BUBBLE_SIZE}
            shape="rounded"
            tone={safeguards.isStrong ? 'success-tint' : 'accent-tint'}
            icon={ShieldCheckIcon}
            iconSize={iconSize.lg}
          />
        }
        title={t(
          safeguards.isStrong ? 'settings.security.score_strong' : 'settings.security.score_partial'
        )}
        subtitle={t('settings.security.score_detail', {
          enabled: safeguards.enabled,
          total: safeguards.total,
        })}
      />

      {isBiometricAvailable && (
        <ListRow
          testID="security-biometric-row"
          leading={
            <IconBubble
              size={ROW_BUBBLE_SIZE}
              shape="rounded"
              tone="surface"
              icon={FingerprintIcon}
              iconSize={iconSize.md}
            />
          }
          title={t('settings.security.biometric_unlock')}
          subtitle={biometricKind}
          trailing={
            <View style={styles.trailing}>
              <Chip
                size="sm"
                variant="outline"
                label={t(
                  isBiometricEnabled ? 'settings.security.state_on' : 'settings.security.state_off'
                )}
                testID="security-biometric-state"
              />
              {/* The switch semantics live on the Switch itself — a wrapper
                  carrying role="switch" around a real Switch announced twice. */}
              <Switch
                testID="security-biometric-toggle"
                accessibilityLabel={t('settings.security.biometric_unlock')}
                accessibilityHint={t('settings.security.biometric_description')}
                value={isBiometricEnabled}
                onValueChange={onToggleBiometric}
                // Off-track on `border.default`: the card token vanished against
                // the row's own card ground, leaving the off state invisible.
                trackColor={{ false: border.default, true: accent.ink }}
                thumbColor={text.primary}
              />
            </View>
          }
        />
      )}

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

      {/* The same guard the auto-lock applies (`app/_layout.tsx`): a wallet
          with no password to unlock with must never be locked, or the only
          way back in is wiping it. */}
      <SecondaryButton
        onPress={handleLockNow}
        disabled={!accountState.requiredLock}
        testID="security-lock-now-button"
      >
        {t('settings.security.lock_now')}
      </SecondaryButton>

      <Card padding="lg" gap={spacing.md}>
        <SectionLabel variant="title">{t('settings.security.change_password')}</SectionLabel>

        <PasswordInput
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('settings.security.current_password')}
          testID="security-current-password-input"
        />

        <View>
          <PasswordInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('settings.security.new_password')}
            testID="security-new-password-input"
          />
          {newPassword.length > 0 && (
            <View style={styles.strength}>
              <PasswordStrengthBar strength={passwordValidation.strength} />
            </View>
          )}
        </View>

        <PasswordInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('settings.security.confirm_password')}
          testID="security-confirm-password-input"
        />

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite" testID="security-error">
            {error}
          </Text>
        ) : success ? (
          <Text style={styles.success} accessibilityLiveRegion="polite" testID="security-success">
            {t('settings.security.password_changed')}
          </Text>
        ) : null}

        <PrimaryButton
          onPress={handleChangePassword}
          disabled={!canSubmit}
          testID="security-change-password-button"
        >
          {t('settings.security.change_password_button')}
        </PrimaryButton>
      </Card>
    </SettingsScreenLayout>
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    strength: {
      marginTop: s(spacing.sm),
      paddingHorizontal: s(spacing.xs),
    },
    error: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
    },
    success: {
      color: t.status.success,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.caption),
      lineHeight: s(fontSize.caption) * lineHeight.snug,
    },
  });
