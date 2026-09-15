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
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  chunkAddress,
  fontFamilyNative,
  fontSize,
  formatTokenAmount,
  getShortAddress,
  isSendRequestUnderfunded,
  s,
  sendRequestReviewRows,
  spacing,
  vs,
  type SendToken,
  type Semantic,
} from '@salmon/shared';

import {
  Card,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  SecondaryButton,
  TokenPickerSheet,
} from '../../../src/components';
import { WarningNotice } from '../../../src/components/WarningNotice';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useThemedStyles } from '../../../src/theme/useThemedStyles';
import { useTabChrome } from '../../../hooks/useTabChrome';

export default function SendReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const { floatingBottomOffset } = useTabChrome();
  const {
    token,
    setToken,
    tokens,
    tokensLoading,
    recipient,
    amount,
    sendHook,
    submit,
    reset,
    estimatedFee,
    estimateFee,
    request,
    liveBalance,
  } = useSendFlow();

  // Started from a payment request: the requester fixed the token and the
  // amount, so neither is offered for change here, and a balance that does
  // not cover the request blocks the commit — the wallet never substitutes
  // another token (spec 033 FR-021, FR-023).
  const requestRows = sendRequestReviewRows(request);
  const insufficient = isSendRequestUnderfunded(request, amount, liveBalance);

  const [pickerOpen, setPickerOpen] = useState(false);

  // A token picked here may not cover the amount already typed on the
  // previous screen — the fee re-estimates itself (`estimateFee` is keyed on
  // token:recipient, so a new token drops the stale estimate), but the
  // amount is the one thing this screen cannot fix on its own. So: send the
  // user back to `/send/amount` with the new token already selected when it
  // no longer fits, and stay put otherwise.
  const handleSelectToken = (next: SendToken) => {
    setToken(next);
    setPickerOpen(false);
    const numAmount = parseFloat(amount);
    const nextBalance =
      typeof next.uiAmount === 'string' ? parseFloat(next.uiAmount) : (next.uiAmount ?? 0);
    if (!isNaN(numAmount) && numAmount > nextBalance) {
      router.dismissTo('/send/amount');
    }
  };

  const isSending = sendHook.status === 'creating' || sendHook.status === 'sending';
  const confirmDisabled = isSending || insufficient;

  // What the transfer will actually pay. When a `.sol` domain was typed, the
  // resolved address is the destination — showing the domain here would ask
  // the user to sign for something this screen never displayed.
  const destinationAddress = recipient ? recipient.resolvedAddress || recipient.address : '';
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
          {/* Who asked, and what for — the request's own words, above what
              it fixed. */}
          {requestRows.map((row) => (
            <KeyValueRow
              key={row.key}
              testID={row.testID}
              label={t(row.labelKey)}
              value={row.value}
            />
          ))}
          {/* The one row that carries an action: a wrong token picked on
              `/send` is fixed here rather than by starting the flow over
              (owner ruling 2026-09-01). The action sits beside the label,
              not the value, so the amount still right-aligns with every
              other row's value. A request fixed the token: no action. */}
          <KeyValueRow
            testID="send-confirm-amount"
            label={t('token.send.amountLabel')}
            value={amountDisplay}
            labelAction={
              request ? undefined : (
                <TouchableOpacity
                  testID="send-review-change-token"
                  onPress={() => setPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('actions.change')}
                >
                  <Text style={styles.changeLink}>{t('actions.change')}</Text>
                </TouchableOpacity>
              )
            }
          />
          <KeyValueRow
            label={t('transactions.to')}
            value={recipient?.name ?? getShortAddress(destinationAddress) ?? destinationAddress}
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

        {insufficient && (
          <WarningNotice
            tone="error"
            title={t('transaction.errors.insufficientFunds')}
            style={styles.notice}
            testID="send-review-insufficient"
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
        <PrimaryButton testID="send-confirm-button" onPress={submit} disabled={confirmDisabled}>
          {t('actions.confirm')}
        </PrimaryButton>
      </View>

      <TokenPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tokens={tokens}
        loading={tokensLoading}
        onSelectToken={handleSelectToken}
      />
    </SafeAreaView>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
    changeLink: {
      fontFamily: fontFamilyNative.semiBold,
      fontSize: s(fontSize.body),
      color: t.text.accent,
    },
    // The cancel sits above the commit: the decision reads down to the control
    // that performs it.
    action: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
      gap: vs(spacing.md),
    },
  });
