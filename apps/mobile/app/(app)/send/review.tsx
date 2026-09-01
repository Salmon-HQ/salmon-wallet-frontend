/**
 * Send · review and sign — CORE 06.
 *
 * The last screen before the money moves, and the one place in this flow where
 * nothing was allowed to change shape. The fee is estimated once for the whole
 * flow, with exactly the parameters the transfer will carry: the amount screen
 * already asked for it and the context is holding it, so this screen reads
 * that estimate rather than paying for a second one. Arriving here without one
 * — a deep link, or an estimate that failed upstream — asks again, which is
 * what `estimateFee` is for; it no-ops when the answer is already held. Confirm calls the
 * flow's `submit`, which is the sheet's `submitSend` moved up a level, not
 * rewritten. There is no spinner on the control: the tap hands the screen to
 * the wait, and the passage is the answer (DESIGN.md §Buttons).
 *
 * A failed transfer is not reported here. Committing hands the screen to the
 * task surface the layout owns, and the surface keeps the screen on a failure
 * too — the error and its retry live there, where the user actually is.
 */
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  chunkAddress,
  formatTokenAmount,
  getShortAddress,
  s,
  spacing,
  vs,
} from '@salmon/shared';

import {
  Card,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  SecondaryButton,
} from '../../../src/components';
import { WarningNotice } from '../../../src/components/WarningNotice';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useTabChrome } from '../../../hooks/useTabChrome';

export default function SendReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { floatingBottomOffset } = useTabChrome();
  const { token, recipient, amount, sendHook, submit, reset, estimatedFee, estimateFee } =
    useSendFlow();

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';

  // What the transfer will actually pay. When a `.sol` domain was typed, the
  // resolved address is the destination — showing the domain here would ask
  // the user to sign for something this screen never displayed.
  const destinationAddress = recipient
    ? recipient.resolvedAddress || recipient.address
    : '';
  const resolvedFromDomain =
    recipient?.resolvedAddress && recipient.resolvedAddress !== recipient.address
      ? recipient.address
      : null;

  // Ask only if the flow is not already holding the answer for this pair.
  useEffect(() => {
    if (!estimatedFee) estimateFee();
  }, [estimatedFee, estimateFee]);

  // Cancel leaves the flow entirely: the amount and the recipient are two
  // screens back, and this control is the way out, not the way back.
  const handleCancel = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset, router]);

  const amountDisplay = token ? `${formatTokenAmount(parseFloat(amount))} ${token.symbol}` : '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        backDisabled={isSending}
        title={t('send.screens.reviewTitle')}
        subtitle={t('send.screens.reviewSubtitle')}
      />

      <ScrollView
        testID="send-review-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card padding="lg" gap={spacing.md} testID="send-review-summary">
          <KeyValueRow
            testID="send-confirm-amount"
            label={t('token.send.amountLabel')}
            value={amountDisplay}
          />
          <KeyValueRow
            label={t('transactions.to')}
            value={recipient?.name ?? (getShortAddress(destinationAddress) ?? destinationAddress)}
          />
          {/* Mono in 4-character chunks: fixed-width chunks are what let the
              eye compare a prefix and suffix positionally. */}
          <KeyValueRow
            testID="send-confirm-address"
            label={t('send.screens.address')}
            value={chunkAddress(destinationAddress)}
          />
          {resolvedFromDomain !== null && (
            <KeyValueRow
              testID="send-confirm-resolved-from"
              label={t('send.recipient')}
              value={resolvedFromDomain}
              valueTone="secondary"
            />
          )}
          <KeyValueRow
            testID="send-review-fee"
            label={t('token.send.networkFee')}
            value={estimatedFee ? `~${estimatedFee}` : '—'}
            valueTone={estimatedFee ? 'primary' : 'secondary'}
          />
        </Card>

        {/* Estimation failure keeps the row visible as a notice instead of
            hiding it; confirming stays enabled, exactly as before. */}
        {sendHook.feeEstimateFailed && !estimatedFee && (
          <WarningNotice
            tone="warning"
            title={t('send.fee_estimate_failed')}
            style={styles.notice}
          />
        )}
      </ScrollView>

      <View style={[styles.action, { paddingBottom: floatingBottomOffset }]}>
        <SecondaryButton
          testID="send-confirm-cancel-button"
          onPress={handleCancel}
          disabled={isSending}
        >
          {t('actions.cancel')}
        </SecondaryButton>
        <PrimaryButton testID="send-confirm-button" onPress={submit} disabled={isSending}>
          {t('actions.confirm')}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  content: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingBottom: vs(spacing.screenGutter),
    gap: vs(spacing.screenGutter),
  },
  notice: {
    marginTop: 0,
  },
  // The cancel sits above the commit: the decision reads down to the control
  // that performs it.
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
    gap: vs(spacing.md),
  },
});
