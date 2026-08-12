/**
 * CreateWalletScreen - Create new wallet with seed phrase backup
 *
 * This screen guides users through the wallet creation process:
 * 1. Message - Explains importance of backing up seed phrase
 * 2. Show seed phrase - Generates and displays 12-word mnemonic
 * 3. Validate backup - User enters 3 random words to confirm backup
 * 4. Navigate to password screen to complete setup
 *
 * Design: Dark gradient background with centered content, step indicator,
 * and orange accent buttons. Seed phrase displayed in 3-column grid.
 */

import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@salmon/assets';
import {
  borderRadius,
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  generateMnemonic,
  generateValidationPositions,
  setStashItem,
  spacing,
  STASH_KEYS,
  validateMnemonicWords,
} from '@salmon/shared';
import {
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  SeedWordGrid,
  SeedWordInput,
} from '../../src/components';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// Types
// ============================================================================

type Step = 'message' | 'seedPhrase' | 'validate';

interface ValidationWord {
  position: number;
  expectedWord: string;
  userInput: string;
}

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
        <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// Step 1: Message Component
// ============================================================================

interface MessageStepProps {
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function MessageStep({ onNext, onBack, t }: MessageStepProps) {
  return (
    <>
      <ScreenHeader onBack={onBack} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('wallet.create.messageTitle')}</Text>

        {/* Body */}
        <Text style={styles.bodyText}>{t('wallet.create.messageBody')}</Text>

        {/* Spacer */}
        <View style={styles.flexSpacer} />

        {/* Start Button */}
        <PrimaryButton onPress={onNext} style={styles.button} testID="create-start-button">
          {t('actions.start').toUpperCase()}
        </PrimaryButton>
      </ScrollView>
    </>
  );
}

// ============================================================================
// Step 2: Seed Phrase Component
// ============================================================================

interface SeedPhraseStepProps {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function SeedPhraseStep({ mnemonic, onNext, onBack, t }: SeedPhraseStepProps) {
  const [showToast, setShowToast] = useState(false);
  const words = mnemonic.split(' ');

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(mnemonic);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [mnemonic]);

  return (
    <>
      <ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 3, currentStep: 1 }} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainerSmall}>
          <Image source={Logo} style={styles.logoSmall} resizeMode="contain" />
        </View>

        {/* Title */}
        <Text style={styles.title}>{t('wallet.create.your_seed_phrase')}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{t('wallet.create.your_seed_phrase_body')}</Text>

        {/* Seed Word Grid */}
        <View style={styles.seedGridContainer}>
          <SeedWordGrid words={words} columns={3} />
        </View>

        {/* Copy Button */}
        <View style={styles.copyButtonContainer}>
          <SecondaryButton
            onPress={handleCopy}
            style={styles.button}
            testID="create-copy-seed-button"
          >
            {t('wallet.create.copy_key').toUpperCase()}
          </SecondaryButton>
        </View>

        {/* Backed Up Button */}
        <PrimaryButton onPress={onNext} style={styles.button} testID="create-backed-up-button">
          {t('wallet.create.ive_backed_up_seed_phrase').toUpperCase()}
        </PrimaryButton>
      </ScrollView>

      {/* Toast */}
      <Toast message={t('wallet.copied')} visible={showToast} />
    </>
  );
}

// ============================================================================
// Step 3: Validate Seed Phrase Component
// ============================================================================

interface ValidateStepProps {
  mnemonic: string;
  onComplete: () => void;
  onBack: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

function ValidateStep({ mnemonic, onComplete, onBack, t }: ValidateStepProps) {
  const words = useMemo(() => mnemonic.split(' '), [mnemonic]);
  const [validationWords, setValidationWords] = useState<ValidationWord[]>([]);

  // Generate random positions on mount using shared utility
  useEffect(() => {
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
    <>
      <ScreenHeader onBack={onBack} stepIndicator={{ totalSteps: 3, currentStep: 2 }} />

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainerSmall}>
            <Image source={Logo} style={styles.logoSmall} resizeMode="contain" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('wallet.create.confirm_seed_phrase')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{t('wallet.create.confirm_seed_phrase_body')}</Text>

          {/* Validation Inputs */}
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

          {/* Spacer */}
          <View style={styles.flexSpacer} />

          {/* Next Button */}
          <PrimaryButton
            onPress={onComplete}
            disabled={!validationResult.isValid}
            style={styles.button}
            testID="create-next-button"
          >
            {t('actions.next').toUpperCase()}
          </PrimaryButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateWalletScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('message');
  const [mnemonic, setMnemonic] = useState<string>('');

  /**
   * Handle starting the creation flow - generate mnemonic
   */
  const handleStart = useCallback(() => {
    // Generate a new 12-word mnemonic (128 bits)
    const newMnemonic = generateMnemonic(128);
    setMnemonic(newMnemonic);
    setStep('seedPhrase');
  }, []);

  /**
   * Handle back navigation based on current step
   */
  const handleBack = useCallback(() => {
    switch (step) {
      case 'message':
        router.back();
        break;
      case 'seedPhrase':
        setStep('message');
        break;
      case 'validate':
        setStep('seedPhrase');
        break;
    }
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {step === 'message' && <MessageStep onNext={handleStart} onBack={handleBack} t={t} />}

      {step === 'seedPhrase' && (
        <SeedPhraseStep
          mnemonic={mnemonic}
          onNext={handleProceedToValidation}
          onBack={handleBack}
          t={t}
        />
      )}

      {step === 'validate' && (
        <ValidateStep
          mnemonic={mnemonic}
          onComplete={handleValidationComplete}
          onBack={handleBack}
          t={t}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: contentPadding.screen,
    paddingBottom: spacing['2xl'],
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: contentPadding.screen,
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
    marginTop: spacing['5xl'],
  },
  logoContainerSmall: {
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  logo: {
    width: componentSizes.logoSizeLarge,
    height: componentSizes.logoSizeLarge,
  },
  logoSmall: {
    width: componentSizes.logoSizeSmall,
    height: componentSizes.logoSizeSmall,
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: 24,
    lineHeight: 32,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  bodyText: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing['3xl'],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  flexSpacer: {
    flex: 1,
  },
  button: {
    marginBottom: spacing['2xl'],
  },
  seedGridContainer: {
    width: '100%',
    marginBottom: spacing['2xl'],
  },
  copyButtonContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
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
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius['2xl'],
    gap: spacing.sm,
  },
  toastText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
