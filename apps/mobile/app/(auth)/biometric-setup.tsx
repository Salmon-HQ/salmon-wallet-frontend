/**
 * BiometricSetupScreen - Prompt to enable biometric unlock during onboarding
 *
 * Shown after password setup and before the analytics consent step. If the
 * device does not support biometrics the screen auto-skips.
 *
 * Composed on the onboarding slot grid. The biometric glyph used to sit
 * *between* the mark and the title — a position no other screen has — so it
 * lives in `body` now, and the enrolment error occupies the reserved `assist`
 * band instead of pushing the buttons down when it appears.
 */

import {
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  getStashItem,
  lineHeight,
  spacing,
  type DerivedKeyCache,
  semantic,
} from '@salmon/shared';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { EyeIcon, FingerprintIcon, ScanIcon } from '../../src/icons';
import type { IconComponent } from '../../src/icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

// ============================================================================
// Constants
// ============================================================================

const ICON_SIZE = 80;

// ============================================================================
// Helpers
// ============================================================================

function getBiometricIcon(type: 'fingerprint' | 'facial' | 'iris' | null): IconComponent {
  switch (type) {
    case 'facial':
      return ScanIcon;
    case 'iris':
      return EyeIcon;
    default:
      return FingerprintIcon;
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
      router.replace('/(auth)/success');
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
        router.replace('/(auth)/success');
        return;
      }

      const keyJson = JSON.stringify(keyCache);
      const result = await storeKeyForBiometric(keyJson);

      if (result === 'stored') {
        await setEnableBiometric(true);
        router.replace('/(auth)/success');
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
    router.replace('/(auth)/success');
  };

  const BiometricIcon = getBiometricIcon(state.biometricType);

  // Render nothing while checking availability to avoid a flash
  if (!state.isReady || !state.isAvailable) {
    return null;
  }

  return (
    <OnboardingLayout
      testID="biometric-setup-screen"
      title={<OnboardingTitle>{t('wallet.create.biometric_setup_title')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.create.biometric_setup_subtitle')}</OnboardingDescription>
      }
      body={
        <View style={styles.iconContainer}>
          <BiometricIcon size={ICON_SIZE} color={semantic.text.primary} />
        </View>
      }
      assist={
        error ? (
          <Text style={styles.error} maxFontSizeMultiplier={fontScaleCap.chrome}>
            {error}
          </Text>
        ) : undefined
      }
      secondary={
        <SecondaryButton onPress={handleSkip} disabled={isStoring} testID="biometric-skip-button">
          {t('wallet.create.biometric_setup_skip')}
        </SecondaryButton>
      }
      action={
        <PrimaryButton
          onPress={handleEnable}
          loading={isStoring}
          disabled={isStoring}
          testID="biometric-enable-button"
        >
          {buttonLabel}
        </PrimaryButton>
      }
    />
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  iconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  error: {
    color: semantic.status.danger,
    fontFamily: fontFamilyNative.regular,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * lineHeight.snug,
    textAlign: 'center',
  },
});
