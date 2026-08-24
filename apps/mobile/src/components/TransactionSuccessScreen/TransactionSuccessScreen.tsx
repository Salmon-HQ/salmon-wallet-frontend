import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
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
  resolveOnboardingBands,
  resolveOnboardingGrid,
  semantic,
  tabularNums,
  useWaitGate,
  useWaitExit,
  SINK_FLOAT_STAGGER_MS,
} from '@salmon/shared';
import type { TransactionSuccessScreenProps } from '@salmon/shared';
import { ArrowDownIcon, CheckIcon } from '../../icons';
import { floatEntering } from '../../utils/sinkAndFloat';
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
 * The token marks are the graphic's subject now, not punctuation beside a line
 * of text, so they are drawn at the icon ramp's largest illustrative step.
 */
const LOGO_SIZE = componentSizes.iconSize3XL;

/** The tick and the arrow are chrome-sized glyphs, not illustrations. */
const GRAPHIC_ICON_SIZE = componentSizes.iconSizeMedium;

/**
 * The ending's reserved heights, read from the onboarding grid rather than
 * restated here (DESIGN.md §The ending borrows the onboarding ending's bands).
 * The receipt offers no secondary action, so the band whose union is zero
 * collapses and the assist sits directly over the primary —
 * `resolveOnboardingBands`, the same rule both onboarding layouts read.
 */
const endingBands = resolveOnboardingBands(resolveOnboardingGrid('identity'), false);

/**
 * A receipt reveals its own content top to bottom, one beat per element, on
 * the float half of the transition verb (DESIGN.md §The sink and the float).
 * The *screen* still arrives whole (§The receipt) — nothing travels behind it
 * and it has no entrance of its own; what is sequenced is what is already
 * inside it, in the order it is read. One stagger step each, from the verb's
 * own constant.
 */
const beat = (step: number) => step * SINK_FLOAT_STAGGER_MS;

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

  // Every receipt reveals itself top to bottom, one stagger step per element.
  // The two shapes are one rhythm at different lengths: an exchange reads
  // sent -> arrow -> received -> rows, a send or NFT reads status -> amount,
  // and on both, the bridge instructions when there are any and then the
  // actions close it. Only what renders takes a beat, so nothing waits on a
  // gap left by a band this receipt does not have.
  const bridgeStep = exchange ? 4 : 2;
  const actionStep = isBridge ? bridgeStep + 1 : bridgeStep;
  const { t } = useTranslation();
  const { floatingBottomOffset, insets } = useTabChrome();
  const isReduceMotionEnabled = useReducedMotion();

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
      // The bottom edge is the safe area's, and the air over it belongs to the
      // action band. It used to reserve the whole floating tab bar — chrome
      // that has already sunk away on every host this receipt appears in — so
      // the primary sat a tab bar's height above the edge the grid puts it on.
      style={[styles.container, styles.receipt, { paddingBottom: insets.bottom }]}
      testID="tx-success-screen"
    >
      {/* The cluster — status, amount, and the bridge details when there are
          any — is centred in the corridor between the top chrome and the
          actions. It owns the leftover height (flex: 1), so the actions stay
          on the bottom edge and the report sits in the middle of the water
          rather than leaving a void under it. */}
      <View style={styles.cluster} testID="tx-success-cluster">
        {exchange ? (
          /* The hero is the graphic, and it reads down: the mark of the token
           that left with its amount on top, an arrow travelling downward from
           it, and the token that arrived below — its amount beside it and the
           tick attached to it, the same glyph the copy control draws when
           something has landed. The tick belongs to what was received, not to
           the block. The lines are the accessibility elements; the arrow and
           the tick are decoration and are hidden from the reader, so the
           result the sentence used to carry rides on the received line. */
          <View style={styles.exchangeBlock} testID="tx-success-hero">
            <Animated.View
              style={styles.tokenLine}
              testID="tx-success-sent"
              accessible
              entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(0) })}
            >
              <TokenLogo uri={exchange.send.logo} symbol={exchange.send.symbol} size={LOGO_SIZE} />
              <Text
                style={[styles.amount, styles.amountSpent, styles.amountCell]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={MIN_AMOUNT_SCALE}
              >
                {exchange.send.amount}
              </Text>
              <View style={styles.tickSlot} />
            </Animated.View>
            <Animated.View
              style={styles.trackRow}
              testID="tx-success-arrow"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(1) })}
            >
              <ArrowDownIcon
                weight="bold"
                size={GRAPHIC_ICON_SIZE}
                color={semantic.text.secondary}
              />
            </Animated.View>
            <Animated.View
              style={styles.tokenLine}
              testID="tx-success-received"
              accessible
              accessibilityLabel={`${exchange.receive.amount}, ${title}`}
              entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(2) })}
            >
              <TokenLogo
                uri={exchange.receive.logo}
                symbol={exchange.receive.symbol}
                size={LOGO_SIZE}
              />
              <Text
                style={[styles.amount, styles.amountCell]}
                testID="tx-success-summary"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={MIN_AMOUNT_SCALE}
              >
                {exchange.receive.amount}
              </Text>
              <View style={styles.tickSlot} testID="tx-success-tick">
                <CheckIcon weight="bold" size={GRAPHIC_ICON_SIZE} color={semantic.status.success} />
              </View>
            </Animated.View>
          </View>
        ) : (
          /* Status is a line of ink, not a 96px disc: `status.success` is
           specified as ink (9.99:1), and the outcome the user came for is the
           amount below it. Three channels are kept — colour, the ✓ glyph, and
           the label — so the state never rides on hue alone. A single-token
           receipt has nothing to draw an exchange between, so it keeps the
           sentence that says what happened. */
          <Animated.View
            style={styles.statusRow}
            testID="tx-success-status"
            entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(0) })}
          >
            <Text style={styles.statusGlyph}>✓</Text>
            <Text style={styles.statusLabel} testID="tx-success-title">
              {title}
            </Text>
          </Animated.View>
        )}

        {/* How much. One line, always: the receipt used to print the whole
          operation as one 36px title and it broke over three lines — an amount
          that wraps stops being an amount and becomes a sentence. It shrinks
          rather than wrapping or truncating: a number on a wallet receipt may
          not be elided. On an exchange each amount travels with the mark it
          belongs to, up in the block above; a single-token receipt prints the
          summary it always printed. */}
        {exchange ? null : (
          <Animated.View
            style={styles.amountContainer}
            testID="tx-success-amount"
            entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(1) })}
          >
            <Text
              style={styles.amount}
              testID="tx-success-summary"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={MIN_AMOUNT_SCALE}
            >
              {summary}
            </Text>
          </Animated.View>
        )}

        {/* The fine print, last: quiet rows for what the flow already knows —
          effective rate, Salmon fee when it arrived, local time. */}
        {exchange ? (
          <Animated.View
            style={styles.receiptRows}
            testID="tx-success-receipt"
            entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(3) })}
          >
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
          </Animated.View>
        ) : null}

        {isBridge ? (
          <Animated.View
            style={styles.bridgeInfoBox}
            entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(bridgeStep) })}
          >
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
          </Animated.View>
        ) : null}
      </View>

      {/* The ending composes like the onboarding ending: a quiet text-button
          band (the explorer link) over the primary action, which is the
          bottom-most control. The wallet's own action still outranks the link
          that leaves for a block explorer, and what says so is the position —
          and the assist band keeps its reserved height even when there is no
          link, so the primary never moves. */}
      <Animated.View
        style={styles.actionGroup}
        testID="tx-success-actions"
        entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(actionStep) })}
      >
        <View style={styles.assistBand} testID="tx-success-assist">
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

        <View style={styles.actionBand} testID="tx-success-action">
          <PrimaryButton
            onPress={onContinue}
            disabled={settling}
            testID="tx-success-continue-button"
          >
            {t('transaction.continue', 'Back to wallet')}
          </PrimaryButton>
        </View>
      </Animated.View>
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
  // The exchange, read down the screen: what left on top, the arrow between,
  // what arrived below with its tick. Each amount travels with its own mark.
  exchangeBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: vs(spacing.xs),
    marginBottom: vs(spacing.lg),
  },
  tokenLine: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.sm),
  },
  trackRow: {
    alignItems: 'center',
  },
  // The tick's place, reserved on both lines so the two amounts sit on one
  // vertical axis — the same reservation the assist band makes below, for the
  // same reason. Only the received line puts a glyph in it.
  tickSlot: {
    width: s(GRAPHIC_ICON_SIZE),
    alignItems: 'center',
  },
  amountCell: {
    flex: 1,
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
  },
  // Reserved at the grid's assist height whether or not a link is rendered,
  // so the primary sits at one Y across every ending.
  assistBand: {
    height: vs(endingBands.assist),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The action band, exactly as the onboarding layout draws it: the grid's air
  // over the primary and the grid's air under it, with the button on the
  // bottom edge of the column. Nothing is reserved below it, which is what
  // pins its Y.
  actionBand: {
    alignSelf: 'stretch',
    height: vs(endingBands.action),
    paddingTop: vs(spacing.lg),
    paddingBottom: vs(spacing['2xl']),
  },
});
