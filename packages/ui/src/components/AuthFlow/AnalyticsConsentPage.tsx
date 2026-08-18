/**
 * First-run, opt-in pseudonymous-analytics consent — the final onboarding step
 * before the wallet home (web + extension). Presentational only: the caller
 * wires accept/decline to `useAnalyticsConsent().resolveConsentPrompt` and then
 * advances the flow.
 *
 * On the grid, the metrics glyph is the screen's only icon and sits in the
 * `mark` slot, where the fish sat before the owner restructured this screen
 * (2026-08-18): glyph on top, title, then the body copy immediately after it
 * — the hole between title and copy is gone — with the "turn it off any
 * time" line in `assist` and Accept bottom-most. The close affordance is the
 * `chrome` band's leading control — drawn as an X, not a back chevron,
 * because declining advances the flow rather than backing out of it. Its
 * description is the longest in the flow at roughly seven lines, so it is
 * not a "mini description": it lives in `body`, which is the give, and the
 * description band stays reserved and empty like any other unused slot.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChartLineUpIcon } from '../../icons';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { WaterColumn } from '../WaterColumn';
import type { AnalyticsConsentPageProps } from './types';

/** The glyph fills the top slot: the grid's own mark size for `content`. */
const ICON_SIZE = componentSizes.logoSizeSmall;

const Body = styled(Typography)({
  color: semantic.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
  textAlign: 'center',
});

const Bold = styled('strong')({
  fontWeight: fontWeight.bold,
});

const Footnote = styled(Typography)({
  color: semantic.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.body,
  lineHeight: `${Math.round(fontSize.body * lineHeight.normal)}px`,
  textAlign: 'center',
});

export function AnalyticsConsentPage({
  onAccept,
  onDecline,
}: AnalyticsConsentPageProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <OnboardingLayout
      testID="analytics-consent-screen"
      variant="content"
      background={<WaterColumn />}
      scrollBody
      chrome={
        <ScreenHeader
          onBack={onDecline}
          glyph="close"
          backLabel={t('settings.analytics_prompt_close')}
          testID="analytics-consent-decline"
        />
      }
      /*
        The metrics glyph takes the top slot the fish used to hold — one icon
        on the screen, not two, and the same asset the body carried before.
      */
      mark={<ChartLineUpIcon size={ICON_SIZE} color={semantic.text.primary} />}
      title={<OnboardingTitle>{t('settings.analytics_prompt_title')}</OnboardingTitle>}
      body={
        /*
          `marginBottom: 'auto'` pins the copy to the top of the body slot so
          it reads immediately after the title instead of floating mid-slot.
        */
        <Box sx={{ textAlign: 'center', marginBottom: 'auto' }}>
          <Body>
            <Trans i18nKey="settings.analytics_prompt_body" components={{ bold: <Bold /> }} />
          </Body>
        </Box>
      }
      assist={
        <Footnote>
          <Trans i18nKey="settings.analytics_prompt_footnote" components={{ bold: <Bold /> }} />
        </Footnote>
      }
      action={
        <PrimaryButton onClick={onAccept} fullWidth testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
      }
    />
  );
}
