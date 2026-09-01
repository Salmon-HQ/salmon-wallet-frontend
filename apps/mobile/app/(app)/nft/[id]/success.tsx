/**
 * NFT · the receipt.
 *
 * Shares the same CORE 07 composition as `send/success.tsx` now —
 * `ReceiptScreen tone="transfer"` — rather than the exchange-graphic
 * component swap renders. Only the container stays route-owned: its own
 * water, its own safe area, and no back gesture behind it (the layout takes
 * it off; the hardware back does what the one control does).
 *
 * `successSettling` gates the primary and the explorer link rather than
 * swapping in a separate loader — pressing "Continue" while the indexer has
 * not caught up would send the user home to a stale balance, so the CTA
 * stays disabled until it clears.
 */
import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getShortAddress } from '@salmon/shared';

import { DepthBackground, ReceiptScreen, ScalesBackground } from '../../../../src/components';
import { useNftFlow } from '../../../../src/contexts/NftFlowContext';

export default function NftSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    nft,
    recipient,
    resolvedRecipient,
    successKind,
    successSettling,
    explorerUrl,
    acknowledgeSuccess,
  } = useNftFlow();

  const isBurn = successKind === 'burn';
  const name = nft?.name ?? '';

  // "Return home" leaves the whole NFT sub-stack behind and lands back on the
  // collectibles grid the flow started from — `dismissTo` keeps that screen's
  // own instance (and its sub-tab) rather than replacing it with a fresh one.
  const handleContinue = useCallback(() => {
    acknowledgeSuccess();
    router.dismissTo('/');
  }, [acknowledgeSuccess, router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleContinue();
      return true;
    });
    return () => subscription.remove();
  }, [handleContinue]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ReceiptScreen
        tone="transfer"
        title={isBurn ? t('nft.burn.successTitle') : t('nft.send.successTitle')}
        body={
          isBurn
            ? t('nft.burn.successSummary', { name })
            : t('nft.send.successSummary', {
                name,
                // The address that was actually paid, not the domain typed.
                address: getShortAddress(resolvedRecipient ?? recipient) ?? recipient,
              })
        }
        rows={[
          {
            label: t('send.screens.status'),
            value: t('transactions.detail.confirmed'),
            valueTone: 'success',
          },
        ]}
        explorerUrl={explorerUrl ?? undefined}
        settling={successSettling}
        primary={{ label: t('transaction.continue'), onPress: handleContinue, testID: 'tx-success-continue-button' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
