/**
 * BiometricScreen - Optional biometric enrollment after wallet creation/recovery
 *
 * This screen is shown after the password step if the device supports biometrics.
 * It allows the user to enable Face ID / Touch ID for quick wallet unlock.
 *
 * If the user skips, they can always enable it later from Settings > Security.
 */

import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@salmon/assets';
import {
  colors,
  componentSizes,
  contentPadding,
  DerivedKeyCache,
  fontFamilyNative,
  getStashItem,
  spacing,
  STASH_KEYS,
} from '@salmon/shared';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, ScreenHeader, TextButton } from '../../src/components';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';

export default function BiometricScreen() {
  const { t } = useTranslation();
  const { state: biometricState, storeKeyForBiometric, setEnableBiometric } = useBiometricAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get the biometric label based on type
   */
  const getBiometricLabel = useCallback(() => {
    switch (biometricState.biometricType) {
      case 'facial':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      case 'iris':
        return 'Iris';
      default:
        return t('lock_screen.use_biometric');
    }
  }, [biometricState.biometricType, t]);

  /**
   * Get the icon name based on biometric type
   */
  const getIconName = useCallback((): keyof typeof Ionicons.glyphMap => {
    switch (biometricState.biometricType) {
      case 'facial':
        return 'scan-outline';
      case 'fingerprint':
        return 'finger-print-outline';
      default:
        return 'shield-checkmark-outline';
    }
  }, [biometricState.biometricType]);

  /**
   * Handle enabling biometric auth
   */
  const handleEnable = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get the cached derived key from stash (set by addAccount in password screen)
      const keyCache = await getStashItem<DerivedKeyCache>(STASH_KEYS.DERIVED_KEY);

      if (!keyCache) {
        // No cached key available, skip biometric setup
        router.replace('/(auth)/success');
        return;
      }

      // Store the key with biometric protection (this triggers the OS biometric prompt)
      const stored = await storeKeyForBiometric(JSON.stringify(keyCache));

      if (stored) {
        await setEnableBiometric(true);
        router.replace('/(auth)/success');
      } else {
        setError(t('wallet.create.biometric_error'));
      }
    } catch (err) {
      console.error('Failed to enable biometric:', err);
      setError(t('wallet.create.biometric_error'));
    } finally {
      setIsLoading(false);
    }
  }, [storeKeyForBiometric, setEnableBiometric, t]);

  /**
   * Handle skip - go directly to success
   */
  const handleSkip = useCallback(() => {
    router.replace('/(auth)/success');
  }, []);

  const biometricLabel = getBiometricLabel();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Biometric Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={getIconName()}
            size={64}
            color={colors.accent.primary}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {t('wallet.create.biometric_title', { type: biometricLabel })}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {t('wallet.create.biometric_subtitle')}
        </Text>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Spacer */}
        <View style={styles.flexSpacer} />

        {/* Enable Button */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            onPress={handleEnable}
            loading={isLoading}
            style={styles.buttonSpacing}
          >
            {t('wallet.create.biometric_enable', { type: biometricLabel })}
          </PrimaryButton>

          {/* Skip Button */}
          <TextButton onPress={handleSkip} color={colors.text.secondary}>
            {t('wallet.create.biometric_skip')}
          </TextButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: contentPadding.screen,
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
    marginTop: spacing['3xl'],
  },
  logo: {
    width: componentSizes.logoSizeMedium,
    height: componentSizes.logoSizeMedium,
  },
  iconContainer: {
    marginBottom: spacing['2xl'],
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: 28,
    lineHeight: 36,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.status.error,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  flexSpacer: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
  },
  buttonSpacing: {
    marginBottom: spacing.lg,
  },
});
