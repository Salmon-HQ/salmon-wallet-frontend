/**
 * WalletInitErrorScreen - full-screen blocking state shown when wallet
 * initialization failed and no accounts could be loaded.
 *
 * Mobile counterpart of the DOM screen in
 * `packages/ui/src/components/WalletInitErrorScreen`. Rendered by the root
 * layout INSTEAD of the navigator, so a user with broken storage is never
 * routed into onboarding (which risks overwriting an existing vault). The
 * lock screen always takes precedence (the caller checks `locked` first).
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Semantic } from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { blockingScreenStyles } from '../../theme/blockingScreenStyles';
import type { WalletInitErrorScreenProps } from './types';

export type { WalletInitErrorScreenProps };

export function WalletInitErrorScreen({ onRetry }: WalletInitErrorScreenProps): React.ReactElement {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
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
    <View style={styles.container} testID="wallet-init-error">
      <Text style={styles.title}>{t('wallet.init_failed_title', "Couldn't load your wallet")}</Text>
      <Text style={styles.body}>
        {t('wallet.init_failed_body', 'Your accounts and funds are safe. Please try again.')}
      </Text>
      {/* The one action on this screen is the screen's committing action, so
          it is the shared button: it used to be a hand-painted
          `gradients.primary` box at `borderRadius.lg`, which made the only
          button here the only button in the app without the flesh in it.
          Height is the only override. */}
      <PrimaryButton
        style={styles.action}
        onPress={handleRetry}
        loading={retrying}
        disabled={retrying}
        testID="wallet-init-retry"
      >
        {t('actions.retry', 'Retry')}
      </PrimaryButton>
    </View>
  );
}

const stylesFor = (t: Semantic) => StyleSheet.create(blockingScreenStyles(t));
