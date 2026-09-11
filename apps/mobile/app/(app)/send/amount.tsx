/**
 * Send · how much — CORE 05.
 *
 * Every number on this screen is the sheet's, unchanged:
 *
 * - the balance is the live one, re-read from the reactive token list rather
 *   than a snapshot taken when the screen opened;
 * - the shortcuts fill `balance × percentage` truncated at the token's own
 *   decimals — the same expression, including MAX, which has never subtracted
 *   a fee and does not start now;
 * - "valid" is the same predicate: a finite amount above zero, within the
 *   balance, with the address already judged and no SOL shortfall.
 *
 * The SOL shortfall block is said before the form for the reason it always
 * was: without the fee there is no transfer to compose.
 *
 * The fee is drawn here as well as on the review screen, and it is one
 * estimate, not two: the flow's context holds it keyed on the token and the
 * recipient, so this screen asking for it is what the review screen later
 * reads (see `SendFlowContext`).
 *
 * What the frames ask for and this screen still does not carry: the memo
 * field. A memo has to reach the transaction builder, which is a
 * transaction-path change and is not made here. See the spec report.
 */
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SOL_CONSTANTS,
  formatTokenAmount,
  getShortAddress,
  getSolShortfall,
  useFieldFocus,
  s,
  spacing,
  useCurrencyContext,
  vs,
  type Semantic,
  useAmountShortcuts,
} from '@salmon/shared';

import {
  AmountEntryCard,
  Card,
  ChipGroup,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
} from '../../../src/components';
import { WarningNotice } from '../../../src/components/WarningNotice';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useThemedStyles } from '../../../src/theme/useThemedStyles';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';

/** How long the fee estimate waits before firing, in ms. */
const FEE_DEBOUNCE_MS = 300;

/** Prints a small SOL amount plainly — 0.000005, never 5e-6. */
function formatSolAmount(value: number): string {
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export default function SendAmountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const amountFocus = useFieldFocus();
  const { floatingBottomOffset } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const {
    blockchain,
    token,
    liveBalance,
    nativeBalance,
    recipient,
    amount,
    setAmount,
    estimatedFee,
    estimateFee,
  } = useSendFlow();

  const tokenBalance = useMemo(() => {
    if (typeof liveBalance === 'number' && Number.isFinite(liveBalance)) return liveBalance;
    const fallback = token?.uiAmount;
    return typeof fallback === 'string' ? parseFloat(fallback) : (fallback ?? 0);
  }, [liveBalance, token?.uiAmount]);

  // Every Solana transfer pays its fee in SOL, so a wallet holding this token
  // and no SOL cannot send it — the token balance alone says otherwise.
  const solShortfall = useMemo(() => {
    if (blockchain !== 'solana' || nativeBalance === undefined || !token) return null;
    return getSolShortfall({
      nativeBalanceSol: nativeBalance,
      isTokenTransfer: token.address !== SOL_CONSTANTS.ADDRESS,
    });
  }, [blockchain, nativeBalance, token]);

  const isValid = useMemo(() => {
    const numAmount = parseFloat(amount);
    const amountValid = !isNaN(numAmount) && numAmount > 0 && numAmount <= tokenBalance;
    // Blocked rather than warned: without the fee the network refuses the
    // transfer outright, so letting it through only spends the user's time.
    return !!token && !!recipient && amountValid && !solShortfall;
  }, [amount, tokenBalance, token, recipient, solShortfall]);

  // The balance fills; a fill stays lit until the user types over it.
  const shortcuts = useAmountShortcuts({
    balance: token ? tokenBalance : undefined,
    decimals: token?.decimals,
    setAmount,
    maxLabel: t('general.max'),
  });

  const tokenPrice = token?.price;
  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fiat = !tokenPrice || numAmount === 0 ? 0 : numAmount * tokenPrice;
    return `≈ ${formatPrecise(fiat)} ${currency.toUpperCase()}`;
  }, [amount, tokenPrice, formatPrecise, currency]);

  const recipientShort = recipient
    ? (getShortAddress(recipient.resolvedAddress || recipient.address, 4) ??
      recipient.resolvedAddress ??
      recipient.address)
    : '';

  // The fee, asked for once the screen settles. The context no-ops a request
  // for a pair it already holds, so the debounce only spares the first frames
  // of a token change — it is not what keeps the request count at one.
  // `hasAmount` is a dependency because the context refuses to price an
  // empty amount: the request has to fire again the moment there is one.
  const hasAmount = parseFloat(amount) > 0;
  useEffect(() => {
    if (!hasAmount) return undefined;
    const timer = setTimeout(estimateFee, FEE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [estimateFee, hasAmount]);

  const actionBottomPadding =
    keyboardHeight > 0 ? keyboardHeight + vs(spacing.sm) : floatingBottomOffset;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DepthBackground />
      <ScalesBackground variant="deepField" />

      <ScreenHeader
        onBack={() => router.back()}
        title={`${t('token.action.send')} ${token?.symbol ?? ''}`.trim()}
        subtitle={t('send.screens.amountSubtitle')}
      />

      <ScrollView
        testID="send-amount-screen"
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {solShortfall !== null && (
          <WarningNotice tone="warning" title={t('token.send.no_sol_title')}>
            {t('token.send.no_sol_body', { amount: formatSolAmount(solShortfall) })}
          </WarningNotice>
        )}

        {/* The token is chosen a screen back now (owner ruling 2026-09-01);
            this row only restates the balance the header's "Send {TICKER}"
            already named. A bare row, not a card: the frames give it no
            ground of its own — it is a caption on the amount entry below
            it, and a card here would read as a second object competing
            with the one thing this screen is for. */}
        <KeyValueRow
          testID="send-selected-token"
          label={t('send.screens.available')}
          value={`${formatTokenAmount(tokenBalance)} ${token?.symbol ?? ''}`}
        />

        {/* The amount. Tabular, so a repoll never reflows the digits. */}
        <AmountEntryCard
          testID="send-amount"
          value={amount}
          onChangeValue={shortcuts.onAmountChange}
          subtext={fiatDisplay}
          focused={amountFocus.focused || shortcuts.selected !== ''}
          onFocus={amountFocus.onFocus}
          onBlur={amountFocus.onBlur}
        />

        <ChipGroup
          testID="send-shortcuts"
          options={shortcuts.options}
          value={shortcuts.selected}
          onChange={shortcuts.select}
          size="md"
          fill
          variant="outline"
          style={styles.shortcuts}
        />

        {/* Who this pays, restated where the amount is decided. */}
        <Card padding="sm" gap={spacing.sm} testID="send-amount-recipient">
          <KeyValueRow label={t('transactions.to')} value={recipient?.name ?? recipientShort} />
          <KeyValueRow label={t('send.screens.address')} value={recipientShort} />
        </Card>

        {/* What the transfer costs and how long it takes — the two questions
            the amount raises, answered before Review rather than after it. The
            estimate is the flow's, so the review screen does not ask twice. */}
        <Card padding="sm" gap={spacing.sm} testID="send-amount-fee">
          <KeyValueRow
            testID="send-amount-network-fee"
            label={t('token.send.networkFee')}
            value={estimatedFee ? `~${estimatedFee}` : '—'}
            valueTone={estimatedFee ? 'primary' : 'secondary'}
          />
          <KeyValueRow
            label={t('send.screens.estimatedArrival')}
            value={t('send.screens.arrivalSeconds')}
          />
        </Card>
      </ScrollView>

      <View style={[styles.action, { paddingBottom: actionBottomPadding }]}>
        <PrimaryButton
          testID="send-review-button"
          onPress={() => router.push('/send/review')}
          disabled={!isValid}
        >
          {t('send.screens.reviewTitle')}
        </PrimaryButton>
      </View>
    </SafeAreaView>
  );
}

const stylesFor = (_t: Semantic) =>
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
    shortcuts: {
      flexGrow: 0,
    },
    action: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
    },
  });
