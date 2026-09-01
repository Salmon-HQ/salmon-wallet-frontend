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
 * What the frames ask for and this screen does not carry: a memo field, and a
 * fee estimate beside the amount. A memo would have to reach the transaction
 * builder, and the fee is estimated once, on the review screen, where it
 * always has been — both are transaction-path changes and neither is made
 * here. See the spec report.
 */
import React, { useCallback, useMemo, useState } from 'react';
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
  lineHeight,
  s,
  sanitizeDecimalInput,
  semantic,
  spacing,
  tabularNums,
  useCurrencyContext,
  vs,
} from '@salmon/shared';

import {
  Card,
  ChipGroup,
  DepthBackground,
  KeyValueRow,
  PrimaryButton,
  ScalesBackground,
  ScreenHeader,
  TokenSelectList,
} from '../../../src/components';
import { BottomSheetContainer } from '../../../src/components/BottomSheetContainer';
import { WarningNotice } from '../../../src/components/WarningNotice';
import { useSendFlow } from '../../../src/contexts/SendFlowContext';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { useKeyboardHeight } from '../../../hooks/useKeyboardHeight';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

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
  const { floatingBottomOffset } = useTabChrome();
  const keyboardHeight = useKeyboardHeight();
  const [{ currency }, { formatPrecise }] = useCurrencyContext();
  const {
    blockchain,
    token,
    setToken,
    tokens,
    tokensLoading,
    showUnverifiedTokens,
    liveBalance,
    nativeBalance,
    recipient,
    amount,
    setAmount,
  } = useSendFlow();

  const [pickerOpen, setPickerOpen] = useState(false);

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
    if (!tokenPrice || numAmount === 0) return `${formatPrecise(0)} ${currency.toUpperCase()}`;
    return `${formatPrecise(numAmount * tokenPrice)} ${currency.toUpperCase()}`;
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
    ? (getShortAddress(recipient.resolvedAddress || recipient.address) ??
      recipient.resolvedAddress ??
      recipient.address)
    : '';

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

        {/* The balance, and the door to the token picker: the row states what
            can be spent and tapping it says "not this asset". */}
        <Card
          testID="send-selected-token"
          padding="md"
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={t('wallet.select_token', 'Select Token')}
        >
          <KeyValueRow
            label={t('send.screens.available')}
            value={`${formatTokenAmount(tokenBalance)} ${token?.symbol ?? ''}`}
          />
        </Card>

        {/* The amount. Tabular, so a repoll never reflows the digits. */}
        <Card padding="xl" style={styles.amountCard}>
          <View style={styles.amountRow}>
            <TextInput
              testID="send-amount-input"
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={semantic.text.tertiary}
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
          size="sm"
          variant="outline"
          style={styles.shortcuts}
        />

        {/* Who this pays, restated where the amount is decided. */}
        <Card padding="md" gap={spacing.sm} testID="send-amount-recipient">
          <KeyValueRow label={t('transactions.to')} value={recipient?.name ?? recipientShort} />
          <KeyValueRow label={t('send.screens.address')} value={recipientShort} />
        </Card>
      </ScrollView>

      <View style={[styles.action, { paddingBottom: actionBottomPadding }]}>
        <PrimaryButton
          testID="send-review-button"
          onPress={() => router.push('/send/review')}
          disabled={!isValid}
        >
          {t('token.send.reviewAndSend')}
        </PrimaryButton>
      </View>

      {/* The picker: one thing to choose, and the next tap dismisses it —
          which is what a sheet is for (DESIGN.md §Sheets, the state rule). */}
      <BottomSheetContainer
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        testID="send-token-picker"
      >
        <TokenSelectList
          tokens={tokens}
          loading={tokensLoading}
          showUnverifiedTokens={showUnverifiedTokens}
          onSelectToken={(next) => {
            setToken(next);
            setAmount('');
            setPickerOpen(false);
          }}
        />
      </BottomSheetContainer>
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
  amountCard: {
    alignItems: 'center',
    gap: vs(spacing.xs),
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: s(spacing.sm),
  },
  // The frames draw 46; the type scale's largest step is the balance's 38, and
  // a screen does not mint a size of its own (DESIGN.md §Typography).
  amountInput: {
    ...TABULAR,
    minWidth: s(80),
    fontSize: s(fontSize.balance),
    lineHeight: s(fontSize.balance) * lineHeight.snug,
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    textAlign: 'right',
    paddingVertical: 0,
  },
  ticker: {
    fontSize: s(fontSize.body),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.secondary,
  },
  fiat: {
    ...TABULAR,
    fontSize: s(fontSize.mono),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
  },
  shortcuts: {
    flexGrow: 0,
  },
  action: {
    paddingHorizontal: s(spacing.screenGutter),
    paddingTop: vs(spacing.md),
  },
});
