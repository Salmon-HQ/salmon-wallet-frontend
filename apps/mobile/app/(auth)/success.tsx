/**
 * SuccessScreen - Congratulations screen shown after wallet creation/recovery
 *
 * This screen is displayed after the user has successfully created or recovered
 * their wallet. Its one action enters the app through the analytics-consent
 * step.
 *
 * The derived-accounts detour that used to hang off this screen — a "Check
 * derivables" button and a "What is a derivable?" helper — is gone (owner,
 * 2026-09-02): a fresh wallet has nothing to find, and a seed brought from
 * another wallet has its derived accounts imported for it, automatically, on
 * the first unlocked mount (`useDerivedAccountsAutoImport`).
 */

import { onboardingIdentityGridFull } from '@salmon/shared';
import {
  BrandMark,
  OnboardingDescription,
  OnboardingLayout,
  OnboardingTitle,
  PrimaryButton,
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

  /**
   * Leave through the analytics-consent step, which is what enters the app.
   * Consent comes after success so the first-run ask never interrupts the
   * congratulations moment.
   */
  const handleGoToWallet = useCallback(() => {
    router.replace('/(auth)/analytics-consent');
  }, []);

  return (
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
      action={
        <PrimaryButton onPress={handleGoToWallet} testID="success-go-to-wallet-button">
          {t('wallet.create.go_to_my_wallet')}
        </PrimaryButton>
      }
    />
  );
}
