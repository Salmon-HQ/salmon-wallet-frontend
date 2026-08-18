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
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  normalizeMnemonic,
  semantic,
  setStashItem,
  spacing,
  STASH_KEYS,
  validateMnemonic,
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
import { SHORT_PHRASE, distributePhrase } from '../../src/components/SeedPhrase';
import { useSecretScreen } from '../../hooks/useSecretScreen';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function RecoverWalletScreen() {
  // Hooks
  const { t } = useTranslation();

  // `SeedWordInput` already opts every box in; this covers the screen itself
  // for the frames where no box is mounted yet.
  useSecretScreen('recover-wallet');

  // State — one entry per box. Twelve to begin with; a paste or a thirteenth
  // typed word grows it to twenty-four.
  const [words, setWords] = useState<string[]>(() => Array<string>(SHORT_PHRASE).fill(''));
  // The count of what was actually pasted, so the screen can say what happened
  // rather than only that something is wrong. `null` means nothing was rejected.
  const [pastedCount, setPastedCount] = useState<number | null>(null);

  const phrase = useMemo(() => normalizeMnemonic(words.join(' ')), [words]);
  const isComplete = words.every((word) => word.length > 0);
  const isValidSeedPhrase = isComplete && validateMnemonic(phrase);

  const handleWords = useCallback((next: string[]) => {
    setWords(next);
    setPastedCount(null);
  }, []);

  const handleLength = useCallback((length: number) => {
    setWords((prev) => {
      if (prev.length === length) return prev;
      return Array.from({ length }, (_, i) => prev[i] ?? '');
    });
  }, []);

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
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent) return;
      const { words: pasted, fits, count } = distributePhrase(clipboardContent);
      setPastedCount(fits ? null : count);
      setWords(pasted);
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, []);

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

  // Only once every box is filled — telling someone their phrase is invalid
  // while they are still typing it is noise.
  const showInvalid = pastedCount !== null || (isComplete && !isValidSeedPhrase);

  return (
    <OnboardingLayout
      testID="recover-screen"
      variant="content"
      backgroundColor={semantic.surface.bedrock}
      scrollBody
      chrome={<ScreenHeader onBack={handleBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />}
      title={<OnboardingTitle>{t('wallet.recover.messageTitle')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.recover.messageBody')}</OnboardingDescription>
      }
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

const styles = StyleSheet.create({
  invalid: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.snug,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
});
