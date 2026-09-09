/**
 * Success — the congratulations screen, on the onboarding slot grid.
 *
 * The mobile twin is `apps/mobile/app/(auth)/success.tsx`: the fish at the
 * door's own size in the brand accent, the title, the line under it, and one
 * action that enters the app through the analytics-consent step.
 *
 * "Check derivables" is back (owner, 2026-09-09): a seed brought from another
 * wallet may hold more accounts, and the user asks here instead of waiting for
 * Home. The button runs the same scan Wallets' rescan runs and answers in the
 * same `DerivedAccountsSheet`, over this screen: the wait, then the finds or
 * "No new accounts". The hook runs nothing on its own here — Home's silent
 * pass still covers a wallet that was never asked about.
 */
import { onboardingIdentityGridFull, useCheckDerivables } from '@salmon/shared';
import { useTranslation } from 'react-i18next';

import { useSemantic } from '../../theme/ThemeProvider';
import { BrandMark } from '../BrandMark';
import { PrimaryButton, SecondaryButton } from '../Button';
import { DerivedAccountsSheet } from '../DerivedAccountsSheet';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import type { SuccessPageProps } from './types';

export function SuccessPage({ onGoToWallet }: SuccessPageProps): React.ReactElement {
  const { t } = useTranslation();
  const { accent } = useSemantic();
  const derivables = useCheckDerivables();

  return (
    <>
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
        secondary={
          <SecondaryButton
            onPress={derivables.check}
            disabled={derivables.scanning}
            fullWidth
            testID="success-check-derived-button"
          >
            {t('wallet.create.check_derivables')}
          </SecondaryButton>
        }
        action={
          <PrimaryButton onPress={onGoToWallet} fullWidth testID="success-go-to-wallet-button">
            {t('wallet.create.go_to_my_wallet')}
          </PrimaryButton>
        }
      />
      <DerivedAccountsSheet {...derivables.sheet} />
    </>
  );
}
