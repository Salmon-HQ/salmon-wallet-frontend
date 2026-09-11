/**
 * ExchangeReceipt — the graphic receipt: token-mark hero, arrow, rate/fee
 * block, the settling wait. Rendered through `ReceiptScreen tone="exchange"`.
 */
import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { ExchangeReceiptScreenProps } from './types';
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  ms,
  s,
  SINK_FLOAT_STAGGER_MS,
  spacing,
  tabularNums,
  useWaitExit,
  useWaitGate,
  vs,
  type Semantic,
} from '@salmon/shared';

import { ArrowDownIcon } from '../../icons';
import { floatEntering } from '../../utils/sinkAndFloat';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../Card';
import { KeyValueRow } from '../KeyValueRow';
import { PrimaryButton, SecondaryButton } from '../Button';
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

/** The arrow is a chrome-sized glyph, not an illustration. */
const GRAPHIC_ICON_SIZE = componentSizes.iconSizeMedium;

/**
 * A receipt reveals its own content top to bottom, one beat per element, on
 * the float half of the transition verb (DESIGN.md §The sink and the float).
 * The *screen* still arrives whole (§The receipt) — nothing travels behind it
 * and it has no entrance of its own; what is sequenced is what is already
 * inside it, in the order it is read. One stagger step each, from the verb's
 * own constant.
 */
const beat = (step: number) => step * SINK_FLOAT_STAGGER_MS;

export function ExchangeReceipt({
  title,
  summary,
  explorerUrl,
  onContinue,
  settling = false,
  pendingTitle,
  exchange,
  exchangeRate,
  exchangeFee,
}: Omit<ExchangeReceiptScreenProps, 'tone'>) {
  // Every receipt reveals itself top to bottom, one stagger step per element.
  // The two shapes are one rhythm at different lengths: an exchange reads
  // sent -> arrow -> received -> rows, a send or NFT reads status -> amount,
  // and then the actions close it. Only what renders takes a beat, so
  // nothing waits on a gap left by a band this receipt does not have.
  const actionStep = exchange ? 4 : 2;
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text } = useSemantic();
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
      {/* The cluster — status and amount — is centred in the corridor between
          the top chrome and the actions. It owns the leftover height
          (flex: 1), so the actions stay on the bottom edge and the report
          sits in the middle of the water
          rather than leaving a void under it. */}
      <View style={styles.cluster} testID="tx-success-cluster">
        {exchange ? (
          /* The hero is the graphic, and it reads down: the mark of the token
           that left with its amount on top, an arrow travelling downward from
           it, and the token that arrived below with its amount beside it. The
           lines are the accessibility elements; the arrow is decoration and is
           hidden from the reader, so the result the sentence used to carry
           rides on the received line. */
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
            </Animated.View>
            <Animated.View
              style={styles.trackRow}
              testID="tx-success-arrow"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(1) })}
            >
              <ArrowDownIcon weight="bold" size={GRAPHIC_ICON_SIZE} color={text.secondary} />
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

        {/* The fine print, last: the receipt card Send draws (`Card` +
          `KeyValueRow`), with what the flow already knows — effective rate,
          Salmon fee when it arrived, local time. */}
        {exchange ? (
          <Animated.View
            style={styles.receiptCard}
            entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(3) })}
          >
            <Card padding="lg" gap={spacing.md} testID="tx-success-receipt">
              {exchangeRate ? (
                <KeyValueRow label={t('transactions.detail.rate', 'Rate')} value={exchangeRate} />
              ) : null}
              {exchangeFee ? (
                <KeyValueRow label={t('swap.review.salmonFee', 'Salmon fee')} value={exchangeFee} />
              ) : null}
              <KeyValueRow label={t('transactions.detail.time', 'Time')} value={receiptTime} />
            </Card>
          </Animated.View>
        ) : null}
      </View>

      {/* The ending is Send's: the explorer link as the secondary button over
          the primary, the wallet's own action bottom-most. */}
      <Animated.View
        style={styles.actionGroup}
        testID="tx-success-actions"
        entering={floatEntering(isReduceMotionEnabled, { delayMs: beat(actionStep) })}
      >
        {explorerUrl ? (
          <SecondaryButton testID="tx-success-explorer-link" onPress={handleExplorerPress}>
            {t('transaction.viewOnExplorer')}
          </SecondaryButton>
        ) : null}
        <PrimaryButton onPress={onContinue} disabled={settling} testID="tx-success-continue-button">
          {t('transaction.continue', 'Back to wallet')}
        </PrimaryButton>
      </Animated.View>
    </View>
  );
}

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
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
      color: t.status.success,
      fontFamily: fontFamilyNative.bold,
      fontWeight: fontWeight.bold,
    },
    statusLabel: {
      fontSize: ms(fontSize.headline),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.primary,
      letterSpacing: letterSpacing.snug,
    },
    amountContainer: {
      alignItems: 'center',
      marginBottom: vs(spacing['2xl']),
    },
    // The exchange, read down the screen: what left on top, the arrow between,
    // what arrived below. Each amount travels with its own mark.
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
      color: t.text.primary,
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
      fontFamily: fontFamilyNative.bold,
      color: t.text.secondary,
      lineHeight: ms(fontSize.bodyLg * lineHeight.tight),
    },
    // The receipt card, stretched like Send's, under the exchange.
    receiptCard: {
      alignSelf: 'stretch',
      marginBottom: vs(spacing.xl),
    },
    // The bottom of the column, as Send's receipt draws it: secondary over
    // primary with the grid's air between, the primary on the bottom edge.
    actionGroup: {
      marginTop: 'auto',
      alignSelf: 'stretch',
      paddingTop: vs(spacing.md),
      paddingBottom: vs(spacing['2xl']),
      gap: vs(spacing.md),
    },
  });
