import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import {
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  componentSizes,
  letterSpacing,
  lineHeight,
  ms,
  vs,
  s,
  fontFamilyNative,
  semantic,
  tabularNums,
  useWaitGate,
  useWaitExit,
} from '@salmon/shared';
import type { TransactionSuccessScreenProps } from '@salmon/shared';
import { PrimaryButton, TextButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { TokenLogo } from '../TokenLogo';
import { useTabChrome } from '../../../hooks/useTabChrome';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/**
 * The floor `adjustsFontSizeToFit` may shrink the amount to before it stops —
 * derived rather than typed, so it is exactly "down to body size" and cannot
 * drift away from the DOM screen's floor when either token moves.
 */
const MIN_AMOUNT_SCALE = fontSize.body / fontSize.title;

/**
 * The token marks on the hero line. Small enough to sit inside a line of text
 * as punctuation — the same idiom the token selector uses at 32 and 48, one
 * step further down because here the mark is beside a number rather than being
 * the row's own subject.
 */
const LOGO_SIZE = 20;

// ============================================================================
// Component
// ============================================================================

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = ({
  title,
  summary,
  explorerUrl,
  onContinue,
  settling = false,
  pendingTitle,
  bridgeDepositAddress,
  bridgeAmountIn,
  bridgeAmountOut,
  bridgeExchangeId,
  bridgeDepositTxId,
  exchange,
  exchangeRate,
  exchangeFee,
}) => {
  const isBridge = !!bridgeDepositAddress;
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();

  // The receipt's clock: local time, captured once when the receipt mounts —
  // the moment the transaction came back — so re-renders never move it.
  const [receiptTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const showWait = useWaitGate(settling);
  // And the wait is not merely unmounted when it ends: this branch swaps the
  // instant `settling` flips, so the closing wave used to play nowhere on the
  // one screen it matters most. `held` keeps the wait rendered — with
  // `visible={false}`, which is what starts its exit — until the last front has
  // left the screen and it reports back.
  const { held: waveHeld, onExited: onWaveGone } = useWaitExit(showWait);

  useEffect(() => {
    // Keyed on the wait *screen*, not on `settling`: the gate can hold the wait
    // a moment past the settle, and the receipt's confirmation must not fire
    // behind it. The haptic is the whole of the arrival now — the receipt
    // itself is simply there, complete, the frame it mounts.
    if (showWait) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [showWait]);

  const handleExplorerPress = () => {
    if (explorerUrl) {
      Linking.openURL(explorerUrl);
    }
  };

  // The wait is gated, not merely rendered: below `motionMs.waitDelay` it never
  // mounts and the user goes from the decision straight to the receipt; once
  // mounted it holds for `motionMs.waitMinVisible` so a wait that resolves just
  // over the threshold does not flash. The gate delays a *screen*, never work.
  if (waveHeld) {
    return (
      <View style={styles.container}>
        <LoadingScreen
          visible={showWait}
          waves
          title={pendingTitle ?? title}
          subtitle={summary}
          bottomOffset={floatingBottomOffset}
          onExited={onWaveGone}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, styles.receipt, { paddingBottom: floatingBottomOffset }]}
      testID="tx-success-screen"
    >
      {/* The cluster — status, amount, and the bridge details when there are
          any — is centred in the corridor between the top chrome and the
          actions. It owns the leftover height (flex: 1), so the actions stay
          on the bottom edge and the report sits in the middle of the water
          rather than leaving a void under it. */}
      <View style={styles.cluster} testID="tx-success-cluster">
      {/* Status is a line of ink, not a 96px disc: `status.success` is
          specified as ink (9.99:1), and the outcome the user came for is the
          amount below it. Three channels are kept — colour, the ✓ glyph, and
          the label — so the state never rides on hue alone. */}
      <View style={styles.statusRow}>
        <Text style={styles.statusGlyph}>✓</Text>
        <Text style={styles.statusLabel} testID="tx-success-title">
          {title}
        </Text>
      </View>

      {/* The hero. The summary line is the protagonist on every ending — the
          swap receipt used to box its exchange here as a card, and the ending
          reads as an ending, not a second review. */}
      <View style={styles.amountContainer} testID="tx-success-amount">
        {/* One line, always. The receipt used to print the whole operation as
            one 36px title and it broke over three lines — an amount that wraps
            stops being an amount and becomes a sentence. It shrinks rather than
            wrapping or truncating: a number on a wallet receipt may not be
            elided.

            On a swap the line carries the two tokens' own marks. The exchange
            already reaches this screen with both logos on it, so the icons
            cost no fetch and no new prop: each one leads its amount, which is
            what makes the line read as *this token to that token* rather than
            as two strings with an arrow between them. `summary` is the same
            text either way — the two halves are its two halves — so a send
            receipt, and any swap whose logos never arrived, prints exactly
            the line it printed before. */}
        {exchange ? (
          <View style={styles.exchangeLine} testID="tx-success-summary">
            <TokenLogo
              uri={exchange.send.logo}
              symbol={exchange.send.symbol}
              size={LOGO_SIZE}
            />
            <Text
              style={[styles.amount, styles.amountSpent]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={MIN_AMOUNT_SCALE}
            >
              {exchange.send.amount}
            </Text>
            <Text style={styles.amountArrow}>→</Text>
            <TokenLogo
              uri={exchange.receive.logo}
              symbol={exchange.receive.symbol}
              size={LOGO_SIZE}
            />
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={MIN_AMOUNT_SCALE}
            >
              {exchange.receive.amount}
            </Text>
          </View>
        ) : (
          <Text
            style={styles.amount}
            testID="tx-success-summary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={MIN_AMOUNT_SCALE}
          >
            {summary}
          </Text>
        )}
      </View>

      {/* The receipt under the amount: quiet rows for what the flow already
          knows — effective rate, Salmon fee when it arrived, local time. */}
      {exchange ? (
        <View style={styles.receiptRows} testID="tx-success-receipt">
          {exchangeRate ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('transactions.detail.rate', 'Rate')}</Text>
              <Text style={[styles.receiptValue, TABULAR]}>{exchangeRate}</Text>
            </View>
          ) : null}
          {exchangeFee ? (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t('swap.review.salmonFee', 'Salmon fee')}</Text>
              <Text style={[styles.receiptValue, TABULAR]}>{exchangeFee}</Text>
            </View>
          ) : null}
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{t('transactions.detail.time', 'Time')}</Text>
            <Text style={[styles.receiptValue, TABULAR]}>{receiptTime}</Text>
          </View>
        </View>
      ) : null}

      {isBridge ? (
        <View style={styles.bridgeInfoBox}>
          <Text style={styles.bridgeLabel}>{t('bridge.depositAddress', 'Send funds to')}</Text>
          <Text style={styles.bridgeValue}>{bridgeDepositAddress}</Text>
          {bridgeAmountIn && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.amountToSend', 'Amount to send')}</Text>
              <Text style={styles.bridgeValue}>{bridgeAmountIn}</Text>
            </>
          )}
          {bridgeAmountOut && (
            <>
              <Text style={styles.bridgeLabel}>
                {t('bridge.estimatedReceive', 'You will receive approximately')}
              </Text>
              <Text style={styles.bridgeValue}>{bridgeAmountOut}</Text>
            </>
          )}
          {bridgeDepositTxId && (
            <>
              <Text style={styles.bridgeLabel}>
                {t('bridge.depositTxId', 'Deposit Transaction')}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://solscan.io/tx/${bridgeDepositTxId}`)}
              >
                <Text
                  style={[
                    styles.bridgeValue,
                    { color: semantic.text.accent, textDecorationLine: 'underline' },
                  ]}
                >
                  {bridgeDepositTxId.slice(0, 8)}...{bridgeDepositTxId.slice(-8)}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {bridgeExchangeId && (
            <>
              <Text style={styles.bridgeLabel}>{t('bridge.exchangeId', 'Exchange ID')}</Text>
              <Text style={[styles.bridgeValue, { marginBottom: 0 }]}>{bridgeExchangeId}</Text>
            </>
          )}
        </View>
      ) : null}
      </View>

      {/* The ending composes like the onboarding ending: a quiet text-button
          band (the explorer link) over the primary action, which is the
          bottom-most control. The wallet's own action still outranks the link
          that leaves for a block explorer, and what says so is the position —
          and the assist band keeps its reserved height even when there is no
          link, so the primary never moves. */}
      <View style={styles.actionGroup}>
        <View style={styles.assistBand}>
          {!isBridge && explorerUrl ? (
            <TextButton
              onPress={handleExplorerPress}
              color={semantic.text.secondary}
              testID="tx-success-explorer-link"
            >
              {t('transaction.viewOnExplorer')}
            </TextButton>
          ) : null}
        </View>

        <View style={styles.buttonContainer}>
          <PrimaryButton
            onPress={onContinue}
            disabled={settling}
            testID="tx-success-continue-button"
          >
            {t('transaction.continue', 'Back to wallet')}
          </PrimaryButton>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(spacing.headerPadding),
  },
  // The receipt column: actions on the bottom edge, and the cluster centred in
  // whatever is left above them. The report belongs in the middle of the
  // corridor, not pinned under the top chrome with a void below.
  // The wait keeps `container`'s own centring: a loader with nothing under it
  // is centred the same way.
  receipt: {
    justifyContent: 'flex-start',
    paddingTop: vs(spacing['5xl']),
  },
  // The centred report. Stretched so the amount can use the full width, and
  // flex: 1 so it owns the corridor between the top padding and the actions.
  cluster: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    marginBottom: vs(spacing.md),
  },
  // The headline. This screen's job is to report *what happened*, so the
  // sentence that says it outranks the figures it happened to — a 10px
  // uppercase status over a 36px amount had the ranking backwards. The state
  // keeps all three channels: the glyph's colour, the glyph, and the label.
  statusGlyph: {
    fontSize: ms(fontSize.headline),
    color: semantic.status.success,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
  },
  statusLabel: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.primary,
    letterSpacing: letterSpacing.snug,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  // The hero as a line of tokens: mark, amount, arrow, mark, amount. It stays
  // one row — each amount shrinks inside its own share of the width rather
  // than wrapping.
  exchangeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
  },
  // The arrow is not the subject: one rank down and in secondary ink, so the
  // two amounts stay the loudest things on the line.
  amountArrow: {
    fontSize: ms(fontSize.headline),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.secondary,
  },
  // Secondary rank: one step down from the headline in size and one in weight.
  // It keeps `text.primary` — a number on a receipt may be smaller than the
  // sentence above it, but never dimmer than it is legible.
  amount: {
    ...TABULAR,
    fontSize: ms(fontSize.title),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: ms(fontSize.title * lineHeight.tight),
    // On the exchange line the two amounts share the row with two marks and
    // an arrow; shrinking is how the line stays a line without eliding a
    // digit. It costs nothing on the single-string variant, where the text is
    // the column's only child.
    flexShrink: 1,
  },
  // What was spent steps down one rank so what arrived reads louder: the
  // receipt's subject is the amount that landed, and the exchange line lost
  // that emphasis when the hero left its card.
  amountSpent: {
    fontSize: ms(fontSize.bodyLg),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.secondary,
    lineHeight: ms(fontSize.bodyLg * lineHeight.tight),
  },
  // The quiet receipt: label left, value right, no card — secondary rank
  // under the amount, above the bridge details when there are any.
  receiptRows: {
    alignSelf: 'stretch',
    gap: vs(spacing.sm),
    marginBottom: vs(spacing.xl),
    paddingHorizontal: s(spacing.base),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: s(spacing.md),
  },
  receiptLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.tertiary,
  },
  receiptValue: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.secondary,
    textAlign: 'right',
    flexShrink: 1,
  },
  bridgeInfoBox: {
    width: '100%',
    backgroundColor: semantic.surface.raised,
    borderRadius: borderRadius.card,
    padding: s(spacing.lg),
    marginBottom: vs(spacing.xl),
  },
  bridgeLabel: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.regular,
    color: semantic.text.tertiary,
    marginBottom: vs(spacing.xs),
  },
  bridgeValue: {
    ...TABULAR,
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.primary,
    marginBottom: vs(spacing.md),
  },
  // The bottom of the column, on the onboarding ending's bands: the assist
  // band (a quiet text button) directly over the action band's primary, with
  // the grid's `spacing.lg` of air between them. The auto margin separates
  // the report from the actions without inventing a spacer.
  actionGroup: {
    marginTop: 'auto',
    alignSelf: 'stretch',
    gap: vs(spacing.lg),
    paddingTop: vs(spacing.xl),
  },
  // Reserved at the assist band's control height whether or not a link is
  // rendered, so the primary sits at one Y across every ending.
  assistBand: {
    height: vs(componentSizes.buttonHeightSmall),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    alignSelf: 'stretch',
  },
});
