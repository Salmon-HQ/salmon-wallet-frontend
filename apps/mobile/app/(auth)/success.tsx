/**
 * SuccessScreen - Congratulations screen shown after wallet creation/recovery
 *
 * This screen is displayed after the user has successfully created or recovered
 * their wallet. Its one action enters the app through the analytics-consent
 * step.
 *
 * "Check derivables" is back (owner, 2026-09-09): a seed brought from another
 * wallet may hold more accounts, and the user asks here instead of waiting for
 * Home. The button runs the same scan Wallets' rescan runs and answers in the
 * same `DerivedAccountsSheet`, over this screen: the wait, then the finds or
 * "No new accounts". The hook runs nothing on its own here — Home's silent
 * pass still covers a wallet that was never asked about.
 */

import { onboardingIdentityGridFull, useCheckDerivables } from '@salmon/shared';
import {
  BrandMark,
  DerivedAccountsSheet,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
  SecondaryButton,
} from '../../src/components';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../src/theme/useThemedStyles';

// ============================================================================
// Component
// ============================================================================

export default function SuccessScreen() {
  const { t } = useTranslation();
  const { accent } = useSemantic();
  const derivables = useCheckDerivables();

  /**
   * Leave through the analytics-consent step, which is what enters the app.
   * Consent comes after success so the first-run ask never interrupts the
   * congratulations moment.
   */
  const handleGoToWallet = useCallback(() => {
    router.replace('/(auth)/analytics-consent');
  }, []);

  return (
    <>
      <OnboardingLayout
        testID="success-screen"
        float
        /*
          Success is a moment of identity again (owner, 2026-08-18,
          superseding the checkmark from the motion batch): the fish at the
          door's own size — this screen mirrors welcome, only the copy differs.
          Only success — the other flow screens keep their icons.
        */
        mark={<BrandMark size={onboardingIdentityGridFull.markSize} color={accent.fill} />}
        title={<OnboardingTitle>{t('wallet.create.success_message')}</OnboardingTitle>}
        description={
          <OnboardingDescription>{t('wallet.create.success_message_body')}</OnboardingDescription>
        }
        secondary={
          <SecondaryButton
            onPress={derivables.check}
            disabled={derivables.scanning}
            testID="success-check-derived-button"
          >
            {t('wallet.create.check_derivables')}
          </SecondaryButton>
        }
        action={
          <PrimaryButton onPress={handleGoToWallet} testID="success-go-to-wallet-button">
            {t('wallet.create.go_to_my_wallet')}
          </PrimaryButton>
        }
      />
      <DerivedAccountsSheet {...derivables.sheet} />
    </>
  );
}
