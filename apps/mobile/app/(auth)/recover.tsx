/**
 * RecoverWalletScreen - Recover existing wallet using seed phrase
 *
 * This screen allows users to recover their wallet by entering their
 * 12 or 24 word seed phrase. It validates the mnemonic and navigates
 * to the password setup screen upon successful validation.
 *
 * Design: Dark gradient background with centered content, step indicator,
 * and orange accent buttons.
 */

import { Logo } from '@salmon/assets';
import {
  borderRadius,
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  normalizeMnemonic,
  setStashItem,
  spacing,
  STASH_KEYS,
  validateMnemonic,
} from '@salmon/shared';
import { PrimaryButton, ScreenHeader, SecondaryButton } from '../../src/components';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// Component
// ============================================================================

export default function RecoverWalletScreen() {
  // Hooks
  const { t } = useTranslation();

  // State
  const [seedPhrase, setSeedPhrase] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Check if the seed phrase is valid
   */
  const isValidSeedPhrase = useCallback((): boolean => {
    const normalized = normalizeMnemonic(seedPhrase);
    if (!normalized) return false;
    return validateMnemonic(normalized);
  }, [seedPhrase]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Handle paste from clipboard
   */
  const handlePaste = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setSeedPhrase(clipboardContent);
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  }, []);

  /**
   * Handle next button press - navigate to password screen
   */
  const handleNext = useCallback(async () => {
    if (!isValidSeedPhrase()) return;

    const normalized = normalizeMnemonic(seedPhrase);

    await setStashItem(STASH_KEYS.PENDING_MNEMONIC, normalized);
    router.push({
      pathname: '/(auth)/password',
    });
  }, [seedPhrase, isValidSeedPhrase]);

  /**
   * Determine input border color based on state
   */
  const getInputBorderColor = () => {
    if (isFocused) return colors.accent.primary;
    return colors.input.border;
  };

  const showNextButton = isValidSeedPhrase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header with step indicator */}
          <ScreenHeader onBack={handleBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image source={Logo} style={styles.logo} resizeMode="contain" />
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('wallet.recover.messageTitle')}</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>{t('wallet.recover.messageBody')}</Text>

            {/* Seed Phrase Input */}
            <View style={styles.inputContainer}>
              <TextInput
                testID="recover-seed-input"
                style={[styles.textarea, { borderColor: getInputBorderColor() }]}
                placeholder={t('wallet.recover.placeholder')}
                placeholderTextColor={colors.text.tertiary}
                value={seedPhrase}
                onChangeText={setSeedPhrase}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                multiline
                textAlignVertical="center"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {/* Paste Button - Always visible */}
              <SecondaryButton onPress={handlePaste} testID="recover-paste-button">
                {t('wallet.recover.pasteSeed').toUpperCase()}
              </SecondaryButton>

              {/* Next Button - Only visible when seed phrase is valid */}
              {showNextButton && (
                <PrimaryButton onPress={handleNext} testID="recover-next-button">
                  {t('actions.next').toUpperCase()}
                </PrimaryButton>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: contentPadding.screen,
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: componentSizes.logoSizeMedium,
    height: componentSizes.logoSizeMedium,
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
    marginBottom: spacing['3xl'],
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing['2xl'],
  },
  textarea: {
    width: '100%',
    minHeight: 160,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.lg,
  },
});
