import React from 'react';
import Box from '@mui/material/Box';
import LanguageIcon from '@mui/icons-material/Language';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import { formatOrigin, getShortAddress } from '@salmon/shared';
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
  MonoValue,
  ScrollArea,
  SectionHeader,
  sectionIconSx,
  Subtitle,
  Title,
  Value,
  WarningNotice,
} from './common';
import type { DAppConnectApprovalViewProps } from './types';

export function DAppConnectApprovalView({
  origin,
  appName,
  appIcon,
  address,
  disabled = false,
  loading = false,
  showOriginWarning = false,
  onApprove,
  onReject,
}: DAppConnectApprovalViewProps): React.ReactElement {
  const { t } = useTranslation();
  const displayOrigin = formatOrigin(origin);
  const shortAddress = address ? getShortAddress(address, 4) ?? '' : '';
  const hasIdentity = !!appName || !!appIcon;

  return (
    <Container>
      <Content>
        <Header>
          <LogoWrap>
            <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
          </LogoWrap>
          <Title>{t('dapp.connect_title', 'Connect to dApp')}</Title>
          <Subtitle>
            {t('dapp.connect_subtitle', 'This site wants to connect to your Salmon Wallet')}
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
              <InfoOutlinedIcon sx={hintIconSx} />
              <FooterNote>
                {t(
                  'dapp.connect_permissions_hint',
                  'The site will be able to view your public address and request signatures.',
                )}
              </FooterNote>
            </HintRow>
          </Card>

          <Card>
            <SectionHeader>
              <AccountBalanceWalletOutlinedIcon sx={sectionIconSx} />
              <Label sx={{ margin: 0 }}>{t('dapp.wallet_address', 'Wallet')}</Label>
            </SectionHeader>
            <Value>{shortAddress || t('dapp.current_wallet', 'Current wallet')}</Value>
            {address && <MonoValue>{address}</MonoValue>}
            {showOriginWarning && (
              <Box sx={{ marginTop: 2 }}>
                <WarningNotice
                  tone="warning"
                  title={t('dapp.insecure_origin_warning', 'This origin does not use HTTPS.')}
                />
              </Box>
            )}
          </Card>
        </ScrollArea>

        <ButtonsContainer>
          <PrimaryButton onClick={onApprove} loading={loading} disabled={disabled || loading}>
            {t('dapp.approve', 'Approve').toUpperCase()}
          </PrimaryButton>
          <SecondaryButton onClick={onReject} disabled={loading}>
            {t('dapp.deny', 'Deny').toUpperCase()}
          </SecondaryButton>
        </ButtonsContainer>
      </Content>
    </Container>
  );
}
