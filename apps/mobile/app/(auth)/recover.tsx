/**
 * RecoverWalletScreen - Recover existing wallet using seed phrase
 *
 * This screen allows users to recover their wallet by entering their
 * 12 or 24 word seed phrase. It validates the mnemonic and navigates
 * to the password setup screen upon successful validation.
 *
 * Composed on the onboarding slot grid. The "Next" action used to be mounted
 * conditionally inside a vertically centred column, so the moment the twelfth
 * valid word was typed the mark, title, description and input all jumped 36pt
 * at once — the worst defect the layout audit found, and it happened while the
 * user was still typing. The action now lives in its reserved band whether or
 * not the phrase is valid; only its visibility changes.
 */

import {
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
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
} from '../../src/components';
import { useSecretScreen } from '../../hooks/useSecretScreen';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

// ============================================================================
// Component
// ============================================================================

export default function RecoverWalletScreen() {
  // Hooks
  const { t } = useTranslation();

  // The phrase is typed into one bulk TextInput here rather than the
  // SeedWordInput primitive, so this screen opts in explicitly.
  useSecretScreen('recover-wallet');

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
    <OnboardingLayout
      testID="recover-screen"
      backgroundColor={semantic.surface.bedrock}
      chrome={
        <ScreenHeader onBack={handleBack} stepIndicator={{ totalSteps: 2, currentStep: 1 }} />
      }
      title={<OnboardingTitle>{t('wallet.recover.messageTitle')}</OnboardingTitle>}
      description={<OnboardingDescription>{t('wallet.recover.messageBody')}</OnboardingDescription>}
      body={
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
      }
      secondary={
        <SecondaryButton onPress={handlePaste} testID="recover-paste-button">
          {t('wallet.recover.pasteSeed').toUpperCase()}
        </SecondaryButton>
      }
      action={
        <ReservedSlot visible={showNextButton}>
          <PrimaryButton onPress={handleNext} testID="recover-next-button">
            {t('actions.next').toUpperCase()}
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
  inputContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  /**
   * The field fills what `body` gives it rather than declaring a height of
   * its own. A hardcoded 160 was neither the `inputHeight` token nor related
   * to the space actually available, so it fought the grid on short screens.
   */
  textarea: {
    width: '100%',
    flexShrink: 1,
    minHeight: componentSizes.inputHeight,
    maxHeight: '100%',
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderRadius: componentSizes.inputRadius,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    color: colors.text.primary,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.bodyLg,
    textAlign: 'center',
  },
});
