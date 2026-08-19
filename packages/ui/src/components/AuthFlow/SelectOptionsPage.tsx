/**
 * Welcome — the flow's entry point, on the onboarding slot grid.
 *
 * The brand appears once, as the mark alone — the wordmark came off this
 * screen at the owner's request (2026-08-18: only the fish, no "Salmon"
 * text), mirroring mobile — so the `mark` slot carries the screen's
 * accessible name and the `title` band stays reserved and empty. The primary
 * action is bottom-most (spec 013, decision 1), which pins its Y for free.
 *
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */
import { onboardingIdentityGridFull, wordmarkText } from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '../BrandMark';
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
        The brand alone (product, 2026-08-18): the fish, no wordmark. The mark
        slot centres its children itself. The heading wrapper keeps the screen
        named — the mark is the only thing on it, so the reader announces
        "Salmon" as the heading the eye recognises. No title, no description:
        both bands stay reserved and empty so everything below holds its Y.
        Drawn at the grid's own size — the lock is the identity reference, so
        this fish and the lock's are the same fish at the same Y (markSize is
        identical at both rungs; the full table is safe to read).
      */
      mark={
        <div
          role="heading"
          aria-level={1}
          aria-label={wordmarkText}
          data-testid="welcome-brand-mark"
        >
          <BrandMark size={onboardingIdentityGridFull.markSize} />
        </div>
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
