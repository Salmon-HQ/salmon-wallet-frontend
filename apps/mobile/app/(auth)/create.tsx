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

import { SparkleIcon } from '../../src/icons';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  generateMnemonic,
  lineHeight,
  s,
  setStashItem,
  spacing,
  useSecretCopied,
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
// Step 1: Seed Phrase Component
// ============================================================================

interface SeedPhraseStepProps {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function SeedPhraseStep({ mnemonic, onNext, onBack, t }: SeedPhraseStepProps) {
  const semantic = useSemantic();
  const styles = useThemedStyles(stylesFor);
  // A clipboard write can fail, and advancing depends on it here. Swallowing
  // the failure left the button dead with nothing on screen saying why.
  const [copyFailed, setCopyFailed] = useState(false);
  // The button counts down to the clipboard's clear and cannot copy again
  // until it ends (owner, 2026-11-11).
  const { secondsLeft, markCopied } = useSecretCopied();
  const words = mnemonic ? mnemonic.split(' ') : [];

  const handleCopy = useCallback(async () => {
    try {
      setCopyFailed(false);
      // Cleared 60 s later, or on the return to the app (useSecretClipboard).
      await secretClipboard.copy(mnemonic);
      markCopied();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setCopyFailed(true);
    }
  }, [mnemonic, markCopied]);

  return (
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
              The clipboard warning BackupPanel shows as a card, as one line
              here: the screen must hold the phrase and its three actions
              without scrolling (owner, 2026-11-11).
            */}
          <Text style={styles.clipboardHint} testID="create-seed-clipboard-warning">
            {t('wallet.create.clipboard_hint')}
          </Text>
          {copyFailed && (
            <View style={{ paddingTop: spacing.md }} testID="create-seed-copy-failed">
              <WarningNotice tone="error" title={t('settings.copy_failed')} />
            </View>
          )}
        </View>
      }
      /*
          Pinned, never in the scroll: on an iPhone 16 Pro the phrase and the
          clipboard notice pushed it below the fold, and the disabled button
          beneath gave no hint why (owner, 2026-10-06).
        */
      secondary={
        /*
            Held, not tapped: the phrase lands on the clipboard, where anything
            can read it, so the copy costs the same deliberate half-second as
            signing does.
          */
        <HoldToCopyButton
          onCopy={handleCopy}
          disabled={secondsLeft !== null}
          testID="create-copy-seed-button"
        >
          {secondsLeft === null
            ? t('wallet.create.hold_to_copy')
            : t('wallet.create.copied_clears', { seconds: secondsLeft })}
        </HoldToCopyButton>
      }
      action={
        <PrimaryButton onPress={onNext} testID="create-backed-up-button">
          {t('wallet.create.saved_it')}
        </PrimaryButton>
      }
    />
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
    clipboardHint: {
      paddingTop: spacing.md,
      color: t.text.secondary,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: s(fontSize.body) * lineHeight.snug,
      textAlign: 'center',
    },
  });
