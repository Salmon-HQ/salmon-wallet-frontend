/**
 * Send · the receipt — CORE 07.
 *
 * Composed from `ReceiptScreen tone="transfer"` — a seal, a sentence, and a
 * four-row receipt card with two actions under it. The composition itself
 * lives in `src/components/ReceiptScreen`; this screen only supplies the
 * send flow's data and the route-level chrome (the water, the safe area,
 * the hardware back).
 *
 * The receipt arrives whole (DESIGN.md §The receipt): no entrance of its own,
 * and no back gesture to the signature behind it.
 */
import React, { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatTokenAmount,
  getDefaultExplorer,
  getShortAddress,
  getTransactionUrl,
  type Blockchain,
  type NetworkEnvironment,
} from '@salmon/shared';

import { DepthBackground, ReceiptScreen, ScalesBackground } from '../../../src/components';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';

export default function SendSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { token, recipient, amount, txId, account, blockchain, reset } = useSendFlow();

  const amountDisplay = token ? `${formatTokenAmount(parseFloat(amount))} ${token.symbol}` : '';
  const destination = recipient ? recipient.resolvedAddress || recipient.address : '';
  const recipientName = recipient?.name ?? getShortAddress(destination) ?? destination;

  const explorerUrl =
    txId && account
      ? getTransactionUrl(
          blockchain.toUpperCase() as Blockchain,
          account.getNetworkId() as NetworkEnvironment,
          getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
          txId
        )
      : undefined;

  const handleReturnHome = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset, router]);

  // There is nothing behind a signed transfer, so the hardware back does what
  // the only control on this screen does. The gesture is off in the layout.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleReturnHome();
      return true;
    });
    return () => subscription.remove();
  }, [handleReturnHome]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ReceiptScreen
        tone="transfer"
        title={t('send.screens.successTitle')}
        body={t('send.screens.successBody', { amount: amountDisplay, name: recipientName })}
        rows={[
          { label: t('token.send.amountLabel'), value: amountDisplay },
          { label: t('transactions.to'), value: recipientName },
          {
            label: t('send.screens.status'),
            value: t('transactions.detail.confirmed'),
            valueTone: 'success',
          },
        ]}
        explorerUrl={explorerUrl ?? undefined}
        primary={{
          label: t('transaction.continue'),
          onPress: handleReturnHome,
          testID: 'tx-success-continue-button',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
