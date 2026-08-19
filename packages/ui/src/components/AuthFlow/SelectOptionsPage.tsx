/**
 * Welcome — the flow's entry point, on the onboarding slot grid.
 *
 * The brand speaks in full here (owner, 2026-08-18, superseding "only the
 * fish"), mirroring mobile: the fish in `mark`, the wordmark in `title` — its
 * pinned gap is the grid's own fish→title air, the same distance success
 * keeps to "Congratulations!" — and the slogan in `description`, so nothing
 * below the pair moves. The primary action is bottom-most (spec 013,
 * decision 1), which pins its Y for free.
 *
 * The third action, offered only when accounts already exist, is a text
 * affordance in `assist`: the reserved `secondary` band holds one control, and
 * a third button would be the one place in the flow where the grid overflows.
 */
import Typography from '@mui/material/Typography';
import {
  fontFamily,
  fontSize,
  lineHeight,
  onboardingIdentityGridFull,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark, Wordmark } from '../BrandMark';
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
        The fish, drawn at the grid's own size — this fish and the lock's are
        the same fish at the same Y (markSize is identical at both rungs; the
        full table is safe to read). No accessible name here: the wordmark
        below is the screen's heading and announces "Salmon" — labelling the
        fish too would say it twice.
      */
      mark={
        <div data-testid="welcome-brand-mark">
          <BrandMark size={onboardingIdentityGridFull.markSize} />
        </div>
      }
      /*
        The name and the lema (owner, 2026-08-18): the wordmark in the title
        band — its own pinned gap puts it at the grid's fish→title distance —
        and the slogan in the description band, so both live in bands the grid
        already reserved and nothing below them moves.
      */
      title={<Wordmark />}
      description={
        // Brand line, not UI copy — deliberately untranslated, like the wordmark itself (PRODUCT.md §Positioning).
        <Typography
          data-testid="welcome-slogan"
          sx={{
            color: semantic.text.secondary,
            fontFamily: fontFamily.sans,
            fontSize: fontSize.body,
            lineHeight: `${Math.round(fontSize.body * lineHeight.normal)}px`,
            textAlign: 'center',
          }}
        >
          Open code. Open ownership.
        </Typography>
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
