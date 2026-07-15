import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import {
  colors,
  componentSizes,
  contentPadding,
  fontFamily,
  fontSize,
  ms,
  s,
  spacing,
  vs,
} from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton } from '../Button';
import { getAuthContainerStyles } from './common';
import type { SelectOptionsPageProps } from './types';
import { ScreenHeader } from '../ScreenHeader';

const Container = styled(Box)<{ $contained?: boolean }>(({ $contained = false }) => ({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: colors.background.primary,
  ...getAuthContainerStyles($contained),
}));

const Content = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: `0 ${s(contentPadding.screen)}px`,
});

const CenterContent = styled(Box)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

const WelcomeText = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: ms(fontSize['2xl']),
  lineHeight: `${ms(32)}px`,
  textAlign: 'center',
  marginBottom: vs(spacing['3xl']),
});

const LogoImage = styled('img')({
  width: s(componentSizes.logoSizeMedium),
  height: s(componentSizes.logoSizeMedium),
  objectFit: 'contain',
  marginBottom: vs(spacing['2xl']),
});

const BrandName = styled(Typography)({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: 700,
  fontSize: ms(32),
  lineHeight: `${ms(40)}px`,
  textAlign: 'center',
});

const ButtonsContainer = styled(Box)({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: vs(spacing.lg),
  paddingTop: vs(spacing.lg),
  paddingBottom: vs(spacing['3xl']),
});

export function SelectOptionsPage({
  onCreateWallet,
  onRecoverWallet,
  hasAccounts,
  onAccessExisting,
  contained = false,
}: SelectOptionsPageProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Container $contained={contained}>
      <ScreenHeader />
      <Content>
        <CenterContent>
          <WelcomeText>
            {hasAccounts
              ? t('wallet.onboarding.titleOnboarded', 'Add Account')
              : t('wallet.onboarding.titleWelcome', 'Welcome')}
          </WelcomeText>
          <LogoImage src="/images/Logo.png" alt="Salmon" />
          <BrandName>Salmon</BrandName>
        </CenterContent>

        <ButtonsContainer>
          <PrimaryButton onClick={onCreateWallet} testID="select-create-button">
            {t('wallet.create_wallet', 'CREATE ACCOUNT').toUpperCase()}
          </PrimaryButton>
          <SecondaryButton onClick={onRecoverWallet} testID="select-recover-button">
            {t('wallet.recover_wallet', 'RECOVER ACCOUNT').toUpperCase()}
          </SecondaryButton>
          {hasAccounts && onAccessExisting && (
            <SecondaryButton onClick={onAccessExisting} testID="select-access-existing-button">
              {t('wallet.access_existing', 'ACCESS EXISTING ACCOUNT').toUpperCase()}
            </SecondaryButton>
          )}
        </ButtonsContainer>
      </Content>
    </Container>
  );
}
