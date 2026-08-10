import React from 'react';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  colors,
  formatOrigin,
  fontFamily,
  fontSize,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';
import {
  AppIdentityIcon,
  AppIdentityName,
  AppIdentityRow,
  AppIdentityText,
  ButtonsContainer,
  Card,
  Container,
  Content,
  FooterNote,
  Header,
  Label,
  LogoWrap,
  LogoImage,
  MonoValue,
  ScrollArea,
  Subtitle,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  Title,
  Value,
} from './common';
import type { DAppTransactionApprovalViewProps } from './types';

export function DAppTransactionApprovalView({
  origin,
  appName,
  appIcon,
  requestSummary,
  feeSol,
  instructionCount,
  feePayer,
  recentBlockhash,
  parsingError,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppTransactionApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const displayOrigin = formatOrigin(origin);
  const hasIdentity = !!appName || !!appIcon;

  return (
    <Container>
      <Content>
        <Header>
          <LogoWrap>
            <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          </LogoWrap>
          <Title>{t('dapp.transaction_title', 'Approve Transaction')}</Title>
          <Subtitle>
            {t(
              'dapp.transaction_subtitle',
              'Review the transaction details before approving this request.',
            )}
          </Subtitle>
        </Header>

        <ScrollArea>
          <Card>
            <Label>{t('dapp.requesting_site', 'Requesting site')}</Label>
            {hasIdentity ? (
              <AppIdentityRow>
                {appIcon ? <AppIdentityIcon src={appIcon} alt={appName || displayOrigin} /> : null}
                <AppIdentityText>
                  {appName ? <AppIdentityName>{appName}</AppIdentityName> : null}
                  <MonoValue sx={{ marginTop: 0 }}>{displayOrigin}</MonoValue>
                </AppIdentityText>
              </AppIdentityRow>
            ) : (
              <Value sx={{ fontSize: 20 }}>{displayOrigin}</Value>
            )}
            <FooterNote sx={{ marginTop: 1.5 }}>
              {t(
                'dapp.transaction_risk_hint',
                'Only approve if you trust the app and recognize the action being requested.',
              )}
            </FooterNote>
          </Card>

          <Card>
            <Label>{t('dapp.transaction_overview', 'Transaction overview')}</Label>
            <SummaryGrid>
              <SummaryItem>
                <SummaryLabel>{t('dapp.method', 'Method')}</SummaryLabel>
                <SummaryValue>{requestSummary}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>{t('dapp.transaction_fee', 'Estimated fee')}</SummaryLabel>
                <SummaryValue>{feeSol ? `${feeSol} SOL` : '-'}</SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>{t('dapp.instructions', 'Instructions')}</SummaryLabel>
                <SummaryValue>
                  {instructionCount != null ? String(instructionCount) : '-'}
                </SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>{t('dapp.transaction_status', 'Approval')}</SummaryLabel>
                <SummaryValue>
                  {parsingError
                    ? t('dapp.transaction_unavailable', 'Review unavailable')
                    : t('dapp.transaction_ready', 'Ready to sign')}
                </SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>{t('dapp.fee_payer', 'Fee payer')}</SummaryLabel>
                <SummaryValue
                  sx={{
                    fontFamily: fontFamily.mono,
                    fontSize: fontSize.xs,
                    wordBreak: 'break-all',
                  }}
                >
                  {feePayer || '-'}
                </SummaryValue>
              </SummaryItem>
              <SummaryItem>
                <SummaryLabel>{t('dapp.blockhash', 'Recent blockhash')}</SummaryLabel>
                <SummaryValue
                  sx={{
                    fontFamily: fontFamily.mono,
                    fontSize: fontSize.xs,
                    wordBreak: 'break-all',
                  }}
                >
                  {recentBlockhash || '-'}
                </SummaryValue>
              </SummaryItem>
              {parsingError && (
                <SummaryItem
                  sx={{
                    backgroundColor: colors.status.errorBackground,
                    borderColor: colors.status.error,
                  }}
                >
                  <SummaryLabel sx={{ color: colors.status.error }}>
                    {t('dapp.error', 'Error')}
                  </SummaryLabel>
                  <Typography
                    sx={{
                      color: colors.text.primary,
                      fontSize: fontSize.sm,
                      wordBreak: 'break-word',
                    }}
                  >
                    {parsingError}
                  </Typography>
                </SummaryItem>
              )}
            </SummaryGrid>
          </Card>
        </ScrollArea>

        <ButtonsContainer>
          <PrimaryButton onClick={onApprove} loading={loading} disabled={disabled || loading || !!parsingError}>
            {t('dapp.approve_and_sign', 'Approve & Sign').toUpperCase()}
          </PrimaryButton>
          <SecondaryButton onClick={onReject} disabled={loading}>
            {t('dapp.reject', 'Reject').toUpperCase()}
          </SecondaryButton>
        </ButtonsContainer>
      </Content>
    </Container>
  );
}
