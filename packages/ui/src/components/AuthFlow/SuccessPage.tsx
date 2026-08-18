/**
 * Success — the screen the whole request is about.
 *
 * The "What is a derivable?" helper lives here, and it is what made the primary
 * action jump 132px on arrival and 64px on the way out: 60px of that was the
 * helper's own footprint appearing in space nothing had reserved. It occupies
 * the `assist` band now, which is present and empty on every other screen, so
 * the link is revealed inside space that was always there and the button does
 * not move. The action is also bottom-most, below the secondary, so even a
 * band that grew could not push it.
 */
import Typography from '@mui/material/Typography';
import { colors, fontFamily, fontSize, lineHeight, semantic, spacing } from '@salmon/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIcon, iconSize } from '../../icons';
import { BaseDialog } from '../BaseDialog';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { OnboardingDescription, OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { WaterColumn } from '../WaterColumn';
import type { SuccessPageProps } from './types';

export function SuccessPage({
  onGoToWallet,
  onCheckDerived,
}: SuccessPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const toggleDialog = useCallback(() => setShowDialog((prev) => !prev), []);

  return (
    <>
      <OnboardingLayout
        testID="success-screen"
        background={<WaterColumn />}
        title={<OnboardingTitle>{t('wallet.create.success_message')}</OnboardingTitle>}
        description={
          <OnboardingDescription>{t('wallet.create.success_message_body')}</OnboardingDescription>
        }
        assist={
          <TextButton
            onClick={toggleDialog}
            color={colors.text.secondary}
            testID="success-info-button"
          >
            {/*
              The glyph belongs to the component, not the string — it used to
              ride inside the translation as a literal "ⓘ".
            */}
            <InfoIcon
              size={iconSize.sm}
              color={colors.text.secondary}
              style={{ marginRight: spacing.xs, flexShrink: 0 }}
            />
            {t('wallet.create.derivable_info_icon')}
          </TextButton>
        }
        secondary={
          <SecondaryButton onClick={onCheckDerived} fullWidth testID="success-check-derived-button">
            {t('wallet.create.check_derivables')}
          </SecondaryButton>
        }
        action={
          <PrimaryButton onClick={onGoToWallet} fullWidth testID="success-go-to-wallet-button">
            {t('wallet.create.go_to_my_wallet')}
          </PrimaryButton>
        }
      />

      <BaseDialog visible={showDialog} onClose={toggleDialog}>
        <BaseDialog.Header title={t('wallet.create.derivable_info')} />
        <BaseDialog.Content>
          <Typography
            sx={{
              color: semantic.text.secondary,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.body,
              lineHeight: `${Math.round(fontSize.body * lineHeight.normal)}px`,
              textAlign: 'center',
            }}
          >
            {t('wallet.create.derivable_description')}
          </Typography>
        </BaseDialog.Content>
        <BaseDialog.Actions>
          <BaseDialog.ActionButton onClick={toggleDialog}>
            {t('actions.continue')}
          </BaseDialog.ActionButton>
        </BaseDialog.Actions>
      </BaseDialog>
    </>
  );
}
