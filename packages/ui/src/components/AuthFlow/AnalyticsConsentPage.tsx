import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InsightsIcon from '@mui/icons-material/Insights';
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
 * advances the flow. Onboarding layout (themed icon + centered heading, like
 * SuccessPage); the include/exclude points read as a left-aligned bullet list.
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
  alignItems: 'center',
  justifyContent: 'center',
});

const Title = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: 32,
  lineHeight: '40px',
  marginBottom: spacing.md,
  textAlign: 'center',
});

const Body = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  lineHeight: '24px',
  textAlign: 'center',
});

const Details = styled(Box)({
  width: '100%',
  marginTop: spacing.xl,
});

const BulletRow = styled(Box)({
  display: 'flex',
  marginBottom: spacing.sm,
});

const BulletMark = styled('span')({
  width: 20,
  flexShrink: 0,
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 15,
  lineHeight: '22px',
});

const BulletText = styled(Typography)({
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
  marginTop: spacing.md,
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
        <InsightsIcon sx={{ fontSize: 72, color: colors.text.primary, marginBottom: `${spacing.xl}px` }} />
        <Title>{t('settings.analytics_prompt_title')}</Title>
        <Body>{t('settings.analytics_prompt_body')}</Body>

        <Details>
          <BulletRow>
            <BulletMark>✓</BulletMark>
            <BulletText>{t('settings.analytics_prompt_include')}</BulletText>
          </BulletRow>
          <BulletRow>
            <BulletMark>✕</BulletMark>
            <BulletText>{t('settings.analytics_prompt_exclude')}</BulletText>
          </BulletRow>
          <Footnote>{t('settings.analytics_prompt_footnote')}</Footnote>
        </Details>
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
