/**
 * First-run, opt-in pseudonymous-analytics consent — the final onboarding step
 * before the wallet home (web + extension). Presentational only: the caller
 * wires accept/decline to `useAnalyticsConsent().resolveConsentPrompt` and then
 * advances the flow.
 *
 * On the grid this screen changes the most visibly. It had no mark and no
 * header at all — a 72px chart icon stood in for both — and it now gains the
 * `chrome` band and the mark like every other screen. The close affordance
 * that used to float absolutely, reserving nothing, is the `chrome` band's
 * leading control — drawn as an X, not a back chevron, because declining
 * advances the flow rather than backing out of it. Its description is the
 * longest in the flow at roughly seven
 * lines, so it is not a "mini description": it lives in `body`, which is the
 * give, and the description band stays reserved and empty like any other
 * unused slot.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { fontFamily, fontSize, fontWeight, lineHeight, semantic, spacing } from '@salmon/shared';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChartLineUpIcon } from '../../icons';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
import { OnboardingLayout, OnboardingTitle } from '../OnboardingLayout';
import { ScreenHeader } from '../ScreenHeader';
import { WaterColumn } from '../WaterColumn';
import type { AnalyticsConsentPageProps } from './types';

const Body = styled(Typography)({
  color: semantic.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.bodyLg,
  lineHeight: `${Math.round(fontSize.bodyLg * lineHeight.normal)}px`,
  textAlign: 'center',
  marginBottom: spacing.xl,
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
      title={<OnboardingTitle>{t('settings.analytics_prompt_title')}</OnboardingTitle>}
      body={
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ marginBottom: `${spacing.xl}px` }}>
            <ChartLineUpIcon size={72} color={semantic.text.primary} />
          </Box>
          <Body>
            <Trans i18nKey="settings.analytics_prompt_body" components={{ bold: <Bold /> }} />
          </Body>
          <Footnote>
            <Trans i18nKey="settings.analytics_prompt_footnote" components={{ bold: <Bold /> }} />
          </Footnote>
        </Box>
      }
      action={
        <PrimaryButton onClick={onAccept} fullWidth testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
      }
    />
  );
}
