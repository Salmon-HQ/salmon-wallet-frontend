import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  colors,
  copyToClipboard,
  formatDateTime,
  formatOrigin,
  fontFamily,
  fontSize,
  getShortAddress,
  isTransactionLookalike,
  parseOffchainMessageForApproval,
  parseSiwsMessage,
  spacing,
} from '@salmon/shared';
import { PrimaryButton, SecondaryButton } from '../Button';
import {
  ButtonsContainer,
  AppIdentityIcon,
  AppIdentityName,
  AppIdentityRow,
  AppIdentityText,
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
import type { DAppSignMessageApprovalViewProps } from './types';

const MessageBox = Box;

const monoValueSx = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  wordBreak: 'break-all',
} as const;

export function DAppSignMessageApprovalView({
  origin,
  appName,
  appIcon,
  messageText,
  data,
  requiredSigners,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppSignMessageApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const displayOrigin = formatOrigin(origin);
  const hasIdentity = !!appName || !!appIcon;

  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOffchainMessage = requiredSigners !== undefined;

  const offchainParsed = useMemo(() => {
    if (!isOffchainMessage || !data) return null;
    try {
      return parseOffchainMessageForApproval(data, requiredSigners);
    } catch {
      return null;
    }
  }, [isOffchainMessage, data, requiredSigners]);

  // The tx-lookalike guard only applies to the legacy raw `sign` path — OCMS's
  // domain-separated buffer prevents this collision by construction.
  const isLookalikeTransaction = useMemo(() => {
    if (isOffchainMessage || !data) return false;
    return isTransactionLookalike(Uint8Array.from(data));
  }, [isOffchainMessage, data]);

  const parsed = useMemo(
    () => (isOffchainMessage ? null : parseSiwsMessage(messageText)),
    [isOffchainMessage, messageText],
  );

  const issuedAtDisplay = useMemo(() => {
    if (!parsed?.issuedAt) return null;
    const ts = Date.parse(parsed.issuedAt);
    return Number.isNaN(ts) ? parsed.issuedAt : formatDateTime(ts);
  }, [parsed]);

  const expiresDisplay = useMemo(() => {
    if (!parsed?.expirationTime) return null;
    const ts = Date.parse(parsed.expirationTime);
    return Number.isNaN(ts) ? parsed.expirationTime : formatDateTime(ts);
  }, [parsed]);

  const domainMismatch = useMemo(() => {
    if (!parsed?.domain) return false;
    try {
      const originHost = new URL(origin).host;
      const messageHost = parsed.domain.replace(/^[a-z]+:\/\//i, '');
      return !!originHost && originHost !== messageHost;
    } catch {
      return false;
    }
  }, [parsed, origin]);

  const handleCopyAccount = () => {
    if (!parsed?.address) return;
    void copyToClipboard(parsed.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const rawMessageBox = (
    <MessageBox
      sx={{
        width: '100%',
        maxHeight: 220,
        overflowY: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 2,
        padding: `${spacing.lg}px`,
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Value
        sx={{
          fontFamily: fontFamily.mono,
          fontSize: fontSize.sm,
          fontWeight: 400,
          whiteSpace: 'pre-wrap',
          wordBreak: 'normal',
          overflowWrap: 'anywhere',
        }}
      >
        {messageText}
      </Value>
    </MessageBox>
  );

  return (
    <Container>
      <Content>
        <Header>
          <LogoWrap>
            <LogoImage src="/images/Logo.png" alt="Salmon" />
          </LogoWrap>
          <Title>{t('dapp.sign_message_title', 'Sign Message')}</Title>
          <Subtitle>
            {t(
              'dapp.sign_message_subtitle',
              'This app is requesting you to sign a message. This will not submit a transaction.',
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
                'dapp.sign_message_hint',
                'Read the message carefully. Message signatures can still authorize actions off-chain.',
              )}
            </FooterNote>
          </Card>

          <Card>
            <Label>
              {isOffchainMessage
                ? t('dapp.offchain_message_label', 'Off-chain message (OCMS)')
                : t('dapp.message', 'Message')}
            </Label>

            {isLookalikeTransaction && (
              <Box
                sx={{
                  marginBottom: `${spacing.md}px`,
                  padding: `${spacing.md}px`,
                  borderRadius: 2,
                  backgroundColor: colors.status.errorBackground,
                  border: `1px solid ${colors.status.error}`,
                }}
              >
                <Typography
                  sx={{ color: colors.status.error, fontSize: fontSize.sm, fontWeight: 600 }}
                >
                  {t('dapp.sign_message_tx_lookalike_title', 'Signing blocked')}
                </Typography>
                <Typography sx={{ color: colors.text.primary, fontSize: fontSize.sm }}>
                  {t(
                    'dapp.sign_message_tx_lookalike_warning',
                    'This app is trying to make you sign what is actually a transaction, disguised as a plain message. Salmon has refused to sign it to protect your funds.',
                  )}
                </Typography>
              </Box>
            )}

            {!isLookalikeTransaction && domainMismatch && (
              <Box
                sx={{
                  marginBottom: `${spacing.md}px`,
                  padding: `${spacing.md}px`,
                  borderRadius: 2,
                  backgroundColor: colors.status.errorBackground,
                  border: `1px solid ${colors.status.error}`,
                }}
              >
                <Typography
                  sx={{ color: colors.status.error, fontSize: fontSize.sm, fontWeight: 600 }}
                >
                  {t('dapp.siws_domain_mismatch_title', 'Domain mismatch')}
                </Typography>
                <Typography sx={{ color: colors.text.primary, fontSize: fontSize.sm }}>
                  {t(
                    'dapp.siws_domain_mismatch',
                    'The message domain does not match the requesting site.',
                  )}
                </Typography>
              </Box>
            )}

            {isOffchainMessage ? (
              offchainParsed ? (
                <>
                  <Value
                    sx={{
                      fontWeight: 400,
                      marginBottom: `${spacing.md}px`,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {offchainParsed.content}
                  </Value>

                  <SummaryGrid>
                    {offchainParsed.requiredSignatories.map((signatory) => (
                      <SummaryItem key={signatory.address}>
                        <SummaryLabel>
                          {t('dapp.offchain_required_signer', 'Required signer')}
                        </SummaryLabel>
                        <SummaryValue sx={monoValueSx}>
                          {getShortAddress(signatory.address)}
                        </SummaryValue>
                      </SummaryItem>
                    ))}
                  </SummaryGrid>
                </>
              ) : (
                rawMessageBox
              )
            ) : parsed ? (
              <>
                {parsed.statement && (
                  <Value
                    sx={{
                      fontWeight: 400,
                      marginBottom: `${spacing.md}px`,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {parsed.statement}
                  </Value>
                )}

                <SummaryGrid>
                  <SummaryItem
                    onClick={handleCopyAccount}
                    sx={{ cursor: 'pointer' }}
                    title={parsed.address}
                  >
                    <SummaryLabel>
                      {copied ? t('dapp.siws_copied', 'Copied') : t('dapp.siws_account', 'Account')}
                    </SummaryLabel>
                    <SummaryValue sx={monoValueSx}>{getShortAddress(parsed.address)}</SummaryValue>
                  </SummaryItem>

                  {parsed.uri && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_uri', 'URI')}</SummaryLabel>
                      <SummaryValue sx={{ wordBreak: 'break-all' }}>{parsed.uri}</SummaryValue>
                    </SummaryItem>
                  )}

                  {parsed.nonce && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_nonce', 'Nonce')}</SummaryLabel>
                      <SummaryValue sx={monoValueSx}>{parsed.nonce}</SummaryValue>
                    </SummaryItem>
                  )}

                  {issuedAtDisplay && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_issued_at', 'Issued at')}</SummaryLabel>
                      <SummaryValue>{issuedAtDisplay}</SummaryValue>
                    </SummaryItem>
                  )}

                  {expiresDisplay && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_expires', 'Expires')}</SummaryLabel>
                      <SummaryValue>{expiresDisplay}</SummaryValue>
                    </SummaryItem>
                  )}
                </SummaryGrid>

                <Box
                  component="button"
                  type="button"
                  onClick={() => setShowRaw((value) => !value)}
                  sx={{
                    marginTop: `${spacing.md}px`,
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.text.secondary,
                    fontFamily: fontFamily.sans,
                    fontSize: fontSize.sm,
                    textAlign: 'left',
                  }}
                >
                  {showRaw
                    ? t('dapp.siws_hide_raw', 'Hide raw message')
                    : t('dapp.siws_view_raw', 'View raw message')}
                </Box>

                {showRaw && <Box sx={{ marginTop: `${spacing.sm}px` }}>{rawMessageBox}</Box>}
              </>
            ) : (
              rawMessageBox
            )}
          </Card>
        </ScrollArea>

        <ButtonsContainer>
          <PrimaryButton
            onClick={onApprove}
            loading={loading}
            disabled={
              disabled ||
              loading ||
              isLookalikeTransaction ||
              // Never offer to sign an OCMS request whose exact signing bytes could
              // not be built and rendered — the user must see what they sign.
              (isOffchainMessage && !offchainParsed)
            }
          >
            {t('dapp.sign', 'Sign').toUpperCase()}
          </PrimaryButton>
          <SecondaryButton onClick={onReject} disabled={loading}>
            {t('dapp.reject', 'Reject').toUpperCase()}
          </SecondaryButton>
        </ButtonsContainer>
      </Content>
    </Container>
  );
}
