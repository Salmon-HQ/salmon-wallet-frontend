/**
 * CreateWalletScreen - Show and confirm the recovery phrase
 *
 * Shows the 12-word phrase, on the onboarding slot grid, and goes on to the
 * password. The phrase check is not here: the wallet asks for it before its
 * first send (DEV-208, `PhraseBackupContext`), so creating a wallet costs no
 * test the owner may not be ready for yet.
 *
 * The consequences copy that used to be a third step in front of these now
 * has a screen of its own (`seed-warning.tsx`), which is what navigates here.
 * The mnemonic is generated on arrival rather than on a button press, so the
 * phrase this screen shows is the phrase the flow stashes.
 */

import { CheckCircleIcon, SparkleIcon, iconSize } from '../../src/icons';
import {
  borderRadius,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  fontSize,
  generateMnemonic,
  lineHeight,
  motionMs,
  s,
  setStashItem,
  spacing,
  STASH_KEYS,
  type Semantic,
} from '@salmon/shared';
import {
  HoldToCopyButton,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ScreenHeader,
  SeedWordGrid,
  TextButton,
  WarningNotice,
} from '../../src/components';
import { useSemantic, useThemedStyles } from '../../src/theme/useThemedStyles';
import { secretClipboard } from '../../hooks/useSecretClipboard';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// Types
// ============================================================================

/** Warning, phrase, password. */
const CREATE_FLOW_STEPS = 3;

// ============================================================================
// Toast Component
// ============================================================================

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  if (!visible) return null;

  return (
    <View style={styles.toastContainer}>
      <View style={styles.toast}>
        <CheckCircleIcon size={iconSize.md} color={semantic.status.success} />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// Step 1: Seed Phrase Component
// ============================================================================

interface SeedPhraseStepProps {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function SeedPhraseStep({ mnemonic, onNext, onBack, t }: SeedPhraseStepProps) {
  const semantic = useSemantic();
  const [showToast, setShowToast] = useState(false);
  // A clipboard write can fail, and advancing depends on it here. Swallowing
  // the failure left the button dead with nothing on screen saying why.
  const [copyFailed, setCopyFailed] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const words = mnemonic ? mnemonic.split(' ') : [];

  const handleCopy = useCallback(async () => {
    try {
      setCopyFailed(false);
      // Cleared 60 s later, or on the return to the app (useSecretClipboard).
      await secretClipboard.copy(mnemonic);
      setSecretCopied(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), motionMs.feedbackHold);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopyFailed(true);
    }
  }, [mnemonic]);

  return (
    <>
      <OnboardingLayout
        testID="create-seed-screen"
        variant="content"
        backgroundColor={semantic.surface.bedrock}
        scrollBody
        float
        /*
          The sparkle: something new coming into being. The fish leaves the
          flow screens (welcome and the lock keep it); each step wears one
          semantic glyph in the mark slot, consent's pattern and size.
        */
        mark={<SparkleIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
        chrome={
          <ScreenHeader
            onBack={onBack}
            stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 2 }}
          />
        }
        title={<OnboardingTitle>{t('wallet.create.your_seed_phrase')}</OnboardingTitle>}
        description={
          <OnboardingDescription>{t('wallet.create.your_seed_phrase_body')}</OnboardingDescription>
        }
        body={
          // The component gap (`spacing.xl`) between the description and the
          // grid — the "content" variant's compact rung reserves only one
          // description line plus its own buffer, and this screen's copy can
          // wrap to two lines at a short viewport, eating that buffer and
          // leaving the grid flush under the text. Mirrors the DOM twin.
          <View style={{ paddingTop: spacing.xl }}>
            <SeedWordGrid words={words} columns={3} />
            {/*
              The same standing warning BackupPanel and PrivateKeyPanel show
              before either of them lets a secret reach the clipboard. This
              screen shows it too. Mirrors the DOM twin.
            */}
            <View style={{ paddingTop: spacing.lg }} testID="create-seed-clipboard-warning">
              <WarningNotice tone="warning" title={t('settings.clipboard_warning_title')}>
                {t('settings.clipboard_warning_description')}
              </WarningNotice>
            </View>
            {copyFailed && (
              <View style={{ paddingTop: spacing.md }} testID="create-seed-copy-failed">
                <WarningNotice tone="error" title={t('settings.copy_failed')} />
              </View>
            )}
            {secretCopied && (
              <View style={{ paddingTop: spacing.md }} testID="create-seed-clipboard-clears">
                <WarningNotice tone="info" title={t('settings.secret_copied')} />
              </View>
            )}
          </View>
        }
        /*
          Pinned, never in the scroll: on an iPhone 16 Pro the phrase and the
          clipboard notice pushed it below the fold, and the disabled button
          beneath gave no hint why (owner, 2026-10-06).
        */
        assist={
          // Same destination as the primary: the check waits for the first
          // send either way. Saying "later" out loud is the honest choice.
          <TextButton onPress={onNext} testID="create-save-later-button">
            {t('wallet.create.save_later')}
          </TextButton>
        }
        secondary={
          /*
            Held, not tapped: the phrase lands on the clipboard, where anything
            can read it, so the copy costs the same deliberate half-second as
            signing does.
          */
          <HoldToCopyButton onCopy={handleCopy} testID="create-copy-seed-button">
            {t('wallet.create.hold_to_copy')}
          </HoldToCopyButton>
        }
        action={
          <PrimaryButton onPress={onNext} testID="create-backed-up-button">
            {t('wallet.create.saved_it')}
          </PrimaryButton>
        }
      />

      {/* Toast */}
      <Toast message={t('wallet.copied')} visible={showToast} />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateWalletScreen() {
  const { t } = useTranslation();
  // Generated once, on arrival. It used to be generated by the "Start" press
  // on the message step; that step is its own screen now, and generating here
  // keeps the phrase shown and the phrase stashed the same one.
  const [mnemonic] = useState<string>(() => generateMnemonic(128));

  const handleContinue = useCallback(async () => {
    await setStashItem(STASH_KEYS.PENDING_MNEMONIC, mnemonic);
    router.push({
      pathname: '/(auth)/password',
      params: { type: 'create' },
    });
  }, [mnemonic]);

  return <SeedPhraseStep mnemonic={mnemonic} onNext={handleContinue} onBack={router.back} t={t} />;
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    // Toast
    toastContainer: {
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: contentPadding.screen,
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.overlay.backdrop,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius['2xl'],
      gap: spacing.sm,
    },
    toastText: {
      color: t.text.primary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.snug,
    },
  });
