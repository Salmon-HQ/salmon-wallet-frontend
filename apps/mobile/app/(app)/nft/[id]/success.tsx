/**
 * NFT · the receipt.
 *
 * The sheet rendered `TransactionSuccessScreen` for both an NFT send and an
 * NFT burn, so the screen does too — same component, same props, same
 * `settling` gate holding the CTA until the indexer has caught up. Only the
 * container changed: it is a route now instead of a step, so the receipt gets
 * its own water and its own safe area, and there is no back gesture behind it
 * (the layout takes it off; the hardware back does what the one control does).
 */
import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getShortAddress } from '@salmon/shared';

import {
  DepthBackground,
  ScalesBackground,
  TransactionSuccessScreen,
} from '../../../../src/components';
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

      <TransactionSuccessScreen
        title={isBurn ? t('nft.burn.successTitle') : t('nft.send.successTitle')}
        pendingTitle={isBurn ? t('nft.burn.submitting') : t('nft.send.sending')}
        summary={
          isBurn
            ? t('nft.burn.successSummary', { name })
            : t('nft.send.successSummary', {
                name,
                // The address that was actually paid, not the domain typed.
                address: getShortAddress(resolvedRecipient ?? recipient) ?? recipient,
              })
        }
        explorerUrl={explorerUrl}
        onContinue={handleContinue}
        settling={successSettling}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
