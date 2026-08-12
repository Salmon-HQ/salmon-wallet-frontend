/**
 * WalletInitErrorScreen - full-screen blocking state shown when wallet
 * initialization failed and no accounts could be loaded.
 *
 * Rendered by the web AuthGuard and the extension App gate BEFORE any
 * onboarding redirect: sending a user with broken storage into "create a
 * new wallet" risks overwriting an existing vault. The lock screen always
 * takes precedence over this screen (callers check `locked` first).
 */

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  gradients,
  spacing,
} from '@salmon/shared';
import { styled } from '../../utils/styled';

export interface WalletInitErrorScreenProps {
  /** Re-runs wallet initialization. The gate stays up until it succeeds. */
  onRetry: () => Promise<void> | void;
}

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: spacing.xl,
  backgroundColor: colors.background.primary,
  textAlign: 'center',
});

const Title = styled(Typography)({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  marginBottom: spacing.md,
});

const Body = styled(Typography)({
  fontSize: fontSize.base,
  fontFamily: fontFamily.sans,
  color: colors.text.secondary,
  marginBottom: spacing.xl,
  maxWidth: 320,
});

const RetryButton = styled(ButtonBase)({
  minWidth: 200,
  height: componentSizes.buttonHeightMedium,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  border: `${borderWidth.thin}px solid ${colors.accent.border}`,
  background: gradients.primaryCSS,
});

const RetryButtonText = styled(Typography)({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
});

export function WalletInitErrorScreen({ onRetry }: WalletInitErrorScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }, [onRetry]);

  return (
    <Container data-testid="wallet-init-error">
      <Title>{t('wallet.init_failed_title', "Couldn't load your wallet")}</Title>
      <Body>
        {t('wallet.init_failed_body', 'Your accounts and funds are safe. Please try again.')}
      </Body>
      <RetryButton onClick={handleRetry} disabled={retrying} data-testid="wallet-init-retry">
        {retrying ? (
          <CircularProgress size={18} sx={{ color: colors.text.primary }} />
        ) : (
          <RetryButtonText>{t('actions.retry', 'Retry').toUpperCase()}</RetryButtonText>
        )}
      </RetryButton>
    </Container>
  );
}
