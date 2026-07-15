/**
 * WelcomeScreen - Onboarding entry point
 *
 * This screen is displayed when the user first opens the app or when
 * they need to create or recover a wallet. It provides options to
 * create a new account or recover an existing one.
 *
 * If the user has existing accounts stored, it also shows an option
 * to access them via the lock screen.
 *
 * Design: Dark gradient background with centered content, action buttons.
 */

import { Logo } from '@salmon/assets';
import {
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  fontSize,
  spacing,
  useAccountsContext,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// Component
// ============================================================================

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const [state, actions] = useAccountsContext();

  // Check if there are existing accounts stored
  const hasAccounts = state.accounts && state.accounts.length > 0;

  /**
   * Navigate to account creation flow
   */
  const handleCreateAccount = () => {
    router.push('/(auth)/create');
  };

  /**
   * Navigate to account recovery flow
   */
  const handleRecoverAccount = () => {
    router.push('/(auth)/recover');
  };

  /**
   * Lock accounts and navigate to main app where the GateContainer
   * lock state will show.
   */
  const handleAccessExistingAccount = async () => {
    await actions.lockAccounts();
    router.replace('/(app)/(tabs)');
  };

  // Determine title based on whether user has accounts
  const title = hasAccounts
    ? t('wallet.onboarding.titleOnboarded')
    : t('wallet.onboarding.titleWelcome');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Centered content: Welcome, Logo, Brand Name */}
        <View style={styles.centerContent}>
          <Text style={styles.welcomeText}>{title}</Text>
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brandName}>Salmon</Text>
        </View>

        {/* Buttons Container - stays at bottom */}
        <View style={styles.buttonsContainer}>
          {/* Create Account Button (Primary - White) */}
          <PrimaryButton onPress={handleCreateAccount} testID="select-create-button">
            {t('wallet.create_wallet').toUpperCase()}
          </PrimaryButton>

          {/* Recover Account Button (Secondary - Dark) */}
          <SecondaryButton onPress={handleRecoverAccount} testID="select-recover-button">
            {t('wallet.recover_wallet').toUpperCase()}
          </SecondaryButton>

          {/* Access Existing Account Button (only if accounts exist) */}
          {hasAccounts && (
            <SecondaryButton onPress={handleAccessExistingAccount} testID="select-access-existing-button">
              {t('wallet.access_existing_account').toUpperCase()}
            </SecondaryButton>
          )}
        </View>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: contentPadding.screen,
    paddingBottom: spacing['3xl'],
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: fontSize['2xl'],
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: componentSizes.logoSizeMedium,
    height: componentSizes.logoSizeMedium,
  },
  brandName: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  buttonsContainer: {
    width: '100%',
    gap: spacing.lg,
  },
});
