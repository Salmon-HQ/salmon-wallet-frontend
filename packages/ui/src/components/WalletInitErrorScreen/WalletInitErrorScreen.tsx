/**
 * WalletInitErrorScreen - full-screen blocking state shown when wallet
 * initialization failed and no accounts could be loaded.
 *
 * Rendered by the extension App gate BEFORE any onboarding redirect: sending
 * a user with broken storage into "create a new wallet" risks overwriting an
 * existing vault. The lock screen always takes precedence over this screen
 * (callers check `locked` first). The mobile twin is
 * `apps/mobile/src/components/WalletInitErrorScreen`.
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentSizes, fontFamily, fontSize, fontWeight, spacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { PrimaryButton } from '../Button';
import type { WalletInitErrorScreenProps } from './types';

export type { WalletInitErrorScreenProps };

/** The body's measure, so the sentence does not run the panel's width. */
const BODY_MAX_WIDTH = 320;

export function WalletInitErrorScreen({ onRetry }: WalletInitErrorScreenProps): React.ReactElement {
  const { t: translate } = useTranslation();
  const t = useSemantic();
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
    <div
      data-testid="wallet-init-error"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: `0 ${spacing['2xl']}px`,
        backgroundColor: t.depth.abyss,
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          margin: `0 0 ${spacing.md}px`,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.title,
          fontWeight: fontWeight.semibold,
          color: t.text.primary,
        }}
      >
        {translate('wallet.init_failed_title', "Couldn't load your wallet")}
      </h1>
      <p
        style={{
          margin: `0 0 ${spacing['2xl']}px`,
          maxWidth: BODY_MAX_WIDTH,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.body,
          fontWeight: fontWeight.regular,
          color: t.text.secondary,
        }}
      >
        {translate(
          'wallet.init_failed_body',
          'Your accounts and funds are safe. Please try again.'
        )}
      </p>
      {/* The one action on this screen is the screen's committing action, so
          it is the shared button. Height is the only override. */}
      <PrimaryButton
        onPress={() => void handleRetry()}
        loading={retrying}
        disabled={retrying}
        fullWidth={false}
        testID="wallet-init-retry"
        style={{ height: componentSizes.buttonHeightMedium }}
      >
        {translate('actions.retry', 'Retry')}
      </PrimaryButton>
    </div>
  );
}
