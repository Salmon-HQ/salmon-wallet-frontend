/**
 * BiometricSetupScreen - Prompt to enable biometric unlock during onboarding
 *
 * Shown after password setup and before the analytics consent step. If the
 * device does not support biometrics the screen auto-skips.
 *
 * Composed on the onboarding slot grid. The biometric glyph is the screen's
 * only icon and sits in the `mark` slot, where the fish sat before the fish
 * was pulled back to welcome and the lock (owner, 2026-08-18) — the consent
 * screen's pattern, one glyph per step. The enrolment error occupies the
 * reserved `assist` band instead of pushing the buttons down when it appears.
 */

import {
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  lineHeight,
  s,
  type BiometricKind,
  type Semantic,
} from '@salmon/shared';
import {
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components';
import { useBiometric } from '../../src/contexts/BiometricContext';
import { useEnrolmentPassword } from '../../src/contexts/EnrolmentPasswordContext';
import { EyeIcon, FingerprintIcon, ScanIcon } from '../../src/icons';
import type { IconComponent } from '../../src/icons';
import { useSemantic, useThemedStyles } from '../../src/theme/useThemedStyles';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

// ============================================================================
// Constants
// ============================================================================

/** The glyph fills the top slot: the grid's own mark size for flow steps. */
const ICON_SIZE = componentSizes.logoSizeSmall;

// ============================================================================
// Helpers
// ============================================================================

function getBiometricIcon(type: BiometricKind | null): IconComponent {
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
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
  const { ready, available, kind, arm } = useBiometric();
  const enrolmentPassword = useEnrolmentPassword();
  const [isStoring, setIsStoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSkipped = useRef(false);

  // Auto-skip when biometrics are not available on this device.
  // Wait for `ready` so we don't skip before the async capability check completes.
  useEffect(() => {
    if (!ready || hasSkipped.current) return;
    if (!available) {
      hasSkipped.current = true;
      router.replace('/(auth)/success');
    }
  }, [ready, available]);

  const buttonLabel = t('wallet.create.biometric_setup_enable');

  const handleEnable = async () => {
    setIsStoring(true);
    setError(null);
    try {
      // The password the previous step set, handed over in memory. Arming
      // seals it; the vault key it used to seal instead was pinned to the
      // vault's salt, and died the first time the vault was re-encrypted.
      const password = enrolmentPassword?.read() ?? null;
      if (!password) {
        // Nothing to seal — this is reachable only if the flow was entered out
        // of order. Skipping leaves the user with a working password unlock,
        // and Settings can arm biometrics later.
        router.replace('/(auth)/success');
        return;
      }

      const result = await arm(password);

      if (result === 'armed') {
        enrolmentPassword?.forget();
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
    enrolmentPassword?.forget();
    router.replace('/(auth)/success');
  };

  const BiometricIcon = getBiometricIcon(kind);

  // Render nothing while checking availability to avoid a flash
  if (!ready || !available) {
    return null;
  }

  return (
    <OnboardingLayout
      testID="biometric-setup-screen"
      float
      // One icon on the screen, not two: the biometric glyph moves up into
      // the mark slot the fish vacated, and `body` goes empty.
      mark={<BiometricIcon size={ICON_SIZE} color={semantic.text.primary} />}
      title={<OnboardingTitle>{t('wallet.create.biometric_setup_title')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.create.biometric_setup_subtitle')}</OnboardingDescription>
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

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    error: {
      color: t.status.danger,
      fontFamily: fontFamilyNative.regular,
      fontSize: s(fontSize.body),
      lineHeight: fontSize.body * lineHeight.snug,
      textAlign: 'center',
    },
  });
