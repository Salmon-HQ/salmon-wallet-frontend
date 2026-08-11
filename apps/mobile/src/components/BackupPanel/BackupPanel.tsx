/**
 * BackupPanel – Backup/Export seed phrase panel.
 * Extracted from the route file for use in the SettingsPanelStack.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  colors,
  spacing,
  borderRadius,
  fontFamilyNative,
  useAccountsContext,
fontSize, } from '@salmon/shared';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PrimaryButton, SecondaryButton } from '../Button';
import { WarningNotice } from '../WarningNotice';

interface BackupPanelProps {
  onBack: () => void;
  biometricAvailable?: boolean;
  authenticateWithBiometric?: () => Promise<string | null>;
}

export function BackupPanel({ onBack, biometricAvailable, authenticateWithBiometric }: BackupPanelProps) {
  const { t } = useTranslation();
  const [accountState] = useAccountsContext();
  const { activeAccount } = accountState;

  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const mnemonic = useMemo(() => activeAccount?.mnemonic || '', [activeAccount]);
  const words = useMemo(() => mnemonic.split(' ').filter(Boolean), [mnemonic]);

  const handleReveal = useCallback(async () => {
    if (!showSeedPhrase && biometricAvailable && authenticateWithBiometric) {
      const result = await authenticateWithBiometric();
      if (result === null) return;
    }
    setShowSeedPhrase((prev) => !prev);
  }, [showSeedPhrase, biometricAvailable, authenticateWithBiometric]);

  const handleCopy = useCallback(async () => {
    if (!showSeedPhrase || !mnemonic) return;
    try {
      await Clipboard.setStringAsync(mnemonic);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // A silent copy failure here means the user thinks the seed is saved.
      console.error('Failed to copy seed phrase:', error);
      setCopyFailed(true);
    }
  }, [showSeedPhrase, mnemonic]);

  return (
    <SettingsScreenLayout title={t('general.seed_phrase')} onBack={onBack}>
      <View style={styles.warningContainer}>
        <Ionicons name="warning-outline" size={20} color={colors.status.warning} />
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
            <Ionicons name="eye-outline" size={32} color={colors.text.primary} />
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

      {copyFailed && (
        <WarningNotice
          tone="error"
          title={t('settings.copy_failed')}
          style={styles.copyFailedNotice}
        />
      )}

      <View style={styles.buttonContainer}>
        <SecondaryButton onPress={handleCopy} disabled={!showSeedPhrase} testID="backup-seed-copy-button">
          {copied ? t('wallet.copied') : t('actions.copy').toUpperCase()}
        </SecondaryButton>
        <PrimaryButton onPress={onBack} testID="backup-seed-done-button">
          {t('actions.done').toUpperCase()}
        </PrimaryButton>
      </View>
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.status.warningBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  warningText: {
    flex: 1,
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  seedContainer: {
    position: 'relative',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
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
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: spacing.sm,
  },
  revealText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.md,
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
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  wordIndex: {
    color: colors.text.tertiary,
    fontFamily: fontFamilyNative.medium,
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
    minWidth: 20,
  },
  wordText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.base,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  copyFailedNotice: {
    marginBottom: spacing.lg,
  },
});

export default BackupPanel;
