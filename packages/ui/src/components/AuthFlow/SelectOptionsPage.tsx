/**
 * Welcome — the flow's entry point, on the onboarding slot grid.
 *
 * Two things changed and both were visible from across the room. The title
 * used to render *above* the mark — the only screen in the flow that did — so
 * the drawn wordmark is the `title` slot's content now and the welcome line
 * is gone. And the primary action used to sit on top of the secondary; it is
 * bottom-most (spec 013, decision 1), which is what pins its Y for free.
 *
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wordmark } from '../BrandMark';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { OnboardingLayout } from '../OnboardingLayout';
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
      /*
        The product's name, drawn rather than set — mirroring the mobile
        welcome screen (product, 2026-08-18: "¿y si agrandamos Salmon y
        sacamos el Welcome?"). No description: the wordmark says what the
        screen is, and the band stays reserved and empty so everything below
        it holds its Y.
      */
      title={<Wordmark testID="welcome-wordmark" />}
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
