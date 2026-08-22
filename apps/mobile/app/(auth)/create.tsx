/**
 * CreateWalletScreen - Show and confirm the recovery phrase
 *
 * Two steps, both on the onboarding slot grid:
 * 1. Show seed phrase - Generates and displays the 12-word mnemonic
 * 2. Validate backup - User enters 3 random words to confirm backup
 *
 * The consequences copy that used to be a third step in front of these now
 * has a screen of its own (`seed-warning.tsx`), which is what navigates here.
 * The mnemonic is generated on arrival rather than on a button press, so the
 * phrase this screen shows is the phrase the flow stashes.
 */

import { CheckCircleIcon, SparkleIcon, iconSize } from '../../src/icons';
import {
  borderRadius,
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  fontSize,
  generateMnemonic,
  generateValidationPositions,
  lineHeight,
  motionMs,
  semantic,
  setStashItem,
  spacing,
  STASH_KEYS,
  validateMnemonicWords,
} from '@salmon/shared';
import {
  HoldToCopyButton,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  ScreenHeader,
  SeedWordGrid,
  SeedWordInput,
} from '../../src/components';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// Types
// ============================================================================

type Step = 'seedPhrase' | 'validate';

interface ValidationWord {
  position: number;
  expectedWord: string;
  userInput: string;
}

/** Warning, phrase, confirmation, password. */
const CREATE_FLOW_STEPS = 4;

// ============================================================================
// Toast Component
// ============================================================================

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
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
  const [showToast, setShowToast] = useState(false);
  const words = mnemonic ? mnemonic.split(' ') : [];

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(mnemonic);
      setShowToast(true);
      setTimeout(() => setShowToast(false), motionMs.feedbackHold);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
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
        mark={<SparkleIcon size={componentSizes.logoSizeSmall} color={colors.text.primary} />}
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
        body={<SeedWordGrid words={words} columns={3} />}
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
            {t('wallet.create.ive_backed_up_seed_phrase')}
          </PrimaryButton>
        }
      />

      {/* Toast */}
      <Toast message={t('wallet.copied')} visible={showToast} />
    </>
  );
}

// ============================================================================
// Step 2: Validate Seed Phrase Component
// ============================================================================

interface ValidateStepProps {
  mnemonic: string;
  onComplete: () => void;
  onBack: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

function ValidateStep({ mnemonic, onComplete, onBack, t }: ValidateStepProps) {
  const words = useMemo(() => (mnemonic ? mnemonic.split(' ') : []), [mnemonic]);
  const [validationWords, setValidationWords] = useState<ValidationWord[]>([]);

  // Generate random positions on mount using shared utility
  useEffect(() => {
    if (words.length === 0) return;
    const positions = generateValidationPositions(words.length, 3);
    setValidationWords(
      positions.map((pos) => ({
        position: pos,
        expectedWord: words[pos - 1],
        userInput: '',
      }))
    );
  }, [words]);

  // Check validation using shared utility
  const validationResult = useMemo(() => {
    if (validationWords.length === 0) return { isValid: false, results: [] };
    return validateMnemonicWords(
      mnemonic,
      validationWords.map((vw) => vw.position),
      validationWords.map((vw) => vw.userInput)
    );
  }, [mnemonic, validationWords]);

  const handleInputChange = useCallback((index: number, value: string) => {
    setValidationWords((prev) =>
      prev.map((vw, i) => (i === index ? { ...vw, userInput: value } : vw))
    );
  }, []);

  const getValidationState = useCallback(
    (index: number): 'idle' | 'correct' | 'incorrect' => {
      const vw = validationWords[index];
      if (!vw || !vw.userInput) return 'idle';
      const result = validationResult.results[index];
      if (!result) return 'idle';
      return result.isCorrect ? 'correct' : 'incorrect';
    },
    [validationWords, validationResult]
  );

  return (
    <OnboardingLayout
      testID="create-validate-screen"
      variant="content"
      backgroundColor={semantic.surface.bedrock}
      scrollBody
      float
      // Same glyph as the phrase it confirms — the step dots carry which half
      // of the creation this is.
      mark={<SparkleIcon size={componentSizes.logoSizeSmall} color={colors.text.primary} />}
      chrome={
        <ScreenHeader
          onBack={onBack}
          stepIndicator={{ totalSteps: CREATE_FLOW_STEPS, currentStep: 3 }}
        />
      }
      title={<OnboardingTitle>{t('wallet.create.confirm_seed_phrase')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.create.confirm_seed_phrase_body')}</OnboardingDescription>
      }
      body={
        <View style={styles.validationInputs}>
          {validationWords.map((vw, index) => (
            <SeedWordInput
              key={`word-${vw.position}`}
              testID={`create-confirm-word-input-${vw.position}`}
              position={vw.position}
              value={vw.userInput}
              onChangeText={(value) => handleInputChange(index, value)}
              validationState={getValidationState(index)}
              autoFocus={index === 0}
              onSubmitEditing={() => {
                if (index === validationWords.length - 1 && validationResult.isValid) {
                  onComplete();
                }
              }}
            />
          ))}
        </View>
      }
      action={
        <PrimaryButton
          onPress={onComplete}
          disabled={!validationResult.isValid}
          testID="create-next-button"
        >
          {t('actions.next')}
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
  const [step, setStep] = useState<Step>('seedPhrase');
  // Generated once, on arrival. It used to be generated by the "Start" press
  // on the message step; that step is its own screen now, and generating here
  // keeps the phrase shown and the phrase stashed the same one.
  const [mnemonic] = useState<string>(() => generateMnemonic(128));

  /**
   * Handle back navigation based on current step
   */
  const handleBack = useCallback(() => {
    if (step === 'validate') {
      setStep('seedPhrase');
      return;
    }
    router.back();
  }, [step]);

  /**
   * Handle proceeding to validation step
   */
  const handleProceedToValidation = useCallback(() => {
    setStep('validate');
  }, []);

  /**
   * Handle validation complete - navigate to password screen
   */
  const handleValidationComplete = useCallback(async () => {
    await setStashItem(STASH_KEYS.PENDING_MNEMONIC, mnemonic);
    router.push({
      pathname: '/(auth)/password',
      params: { type: 'create' },
    });
  }, [mnemonic]);

  if (step === 'validate') {
    return (
      <ValidateStep
        mnemonic={mnemonic}
        onComplete={handleValidationComplete}
        onBack={handleBack}
        t={t}
      />
    );
  }

  return (
    <SeedPhraseStep
      mnemonic={mnemonic}
      onNext={handleProceedToValidation}
      onBack={handleBack}
      t={t}
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  validationInputs: {
    width: '100%',
    gap: spacing.lg,
  },

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
    backgroundColor: colors.dialog.overlay,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    gap: spacing.sm,
  },
  toastText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.snug,
  },
});
