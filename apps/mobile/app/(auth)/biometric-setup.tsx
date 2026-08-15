/**
 * BiometricSetupScreen - Prompt to enable biometric unlock during onboarding
 *
 * Shown after password setup and before the success screen. If the device
 * does not support biometrics the screen auto-skips to success.
 *
 * Design: Same centered layout as success.tsx — logo, icon, title, subtitle,
 * and action buttons at the bottom.
 */

import { Logo } from '@salmon/assets';
import {
  colors,
  componentSizes,
  contentPadding,
  fontFamilyNative,
  getStashItem,
  spacing,
  type DerivedKeyCache,
  semantic,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../../src/components';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================================================
// Constants
// ============================================================================

const ICON_SIZE = 80;

// ============================================================================
// Helpers
// ============================================================================

function getBiometricIcon(
  type: 'fingerprint' | 'facial' | 'iris' | null
): 'finger-print-outline' | 'scan-outline' | 'eye-outline' {
  switch (type) {
    case 'facial':
      return 'scan-outline';
    case 'iris':
      return 'eye-outline';
    default:
      return 'finger-print-outline';
  }
}

// ============================================================================
// Component
// ============================================================================

export default function BiometricSetupScreen() {
  const { t } = useTranslation();
  const { state, storeKeyForBiometric, setEnableBiometric } = useBiometricAuth();
  const [isStoring, setIsStoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSkipped = useRef(false);

  // Auto-skip when biometrics are not available on this device.
  // Wait for isReady so we don't skip before the async capability check completes.
  useEffect(() => {
    if (!state.isReady || hasSkipped.current) return;
    if (!state.isAvailable) {
      hasSkipped.current = true;
      router.replace('/(auth)/analytics-consent');
    }
  }, [state.isReady, state.isAvailable]);

  const buttonLabel = t('wallet.create.biometric_setup_enable');

  const handleEnable = async () => {
    setIsStoring(true);
    setError(null);
    try {
      const keyCache = await getStashItem<DerivedKeyCache>('derived_key_cache');
      if (!keyCache) {
        // Key not available — skip gracefully
        router.replace('/(auth)/analytics-consent');
        return;
      }

      const keyJson = JSON.stringify(keyCache);
      const result = await storeKeyForBiometric(keyJson);

      if (result === 'stored') {
        await setEnableBiometric(true);
        router.replace('/(auth)/analytics-consent');
      } else if (result === 'failed') {
        setError(t('wallet.create.biometric_setup_error'));
      }
    } catch (err) {
      console.error('Biometric setup failed:', err);
      setError(t('wallet.create.biometric_setup_error'));
    } finally {
      setIsStoring(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/analytics-consent');
  };

  // Render nothing while checking availability to avoid a flash
  if (!state.isReady || !state.isAvailable) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered content */}
        <View style={styles.centerContent}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Biometric icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={getBiometricIcon(state.biometricType)}
              size={ICON_SIZE}
              color={colors.text.primary}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('wallet.create.biometric_setup_title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{t('wallet.create.biometric_setup_subtitle')}</Text>

          {/* Error message */}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {/* Bottom buttons */}
        <View style={styles.buttonsContainer}>
          <PrimaryButton
            onPress={handleEnable}
            loading={isStoring}
            disabled={isStoring}
            style={styles.buttonSpacing}
            testID="biometric-enable-button"
          >
            {buttonLabel}
          </PrimaryButton>

          <SecondaryButton onPress={handleSkip} disabled={isStoring} testID="biometric-skip-button">
            {t('wallet.create.biometric_setup_skip')}
          </SecondaryButton>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: contentPadding.screen,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: componentSizes.logoSizeLarge,
    height: componentSizes.logoSizeLarge,
  },
  iconContainer: {
    marginBottom: spacing['2xl'],
  },
  title: {
    color: colors.text.primary,
    fontFamily: fontFamilyNative.bold,
    fontSize: 32,
    lineHeight: 40,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontFamily: fontFamilyNative.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  error: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  buttonsContainer: {
    marginTop: 'auto',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
  },
  buttonSpacing: {
    marginBottom: spacing.lg,
  },
});
