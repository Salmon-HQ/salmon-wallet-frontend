import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, spacing } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { getAuthContainerStyles } from './common';
import type { AnalyticsConsentPageProps } from './types';

/**
 * First-run, opt-in anonymous-analytics consent — the final onboarding step
 * before the wallet home (web + extension). Presentational only: the caller
 * wires accept/decline to `useAnalyticsConsent().resolveConsentPrompt` and then
 * advances the flow. Full-screen onboarding page, styled to match SuccessPage.
 */
const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.background.primary,
  padding: `0 ${spacing['2xl']}px`,
  ...getAuthContainerStyles($contained),
}));

const TopSpacer = styled(Box)({ flex: 1 });

const CenterContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: spacing.sm,
});

const Title = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: 28,
  lineHeight: '36px',
  marginBottom: spacing.xs,
});

const Body = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  lineHeight: '24px',
});

const Bullet = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 15,
  lineHeight: '22px',
});

const Footnote = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 13,
  lineHeight: '20px',
  opacity: 0.8,
  marginTop: spacing.xs,
});

const ButtonsContainer = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  paddingBottom: spacing['2xl'],
  gap: spacing.lg,
});

export function AnalyticsConsentPage({
  onAccept,
  onDecline,
  contained = false,
}: AnalyticsConsentPageProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container $contained={contained} data-testid="analytics-consent-screen">
      <TopSpacer />

      <CenterContent>
        <Title>{t('settings.analytics_prompt_title')}</Title>
        <Body>{t('settings.analytics_prompt_body')}</Body>
        <Bullet>{'✓ '}{t('settings.analytics_prompt_include')}</Bullet>
        <Bullet>{'✕ '}{t('settings.analytics_prompt_exclude')}</Bullet>
        <Footnote>{t('settings.analytics_prompt_footnote')}</Footnote>
      </CenterContent>

      <ButtonsContainer>
        <PrimaryButton onClick={onAccept} testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
        <SecondaryButton onClick={onDecline} testID="analytics-consent-decline">
          {t('settings.analytics_prompt_decline')}
        </SecondaryButton>
      </ButtonsContainer>
    </Container>
  );
}
