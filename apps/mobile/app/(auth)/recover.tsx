/**
 * RecoverWalletScreen - Recover existing wallet using seed phrase
 *
 * The phrase is typed one word per box (`SeedPhraseEntry`) rather than into a
 * single textarea: space commits a word and moves to the next box, a paste
 * fills every box at once, and backspace in an empty box steps back. A free
 * textarea hid a missing or transposed word behind a wall of text, and let the
 * keyboard "correct" a valid word into an invalid mnemonic.
 *
 * Composed on the onboarding slot grid. The "Next" action used to be mounted
 * conditionally inside a vertically centred column, so the moment the twelfth
 * valid word was typed the mark, title, description and input all jumped 36pt
 * at once. The action now lives in its reserved band whether or not the phrase
 * is valid; only its visibility changes.
 */

import {
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  setStashItem,
  spacing,
  STASH_KEYS,
  useRecoveryPhraseEntry,
  type Semantic,
} from '@salmon/shared';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ReservedSlot,
  ScreenHeader,
  SecondaryButton,
  SeedPhraseEntry,
} from '../../src/components';
import { KeyIcon } from '../../src/icons';
import { useSecretScreen } from '../../hooks/useSecretScreen';
import { useSemantic, useThemedStyles } from '../../src/theme/useThemedStyles';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function RecoverWalletScreen() {
  // Hooks
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();

  // `SeedWordInput` already opts every box in; this covers the screen itself
  // for the frames where no box is mounted yet.
  useSecretScreen('recover-wallet');

  const {
    words,
    phrase,
    pastedCount,
    setPastedCount,
    isValidSeedPhrase,
    showInvalid,
    handleWords,
    handleLength,
    paste,
  } = useRecoveryPhraseEntry();

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Paste from the clipboard. Goes through the same fill the grid uses, so the
   * button and an in-box paste cannot behave differently.
   */
  const handlePaste = useCallback(async () => {
    try {
      paste(await Clipboard.getStringAsync());
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, [paste]);

  /**
   * Handle next button press - navigate to password screen
   */
  const handleNext = useCallback(async () => {
    if (!isValidSeedPhrase) return;

    await setStashItem(STASH_KEYS.PENDING_MNEMONIC, phrase);
    router.push({
      pathname: '/(auth)/password',
    });
  }, [isValidSeedPhrase, phrase]);

  return (
    <OnboardingLayout
      testID="recover-screen"
      variant="content"
      /*
        No bedrock here (owner, 2026-08-18): the Bedrock Rule narrowed to the
        EXHIBITION of a seed — create's warning/display/validate. Entering an
        existing phrase is not the ceremonial moment of its birth, so recover
        stands in the same water as the rest of the stack (the layout's
        DepthBackground + ScalesBackground show through the transparent
        content). The capture protection (`useSecretScreen`) is unchanged.
      */
      scrollBody
      float
      chrome={
        <ScreenHeader onBack={handleBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />
      }
      /*
        The key: what this screen asks for is the thing that reopens the
        wallet. The fish leaves the flow screens — it stays on welcome and the
        lock only — and each step names itself with the consent screen's
        pattern: one semantic glyph in the mark slot, same size, same ink.
      */
      mark={<KeyIcon size={componentSizes.logoSizeSmall} color={semantic.text.primary} />}
      title={<OnboardingTitle>{t('wallet.recover.messageTitle')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.recover.messageBody')}</OnboardingDescription>}
      body={
        <SeedPhraseEntry
          words={words}
          onChange={handleWords}
          onLengthChange={handleLength}
          onPasteRejected={setPastedCount}
        />
      }
      assist={
        showInvalid ? (
          <Text
            style={styles.invalid}
            maxFontSizeMultiplier={fontScaleCap.chrome}
            testID="recover-invalid-phrase"
          >
            {pastedCount !== null
              ? t('wallet.recover.pastedWordCount', { count: pastedCount })
              : t('wallet.create.invalidSeed')}
          </Text>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={handlePaste} testID="recover-paste-button">
          {t('wallet.recover.pasteSeed')}
        </SecondaryButton>
      }
      action={
        <ReservedSlot visible={isValidSeedPhrase}>
          <PrimaryButton onPress={handleNext} testID="recover-next-button">
            {t('actions.next')}
          </PrimaryButton>
        </ReservedSlot>
      }
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    invalid: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.snug,
      paddingHorizontal: spacing.sm,
      textAlign: 'center',
    },
  });
