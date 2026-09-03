/**
 * Success — the congratulations screen, on the onboarding slot grid.
 *
 * The mobile twin is `apps/mobile/app/(auth)/success.tsx`: the fish at the
 * door's own size in the brand accent, the title, the line under it, and one
 * action that enters the app through the analytics-consent step.
 *
 * The derived-accounts detour that used to hang off this screen — a "Check
 * derivables" button and a "What is a derivable?" helper — is gone (owner,
 * 2026-09-02, spec 025): a fresh wallet has nothing to find, and a seed
 * brought from another wallet is scanned on the first unlocked Home, where
 * `DerivedAccountsSheet` asks which accounts to add.
 */
import { onboardingIdentityGridFull } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { BrandMark } from '../BrandMark';
import { PrimaryButton } from '../Button';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import type { SuccessPageProps } from './types';

export function SuccessPage({ onGoToWallet }: SuccessPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { accent } = useSemantic();

  return (
    <OnboardingLayout
      testID="success-screen"
      background={<WaterColumn />}
      /*
        Success is a moment of identity again (owner, 2026-08-18, superseding
        the checkmark from the motion batch): the fish at the door's own size —
        this screen mirrors welcome, only the copy differs. Only success; the
        other flow screens keep their icons.
      */
      mark={<BrandMark size={onboardingIdentityGridFull.markSize} color={accent.fill} />}
      title={<OnboardingTitle>{t('wallet.create.success_message')}</OnboardingTitle>}
      description={
        <OnboardingDescription>{t('wallet.create.success_message_body')}</OnboardingDescription>
      }
      action={
        <PrimaryButton onPress={onGoToWallet} fullWidth testID="success-go-to-wallet-button">
          {t('wallet.create.go_to_my_wallet')}
        </PrimaryButton>
      }
    />
  );
}
