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

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { EyeIcon, iconSize } from '../../icons';
import { useTranslation } from 'react-i18next';

import {
  borderRadius,
  fontFamilyNative,
  fontSize,
  lineHeight,
  s,
  spacing,
  useAccountsContext,
  getAccountMnemonic,
  type Semantic,
} from '@salmon/shared';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { SettingsScreenLayout } from '../SettingsScreenLayout';
import { PrimaryButton, SecondaryButton } from '../Button';
import { ConfirmSheet } from '../ConfirmSheet';
import { SeedWordGrid } from '../SeedPhrase';
import { WarningNotice } from '../WarningNotice';
import { useSecretScreen } from '../../../hooks/useSecretScreen';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';

interface BackupPanelProps {
  onBack: () => void;
  biometricAvailable?: boolean;
  authenticateWithBiometric?: () => Promise<string | null>;
}

/** What a covered cell shows. Same character count for every word, so the
 *  covered grid gives away nothing about the phrase's shape. */
const MASK = '••••••';

export function BackupPanel({
  onBack,
  biometricAvailable,
  authenticateWithBiometric,
}: BackupPanelProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();

  // `SeedWordGrid` protects the frames it is mounted for; the panel holds the
  // mnemonic in memory for its whole lifetime, including before the reveal, so
  // it opts in on its own behalf too.
  useSecretScreen('backup-panel');

  const [accountState, accountActions] = useAccountsContext();
  const { activeAccount } = accountState;

  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [reauthVisible, setReauthVisible] = useState(false);
  const { copied, trigger: showCopied } = useCopyFeedback();
  const [copyFailed, setCopyFailed] = useState(false);

  // An account imported from a private key has no seed phrase to back up.
  const mnemonic = useMemo(() => getAccountMnemonic(activeAccount) ?? '', [activeAccount]);
  const words = useMemo(() => mnemonic.split(' ').filter(Boolean), [mnemonic]);
  // An account imported from a private key has no phrase behind it: without
  // this the screen renders an empty grid under a "tap to reveal" overlay.
  const hasNoMnemonic = words.length === 0;
  const shownWords = useMemo(
    () => (showSeedPhrase ? words : words.map(() => MASK)),
    [showSeedPhrase, words]
  );

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
            <TouchableOpacity
              style={styles.revealCover}
              onPress={handleReveal}
              activeOpacity={0.8}
              testID="backup-seed-reveal-overlay"
              accessibilityRole="button"
            >
              <EyeIcon size={iconSize.xl} color={text.primary} />
              <Text style={styles.revealText}>{t('settings.wallets.tap_to_reveal')}</Text>
            </TouchableOpacity>
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
    // The Bedrock Rule (DESIGN.md): the cover over an unrevealed phrase is
    // opaque bedrock, not a translucent scrim — a scrim over masked cells reads
    // as a loading state, and it lets the water column through the gate.
    revealCover: {
      ...StyleSheet.absoluteFillObject,
      // Declared, not implied by sibling order: a reorder must not uncover the gate.
      zIndex: 10,
      backgroundColor: t.surface.bedrock,
      borderRadius: borderRadius.r3,
      alignItems: 'center',
      justifyContent: 'center',
      gap: s(spacing.sm),
    },
    revealText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.medium,
      fontSize: s(fontSize.bodyLg),
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
