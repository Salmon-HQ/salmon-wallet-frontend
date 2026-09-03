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
import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  SOL_CONSTANTS,
  formatTokenAmount,
  fontFamilyNative,
  fontSize,
  getShortAddress,
  getSolShortfall,
  useFieldFocus,
  lineHeight,
  s,
  sanitizeDecimalInput,
  spacing,
  tabularNums,
  useCurrencyContext,
  vs,
  type Semantic,
} from '@salmon/shared';

import {
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
import { useThemedStyles, useSemantic } from '../../../src/theme/useThemedStyles';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/**
 * The amount being typed, at the size the frames draw it (CORE 05, 46/700).
 *
 * Deliberately a local constant rather than a new step in `fontSize`: the
 * scale tops out at the balance's 38 and this is the one number in the app
 * larger than the total balance — a size this screen owns, not a role the
 * type system offers.
 */
const AMOUNT_ENTRY_FONT = 46;

/** How long the fee estimate waits before firing, in ms. */
const FEE_DEBOUNCE_MS = 300;

/** The four fills the frames draw. `1` is MAX — the whole balance, as today. */
const SHORTCUTS = [
  { key: '25', value: 0.25 },
  { key: '50', value: 0.5 },
  { key: '75', value: 0.75 },
  { key: 'max', value: 1 },
] as const;

/** Prints a small SOL amount plainly — 0.000005, never 5e-6. */
function formatSolAmount(value: number): string {
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

export default function SendAmountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useThemedStyles(stylesFor);
  const semantic = useSemantic();
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

  const handleShortcut = useCallback(
    (key: string) => {
      const option = SHORTCUTS.find((shortcut) => shortcut.key === key);
      if (!option || !token) return;
      const fillAmount = tokenBalance * option.value;
      const decimals = token.decimals ?? 9;
      const truncated = Math.floor(fillAmount * 10 ** decimals) / 10 ** decimals;
      setAmount(truncated > 0 ? truncated.toString() : '0');
    },
    [tokenBalance, token, setAmount]
  );

  const tokenPrice = token?.price;
  const fiatDisplay = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const fiat = !tokenPrice || numAmount === 0 ? 0 : numAmount * tokenPrice;
    return `≈ ${formatPrecise(fiat)} ${currency.toUpperCase()}`;
  }, [amount, tokenPrice, formatPrecise, currency]);

  const shortcutOptions = useMemo(
    () =>
      SHORTCUTS.map((shortcut) => ({
        key: shortcut.key,
        label: shortcut.key === 'max' ? t('general.max') : `${shortcut.key}%`,
      })),
    [t]
  );

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
        <Card
          padding="lg"
          gap={spacing.base}
          style={[
            styles.amountCard,
            amountFocus.focused && { borderColor: semantic.accent.ink },
          ]}
        >
          <View style={styles.amountRow}>
            <TextInput
              testID="send-amount-input"
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={semantic.text.tertiary}
              onFocus={amountFocus.onFocus}
              onBlur={amountFocus.onBlur}
              value={amount}
              onChangeText={(text) => setAmount(sanitizeDecimalInput(text))}
              keyboardType="decimal-pad"
              autoCorrect={false}
            />
            <Text style={styles.ticker}>{token?.symbol ?? ''}</Text>
          </View>
          <Text style={styles.fiat} testID="send-amount-fiat">
            {fiatDisplay}
          </Text>
        </Card>

        <ChipGroup
          testID="send-shortcuts"
          options={shortcutOptions}
          // A shortcut is an action, not a selection: nothing stays lit after
          // the fill, so the group never carries a value.
          value=""
          onChange={handleShortcut}
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
    amountCard: {
      alignItems: 'center',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: s(spacing.sm),
    },
    amountInput: {
      ...TABULAR,
      minWidth: s(80),
      fontSize: s(AMOUNT_ENTRY_FONT),
      lineHeight: s(AMOUNT_ENTRY_FONT) * lineHeight.snug,
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      textAlign: 'right',
      paddingVertical: 0,
    },
    ticker: {
      fontSize: s(fontSize.body),
      fontFamily: fontFamilyNative.bold,
      color: t.text.secondary,
    },
    fiat: {
      ...TABULAR,
      fontSize: s(fontSize.mono),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
    },
    shortcuts: {
      flexGrow: 0,
    },
    action: {
      paddingHorizontal: s(spacing.screenGutter),
      paddingTop: vs(spacing.md),
    },
  });
