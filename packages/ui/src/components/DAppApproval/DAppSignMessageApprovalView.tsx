import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import LanguageIcon from '@mui/icons-material/Language';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';
import {
  formatOrigin,
  fontFamily,
  fontSize,
  getShortAddress,
  isTransactionLookalike,
  parseOffchainMessageForApproval,
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
import type { DAppSignMessageApprovalViewProps } from './types';

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

  const rawMessageBox = (
    <MessageSurface>
      <MessageText>{messageText}</MessageText>
    </MessageSurface>
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
              <LockOutlinedIcon sx={hintIconSx} />
              <FooterNote>
                {t(
                  'dapp.sign_message_hint',
                  'Read the message carefully. Message signatures can still authorize actions off-chain.',
                )}
              </FooterNote>
            </HintRow>
          </Card>

          <Card>
            <SectionHeader>
              {isOffchainMessage ? (
                <LockOutlinedIcon sx={sectionIconSx} />
              ) : (
                <DrawOutlinedIcon sx={sectionIconSx} />
              )}
              <Label sx={{ margin: 0 }}>
                {isOffchainMessage
                  ? t('dapp.offchain_message_label', 'Off-chain message (OCMS)')
                  : t('dapp.message', 'Message')}
              </Label>
            </SectionHeader>

            {isLookalikeTransaction && (
              <Box sx={{ marginBottom: `${spacing.md}px` }}>
                <WarningNotice title={t('dapp.sign_message_tx_lookalike_title', 'Signing blocked')}>
                  {t(
                    'dapp.sign_message_tx_lookalike_warning',
                    'This app is trying to make you sign what is actually a transaction, disguised as a plain message. Salmon has refused to sign it to protect your funds.',
                  )}
                </WarningNotice>
              </Box>
            )}

            {isOffchainMessage && offchainParsed ? (
              <>
                <MessageSurface>
                  <MessageText>{offchainParsed.content}</MessageText>
                </MessageSurface>

                <SummaryGrid sx={{ marginTop: `${spacing.md}px` }}>
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
