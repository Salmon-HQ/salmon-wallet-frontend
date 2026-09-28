/**
 * BackupPanel — the settings surface that re-shows a wallet's seed phrase.
 *
 * The phrase is exhibited on `SeedWordGrid`, the same primitive the onboarding
 * grid uses (DESIGN.md §Hierarchy, The Seed Phrase Rule): bedrock cells,
 * mono words, tertiary numbers, one implementation. Everything around it is
 * kit — a `WarningNotice` for the standing warning, a bedrock cover for the
 * reveal gate, kit buttons — handed flat to `SettingsScreenLayout`.
 *
 * The gate itself is unchanged: an unlocked session is not proof of identity.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

import {
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  useAccountsContext,
  useBackupPanelLogic,
  type BackupPanelPropsBase,
  type Semantic,
} from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ConfirmSheet } from '../ConfirmSheet';
import { RevealCover } from '../RevealCover';
import { SeedWordGrid } from '../SeedPhrase';
import { WarningNotice } from '../WarningNotice';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { useThemedStyles } from '../../theme/useThemedStyles';

interface BackupPanelProps extends BackupPanelPropsBase {
  biometricAvailable?: boolean;
  /** Prompts for biometrics and answers whether it was the owner. */
  verifyBiometric?: () => Promise<boolean>;
}

export function BackupPanel({ onBack, biometricAvailable, verifyBiometric }: BackupPanelProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);

  // `SeedWordGrid` protects the frames it is mounted for; the panel holds the
  // mnemonic in memory for its whole lifetime, including before the reveal, so
  // it opts in on its own behalf too.
  useSecretScreen('backup-panel');

  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount } = accountState;

  // An account imported from a private key has no phrase behind it: without
  // `hasNoMnemonic` the screen renders an empty grid under a "tap to reveal"
  // overlay. Reveal/copy/reauth state lives in shared so the DOM twin's
  // behavior cannot drift from this one.
  const {
    hasNoMnemonic,
    shownWords,
    showSeedPhrase,
    reauthVisible,
    setReauthVisible,
    copied,
    copyFailed,
    handleReveal,
    handleReauthenticated,
    handleCopy,
  } = useBackupPanelLogic({
    activeAccount,
    copyToClipboard: (mnemonic) => Clipboard.setStringAsync(mnemonic),
    onCopyError: (error) => console.error('Failed to copy seed phrase:', error),
    biometricAvailable,
    verifyBiometric,
  });

  return (
    <SettingsScreenLayout
      title={t('general.seed_phrase')}
      subtitle={t('settings.backup_subtitle', 'View or back up your recovery phrase.')}
      onBack={onBack}
    >
      <WarningNotice tone="warning" title={t('wallet.create.messageTitle')}>
        {t('wallet.create.messageBody')}
      </WarningNotice>

      {hasNoMnemonic ? (
        <Text style={styles.emptyText} testID="backup-no-seed-phrase">
          {t('settings.no_seed_phrase')}
        </Text>
      ) : (
        <View style={styles.seedContainer} testID="backup-seed-phrase">
          <SeedWordGrid words={shownWords} columns={3} />
          {!showSeedPhrase && (
            <RevealCover
              testID="backup-seed-reveal-overlay"
              label={t('settings.wallets.tap_to_reveal')}
              onPress={handleReveal}
            />
          )}
        </View>
      )}

      {showSeedPhrase && !hasNoMnemonic && (
        <View testID="backup-seed-clipboard-warning">
          <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
            {t('settings.clipboard_warning_description')}
          </WarningNotice>
        </View>
      )}

      {copyFailed && <WarningNotice tone="error" title={t('settings.copy_failed')} />}

      <View style={styles.actions}>
        <SecondaryButton
          onPress={handleCopy}
          disabled={!showSeedPhrase}
          testID="backup-seed-copy-button"
        >
          {copied ? t('wallet.copied') : t('actions.copy')}
        </SecondaryButton>
        <PrimaryButton onPress={onBack} testID="backup-seed-done-button">
          {t('actions.done')}
        </PrimaryButton>
      </View>

      <ConfirmSheet
        visible={reauthVisible}
        onClose={() => setReauthVisible(false)}
        title={t('settings.reveal_phrase_title')}
        message={t('settings.reveal_phrase_message')}
        confirmText={t('actions.reveal')}
        requirePassword
        validatePassword={accountActions.checkPassword}
        onConfirm={handleReauthenticated}
      />
    </SettingsScreenLayout>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    seedContainer: {
      position: 'relative',
    },
    emptyText: {
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
    },
    actions: {
      gap: s(spacing.md),
    },
  });

export default BackupPanel;
