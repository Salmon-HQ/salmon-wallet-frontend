import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import InsightsIcon from '@mui/icons-material/Insights';
import { Trans, useTranslation } from 'react-i18next';
import { colors, fontFamily, fontSize, fontWeight, lineHeight, spacing } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';
import { getAuthContainerStyles } from './common';
import type { AnalyticsConsentPageProps } from './types';

/**
 * First-run, opt-in pseudonymous-analytics consent — the final onboarding step
 * before the wallet home (web + extension). Presentational only: the caller
 * wires accept/decline to `useAnalyticsConsent().resolveConsentPrompt` and then
 * advances the flow. Onboarding layout (themed icon + centered heading, like
 * SuccessPage); the body is one centered paragraph with bolded key phrases,
 * plus a Settings footnote. Declining is the standard close affordance: an X
 * in the top-right (same idiom as BaseSheetDialog's StandardHeader).
 */
const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  backgroundColor: colors.background.primary,
  padding: `0 ${spacing['2xl']}px`,
  ...getAuthContainerStyles($contained),
}));

const CloseButton = styled(IconButton)({
  position: 'absolute',
  top: spacing.lg,
  right: spacing.lg,
  color: colors.text.secondary,
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

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
  fontWeight: fontWeight.bold,
  fontSize: fontSize['4xl'],
  lineHeight: lineHeight.tight,
  marginBottom: spacing.md,
  textAlign: 'center',
});

const Body = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.lg,
  lineHeight: lineHeight.relaxed,
  textAlign: 'center',
});

const Bold = styled('strong')({
  fontWeight: fontWeight.bold,
});

const Footnote = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.base,
  lineHeight: lineHeight.normal,
  marginTop: spacing.xl,
  textAlign: 'center',
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
      <CloseButton
        onClick={onDecline}
        aria-label={t('general.close', 'Close')}
        data-testid="analytics-consent-decline"
      >
        <CloseIcon />
      </CloseButton>
      <TopSpacer />

      <CenterContent>
        <InsightsIcon
          sx={{ fontSize: 72, color: colors.text.primary, marginBottom: `${spacing.xl}px` }}
        />
        <Title>{t('settings.analytics_prompt_title')}</Title>
        <Body>
          <Trans i18nKey="settings.analytics_prompt_body" components={{ bold: <Bold /> }} />
        </Body>
        <Footnote>
          <Trans i18nKey="settings.analytics_prompt_footnote" components={{ bold: <Bold /> }} />
        </Footnote>
      </CenterContent>

      <ButtonsContainer>
        <PrimaryButton onClick={onAccept} testID="analytics-consent-accept">
          {t('settings.analytics_prompt_accept')}
        </PrimaryButton>
      </ButtonsContainer>
    </Container>
  );
}
