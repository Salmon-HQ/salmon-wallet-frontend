/**
 * Welcome — the flow's entry point, on the onboarding slot grid.
 *
 * Two things changed and both were visible from across the room. The title
 * used to render *above* the mark — the only screen in the flow that did — so
 * the wordmark is the `title` slot's content now and the welcome line is the
 * `description`. And the primary action used to sit on top of the secondary;
 * it is bottom-most (spec 013, decision 1), which is what pins its Y for free.
 *
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import type { SelectOptionsPageProps } from './types';

export function SelectOptionsPage({
  onCreateWallet,
  onRecoverWallet,
  hasAccounts,
  onAccessExisting,
}: SelectOptionsPageProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <OnboardingLayout
      testID="welcome-screen"
      background={<WaterColumn />}
      title={<OnboardingTitle>Salmon</OnboardingTitle>}
      description={
        <OnboardingDescription>
          {hasAccounts
            ? t('wallet.onboarding.titleOnboarded')
            : t('wallet.onboarding.titleWelcome')}
        </OnboardingDescription>
      }
      assist={
        hasAccounts && onAccessExisting ? (
          <TextButton onClick={onAccessExisting} testID="select-access-existing-button">
            {t('wallet.access_existing_account')}
          </TextButton>
        ) : undefined
      }
      secondary={
        <SecondaryButton onClick={onRecoverWallet} fullWidth testID="select-recover-button">
          {t('wallet.recover_wallet')}
        </SecondaryButton>
      }
      action={
        <PrimaryButton onClick={onCreateWallet} fullWidth testID="select-create-button">
          {t('wallet.create_wallet')}
        </PrimaryButton>
      }
    />
  );
}
