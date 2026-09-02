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
import { useTranslation } from 'react-i18next';
import { colors, componentSizes, fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { PrimaryButton } from '../Button';

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
      {/* The one action on this screen is the screen's committing action, so
          it is the shared button: it used to be a hand-painted
          `gradients.primaryCSS` box at `borderRadius.lg`, which made the only
          button here the only button in the app without the flesh in it.
          Height is the only override. */}
      <PrimaryButton
        onPress={handleRetry}
        loading={retrying}
        disabled={retrying}
        fullWidth={false}
        testID="wallet-init-retry"
        style={{ height: componentSizes.buttonHeightMedium }}
      >
        {t('actions.retry', 'Retry')}
      </PrimaryButton>
    </Container>
  );
}
