/**
 * BackupPanel – Backup/Export seed phrase panel.
 * Extracted from the route file for use in the SettingsPanelStack.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { EyeIcon, WarningIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';

import {
  borderRadius,
  colors,
  fontFamilyNative,
  fontSize,
  fontWeight,
  lineHeight,
  semantic,
  spacing,
  useAccountsContext,
} from '@salmon/shared';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ConfirmSheet } from '../ConfirmSheet';
import { WarningNotice } from '../WarningNotice';
import { useSecretScreen } from '../../../hooks/useSecretScreen';

interface BackupPanelProps {
  onBack: () => void;
  biometricAvailable?: boolean;
  authenticateWithBiometric?: () => Promise<string | null>;
}

export function BackupPanel({
  onBack,
  biometricAvailable,
  authenticateWithBiometric,
}: BackupPanelProps) {
  const { t } = useTranslation();

  // This panel renders its own word grid rather than SeedWordGrid, so it has
  // to opt in explicitly. Protection covers the whole panel, not just the
  // revealed state — the mnemonic is in memory and one tap away throughout.
  useSecretScreen('backup-panel');

  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount } = accountState;

  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [reauthVisible, setReauthVisible] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();
  const [copyFailed, setCopyFailed] = useState(false);

  const mnemonic = useMemo(() => activeAccount?.mnemonic || '', [activeAccount]);
  const words = useMemo(() => mnemonic.split(' ').filter(Boolean), [mnemonic]);

  // An unlocked session is not proof of identity — it only proves the phone was
  // left open. Biometrics count as the same proof as the password here, so a
  // device with Face ID keeps its one-prompt flow; a device without one falls
  // back to typing the password rather than to nothing at all.
  const handleReveal = useCallback(async () => {
    if (showSeedPhrase) {
      setShowSeedPhrase(false);
      return;
    }

    if (biometricAvailable && authenticateWithBiometric) {
      const result = await authenticateWithBiometric();
      if (result === null) return;
      setShowSeedPhrase(true);
      return;
    }

    setReauthVisible(true);
  }, [showSeedPhrase, biometricAvailable, authenticateWithBiometric]);

  const handleReauthenticated = useCallback(async () => {
    setShowSeedPhrase(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!showSeedPhrase || !mnemonic) return;
    try {
      await Clipboard.setStringAsync(mnemonic);
      setCopyFailed(false);
      showCopied();
    } catch (error) {
      // A silent copy failure here means the user thinks the seed is saved.
      console.error('Failed to copy seed phrase:', error);
      setCopyFailed(true);
    }
  }, [showSeedPhrase, mnemonic, showCopied]);

  return (
    <SettingsScreenLayout title={t('general.seed_phrase')} onBack={onBack}>
      <View style={styles.warningContainer}>
        <WarningIcon size={iconSize.md} color={semantic.status.warning} />
        <Text style={styles.warningText}>{t('wallet.create.messageBody')}</Text>
      </View>

      <View style={styles.seedContainer} testID="backup-seed-phrase">
        {!showSeedPhrase && (
          <TouchableOpacity
            style={styles.revealOverlay}
            onPress={handleReveal}
            activeOpacity={0.8}
            testID="backup-seed-reveal-overlay"
            accessibilityRole="button"
          >
            <EyeIcon size={iconSize.xl} color={semantic.text.primary} />
            <Text style={styles.revealText}>{t('settings.wallets.tap_to_reveal')}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.wordsGrid}>
          {words.map((word, index) => (
            <View key={index} style={styles.wordContainer}>
              <Text style={styles.wordIndex}>{index + 1}</Text>
              <Text style={styles.wordText}>{showSeedPhrase ? word : '******'}</Text>
            </View>
          ))}
        </View>
      </View>

      {showSeedPhrase && (
        <View testID="backup-seed-clipboard-warning">
          <WarningNotice
            tone="warning"
            title={t('settings.clipboard_warning_title')}
            style={styles.clipboardWarning}
          >
            {t('settings.clipboard_warning_description')}
          </WarningNotice>
        </View>
      )}

      {copyFailed && (
        <WarningNotice
          tone="error"
          title={t('settings.copy_failed')}
          style={styles.copyFailedNotice}
        />
      )}

      <View style={styles.buttonContainer}>
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

const styles = StyleSheet.create({
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: semantic.status.warningTint,
    borderRadius: borderRadius.r2,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    color: semantic.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.snug,
  },
  // The Bedrock Rule (DESIGN.md): a surface that exhibits a seed phrase is
  // `surface.bedrock`, α 1.00 — never a translucent card that lets the water
  // show through the words.
  seedContainer: {
    position: 'relative',
    backgroundColor: semantic.surface.bedrock,
    borderRadius: borderRadius.r3,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  revealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.dark,
    borderRadius: borderRadius.r3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: spacing.sm,
  },
  revealText: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.bodyLg,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordContainer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.r1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  // Seed Phrase Rule (DESIGN.md): cell numbers are `text.tertiary` at label
  // size so they are never mistaken for part of the phrase.
  wordIndex: {
    color: semantic.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.label,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  // Seed Phrase Rule: Geist Mono at the larger mono size, weight 500.
  wordText: {
    color: semantic.text.primary,
    fontFamily: fontFamilyNative.mono,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.monoLg,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  copyFailedNotice: {
    marginBottom: spacing.lg,
  },
  clipboardWarning: {
    marginBottom: spacing.lg,
  },
});

export default BackupPanel;
