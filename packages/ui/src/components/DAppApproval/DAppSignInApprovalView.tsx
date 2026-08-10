import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import LanguageIcon from '@mui/icons-material/Language';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTranslation } from 'react-i18next';
import {
  colors,
  copyToClipboard,
  formatDateTime,
  formatOrigin,
  fontFamily,
  fontSize,
  getShortAddress,
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
  HintRow,
  hintIconSx,
  Label,
  LogoWrap,
  LogoImage,
  MessageSurface,
  MessageText,
  MonoValue,
  ScrollArea,
  SectionHeader,
  sectionIconSx,
  Subtitle,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  Title,
  Value,
  WarningNotice,
} from './common';
import type { DAppSignInApprovalViewProps } from './types';

const monoValueSx = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  wordBreak: 'break-all',
} as const;

function formatTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  // `Date.parse` yields milliseconds; `formatDateTime` expects Unix seconds.
  return Number.isNaN(ts) ? value : formatDateTime(ts / 1000);
}

/**
 * Approval view for native `solana:signIn` (Sign-In-With-Solana). Unlike the
 * legacy heuristic that parsed dApp-supplied text, every field shown here comes
 * from the WALLET-built SIWS message (`prepareSignInMessage`), whose `domain`
 * is bound to the real requesting origin. `domainMismatch` means the dApp
 * claimed a different domain — signing is refused in that case.
 */
export function DAppSignInApprovalView({
  origin,
  appName,
  appIcon,
  siws,
  messageText,
  domainMismatch,
  requestedDomain,
  isOffchainMessage = false,
  disabled = false,
  loading = false,
  onApprove,
  onReject,
}: DAppSignInApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const displayOrigin = formatOrigin(origin);
  const hasIdentity = !!appName || !!appIcon;

  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const issuedAtDisplay = useMemo(() => formatTimestamp(siws?.issuedAt), [siws]);
  const expiresDisplay = useMemo(() => formatTimestamp(siws?.expirationTime), [siws]);

  const handleCopyAccount = () => {
    if (!siws?.address) return;
    void copyToClipboard(siws.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canApprove = !disabled && !loading && !domainMismatch && !!siws;

  return (
    <Container>
      <Content>
        <Header>
          <LogoWrap>
            <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          </LogoWrap>
          <Title>{t('dapp.sign_in_title', 'Sign In')}</Title>
          <Subtitle>
            {t(
              'dapp.sign_in_subtitle',
              'This app is requesting you to sign in with your Solana account. This will not submit a transaction.',
            )}
          </Subtitle>
        </Header>

        <ScrollArea>
          <Card>
            <SectionHeader>
              <LanguageIcon sx={sectionIconSx} />
              <Label sx={{ margin: 0 }}>{t('dapp.requesting_site', 'Requesting site')}</Label>
            </SectionHeader>
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
            <HintRow>
              <GppGoodOutlinedIcon sx={hintIconSx} />
              <FooterNote>
                {t(
                  'dapp.sign_in_hint',
                  'Salmon built this sign-in message from the site you are actually visiting, so it cannot impersonate another site.',
                )}
              </FooterNote>
            </HintRow>
          </Card>

          <Card>
            <SectionHeader>
              <DrawOutlinedIcon sx={sectionIconSx} />
              <Label sx={{ margin: 0 }}>{t('dapp.sign_in_message_label', 'Sign-in message')}</Label>
            </SectionHeader>

            {domainMismatch && (
              <Box sx={{ marginBottom: `${spacing.md}px` }}>
                <WarningNotice title={t('dapp.siws_domain_mismatch_title', 'Domain mismatch')}>
                  {t('dapp.sign_in_domain_mismatch', {
                    defaultValue:
                      'This app asked to sign in for "{{requested}}" but the request came from this site. Salmon has refused to sign it.',
                    requested: requestedDomain ?? '',
                  })}
                </WarningNotice>
              </Box>
            )}

            {siws ? (
              <>
                {siws.statement && (
                  <Value
                    sx={{
                      fontWeight: 400,
                      marginBottom: `${spacing.md}px`,
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {siws.statement}
                  </Value>
                )}

                <SummaryGrid>
                  <SummaryItem>
                    <SummaryLabel>{t('dapp.siws_domain', 'Domain')}</SummaryLabel>
                    <SummaryValue sx={{ wordBreak: 'break-all' }}>{siws.domain}</SummaryValue>
                  </SummaryItem>

                  <SummaryItem
                    onClick={handleCopyAccount}
                    title={siws.address}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease',
                      '&:hover': { backgroundColor: colors.interactive.hoverSubtle },
                    }}
                  >
                    <SummaryLabel>
                      {copied ? t('dapp.siws_copied', 'Copied') : t('dapp.siws_account', 'Account')}
                    </SummaryLabel>
                    <SummaryValue
                      sx={{ ...monoValueSx, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {getShortAddress(siws.address)}
                      {copied ? (
                        <CheckIcon sx={{ fontSize: 14, color: colors.status.success, flexShrink: 0 }} />
                      ) : (
                        <ContentCopyOutlinedIcon
                          sx={{ fontSize: 14, color: colors.text.secondary, flexShrink: 0 }}
                        />
                      )}
                    </SummaryValue>
                  </SummaryItem>

                  {siws.uri && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_uri', 'URI')}</SummaryLabel>
                      <SummaryValue sx={{ wordBreak: 'break-all' }}>{siws.uri}</SummaryValue>
                    </SummaryItem>
                  )}

                  {siws.nonce && (
                    <SummaryItem>
                      <SummaryLabel>{t('dapp.siws_nonce', 'Nonce')}</SummaryLabel>
                      <SummaryValue sx={monoValueSx}>{siws.nonce}</SummaryValue>
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

                {isOffchainMessage && (
                  <HintRow>
                    <LockOutlinedIcon sx={hintIconSx} />
                    <FooterNote>
                      {t(
                        'dapp.sign_in_offchain_note',
                        'This message will be signed as a Solana off-chain message (OCMS).',
                      )}
                    </FooterNote>
                  </HintRow>
                )}

                <Box
                  component="button"
                  type="button"
                  onClick={() => setShowRaw((value) => !value)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: `${spacing.lg}px`,
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.text.secondary,
                    fontFamily: fontFamily.sans,
                    fontSize: fontSize.sm,
                    textAlign: 'left',
                    transition: 'color 150ms ease',
                    '&:hover': { color: colors.text.primary },
                  }}
                >
                  {showRaw
                    ? t('dapp.siws_hide_raw', 'Hide raw message')
                    : t('dapp.siws_view_raw', 'View raw message')}
                  {showRaw ? (
                    <ExpandLessIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <ExpandMoreIcon sx={{ fontSize: 16 }} />
                  )}
                </Box>

                {showRaw && (
                  <MessageSurface sx={{ marginTop: `${spacing.sm}px` }}>
                    <MessageText>{messageText}</MessageText>
                  </MessageSurface>
                )}
              </>
            ) : (
              <Value sx={{ fontWeight: 400 }}>
                {t('dapp.sign_in_invalid_request', 'This sign-in request is invalid and cannot be signed.')}
              </Value>
            )}
          </Card>
        </ScrollArea>

        <ButtonsContainer>
          <PrimaryButton onClick={onApprove} loading={loading} disabled={!canApprove}>
            {t('dapp.sign_in_action', 'Sign In').toUpperCase()}
          </PrimaryButton>
          <SecondaryButton onClick={onReject} disabled={loading}>
            {t('dapp.reject', 'Reject').toUpperCase()}
          </SecondaryButton>
        </ButtonsContainer>
      </Content>
    </Container>
  );
}
