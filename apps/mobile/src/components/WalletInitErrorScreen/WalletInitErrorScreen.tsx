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
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
  borderRadius,
  borderWidth,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  gradients,
  ms,
  s,
  spacing,
  vs,
} from '@salmon/shared';

export interface WalletInitErrorScreenProps {
  /** Re-runs wallet initialization. The gate stays up until it succeeds. */
  onRetry: () => Promise<void> | void;
}

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
    <View style={styles.container} testID="wallet-init-error">
      <Text style={styles.title}>{t('wallet.init_failed_title', "Couldn't load your wallet")}</Text>
      <Text style={styles.body}>
        {t('wallet.init_failed_body', 'Your accounts and funds are safe. Please try again.')}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        disabled={retrying}
        activeOpacity={0.7}
        testID="wallet-init-retry"
      >
        <LinearGradient
          colors={[...gradients.primary.colors]}
          style={styles.retryButtonGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.4 }}
        >
          {retrying ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <Text style={styles.retryButtonText}>
              {t('actions.retry', 'Retry').toUpperCase()}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing['2xl']),
    backgroundColor: colors.background.primary,
  },
  title: {
    fontFamily: fontFamilyNative.semiBold,
    fontSize: ms(fontSize.xl),
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: vs(spacing.md),
  },
  body: {
    fontFamily: fontFamilyNative.regular,
    fontSize: ms(fontSize.base),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  retryButton: {
    minWidth: s(200),
    minHeight: vs(componentSizes.buttonHeightMedium),
    borderRadius: ms(borderRadius.lg),
    borderWidth: borderWidth.thin,
    borderColor: colors.accent.border,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontFamily: fontFamilyNative.bold,
    fontSize: ms(fontSize.sm),
    color: colors.text.primary,
  },
});

export default WalletInitErrorScreen;
