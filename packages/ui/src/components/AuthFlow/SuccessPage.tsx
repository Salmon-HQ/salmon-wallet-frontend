import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { colors, fontFamily, spacing } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton, SecondaryButton, TextButton } from '../Button';
import { BaseDialog } from '../BaseDialog';
import { getAuthContainerStyles } from './common';
import { WaterColumn } from '../WaterColumn';
import type { SuccessPageProps } from './types';

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

const LogoImage = styled('img')({
  width: 80,
  height: 80,
  objectFit: 'contain',
  marginBottom: spacing['2xl'],
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

const Subtitle = styled(Typography)({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontSize: 16,
  lineHeight: '24px',
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

export function SuccessPage({
  onGoToWallet,
  onCheckDerived,
  contained = false,
}: SuccessPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [showDialog, setShowDialog] = useState(false);
  const toggleDialog = useCallback(() => {
    setShowDialog((prev) => !prev);
  }, []);

  return (
    <Container $contained={contained}>
      <WaterColumn />
      <TopSpacer />

      <CenterContent>
        <LogoImage src="/images/Logo.png" alt="Salmon Wallet" />
        <Title>{t('wallet.create.success_message')}</Title>
        <Subtitle>{t('wallet.create.success_message_body')}</Subtitle>
      </CenterContent>

      <ButtonsContainer>
        <PrimaryButton onClick={onGoToWallet} testID="success-go-to-wallet-button">
          {t('wallet.create.go_to_my_wallet')}
        </PrimaryButton>
        <SecondaryButton onClick={onCheckDerived} testID="success-check-derived-button">
          {t('wallet.create.check_derivables')}
        </SecondaryButton>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <TextButton
            onClick={toggleDialog}
            color={colors.text.secondary}
            testID="success-info-button"
          >
            {t('wallet.create.derivable_info_icon')}
          </TextButton>
        </Box>
      </ButtonsContainer>

      <BaseDialog visible={showDialog} onClose={toggleDialog}>
        <BaseDialog.Header title={t('wallet.create.derivable_info')} />
        <BaseDialog.Content>
          <Typography
            sx={{
              color: colors.text.secondary,
              fontFamily: fontFamily.sans,
              fontSize: 14,
              lineHeight: '22px',
              textAlign: 'center',
            }}
          >
            {t('wallet.create.derivable_description')}
          </Typography>
        </BaseDialog.Content>
        <BaseDialog.Actions>
          <BaseDialog.ActionButton onClick={toggleDialog}>
            {t('actions.continue')}
          </BaseDialog.ActionButton>
        </BaseDialog.Actions>
      </BaseDialog>
    </Container>
  );
}
