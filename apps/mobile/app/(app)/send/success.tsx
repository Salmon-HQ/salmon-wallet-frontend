/**
 * Send · the receipt — CORE 07.
 *
 * Compared against `TransactionSuccessScreen` before this was written. That
 * component is the *exchange* receipt: a token-mark hero with an arrow between
 * two amounts, a quiet rate/fee/time block, and an explorer link over one
 * primary. Swap and the NFT send both render it, and CORE 07 asks for a
 * different object — a seal, a sentence, and a four-row receipt card with two
 * actions under it. Restyling the shared component into that shape would have
 * redrawn swap's receipt and the NFT one as a side effect, so this screen is
 * composed from the kit instead and the shared component is left alone.
 *
 * What is reused rather than re-invented: the success haptic, the explorer URL
 * the flow already builds, and the receipt's e2e vocabulary
 * (`tx-success-*`) — the ids the Maestro flows already select by.
 *
 * The receipt arrives whole (DESIGN.md §The receipt): no entrance of its own,
 * and no back gesture to the signature behind it.
 */
import React, { useCallback, useEffect } from 'react';
import { BackHandler, Linking, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  fontFamilyNative,
  fontSize,
  formatTokenAmount,
  getDefaultExplorer,
  getShortAddress,
  getTransactionUrl,
  letterSpacing,
  lineHeight,
  s,
  semantic,
  spacing,
  vs,
  type Blockchain,
  type NetworkEnvironment,
} from '@salmon/shared';

import {
  Card,
  DepthBackground,
  IconBubble,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  SecondaryButton,
} from '../../../src/components';
import { CheckIcon } from '../../../src/icons';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useTabChrome } from '../../../hooks/useTabChrome';

/** The seal: the ink well the frames draw, with the tick at its icon step. */
const SEAL_SIZE = 88;
const SEAL_ICON_SIZE = 48;

export default function SendSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { floatingBottomOffset } = useTabChrome();
  const { token, recipient, amount, txId, account, blockchain, reset } = useSendFlow();

  const amountDisplay = token ? `${formatTokenAmount(parseFloat(amount))} ${token.symbol}` : '';
  const destination = recipient ? recipient.resolvedAddress || recipient.address : '';
  const recipientName =
    recipient?.name ?? (getShortAddress(destination) ?? destination);

  const explorerUrl =
    txId && account
      ? getTransactionUrl(
          blockchain.toUpperCase() as Blockchain,
          account.getNetworkId() as NetworkEnvironment,
          getDefaultExplorer(blockchain.toUpperCase() as Blockchain),
          txId
        )
      : undefined;

  // The haptic is the whole of the arrival: the receipt is simply there,
  // complete, the frame it mounts.
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

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

      <View style={styles.cluster} testID="tx-success-screen">
        <IconBubble
          size={SEAL_SIZE}
          tone="ink"
          icon={CheckIcon}
          iconSize={SEAL_ICON_SIZE}
          iconWeight="bold"
          iconColor={semantic.status.success}
          testID="tx-success-seal"
        />
        <Text style={styles.title} testID="tx-success-title">
          {t('send.screens.successTitle')}
        </Text>
        <Text style={styles.body} testID="tx-success-summary">
          {t('send.screens.successBody', { amount: amountDisplay, name: recipientName })}
        </Text>

        <Card padding="lg" gap={spacing.md} style={styles.receipt} testID="tx-success-receipt">
          <KeyValueRow label={t('token.send.amountLabel')} value={amountDisplay} />
          <KeyValueRow label={t('transactions.to')} value={recipientName} />
          <KeyValueRow
            label={t('send.screens.status')}
            value={t('transactions.detail.confirmed')}
            valueTone="success"
          />
        </Card>
      </View>

      <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
        {explorerUrl && (
          <SecondaryButton
            testID="tx-success-explorer-link"
            onPress={() => Linking.openURL(explorerUrl)}
          >
            {t('transaction.viewOnExplorer')}
          </SecondaryButton>
        )}
        <PrimaryButton testID="tx-success-continue-button" onPress={handleReturnHome}>
          {t('transaction.continue')}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // The report sits in the middle of the water; the actions keep the bottom
  // edge.
  cluster: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.screenGutter),
    gap: vs(spacing.screenGutter),
  },
  title: {
    fontSize: s(fontSize.display),
    lineHeight: s(fontSize.display) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    letterSpacing: letterSpacing.snug,
    color: semantic.text.primary,
    textAlign: 'center',
  },
  body: {
    fontSize: s(fontSize.body),
    lineHeight: s(fontSize.body) * lineHeight.normal,
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'center',
  },
  receipt: {
    alignSelf: 'stretch',
  },
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    gap: vs(spacing.md),
  },
});
