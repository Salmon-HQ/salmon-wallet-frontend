import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
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
import { PrimaryButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { SwapReviewExchange } from '../SwapScreen/SwapReviewExchange';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { curve } from '../../utils/motion';
import { CausticBand, SurfacingMembrane } from './SurfacingLayers';
import { BAND_HEIGHT, MEMBRANE_OPACITY_TO, surfacingTimeline } from './surfacing';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/**
 * The floor `adjustsFontSizeToFit` may shrink the amount to before it stops —
 * derived rather than typed, so it is exactly "down to body size" and cannot
 * drift away from the DOM screen's floor when either token moves.
 */
const MIN_AMOUNT_SCALE = fontSize.body / fontSize.title;

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

  // The Surfacing (DESIGN.md §The Surfacing). Reduced motion is a full
  // parallel mapping rather than a switch, and the plan for both paths is
  // `surfacingTimeline` — a pure function, so the timing is testable without a
  // frame clock.
  const isReduceMotionEnabled = useReducedMotion();
  const timeline = useMemo(() => surfacingTimeline(isReduceMotionEnabled), [isReduceMotionEnabled]);

  const statusOpacity = useSharedValue(0);
  // The amount is the hero, so it owns its own node and its own value: the
  // caustic band travels up to it and it settles behind the band, translateY
  // +6 → 0 on `settle`, digits already at tabular width so nothing reflows.
  const amountOpacity = useSharedValue(0);
  const amountTranslateY = useSharedValue(0);
  // Two waves of chrome, named for their order rather than for one element,
  // because the order is the point: the stagger has to agree with what sits
  // above what. The first wave carries everything at the primary rank — the
  // bridge details and the continue action — and the second carries the
  // explorer link below it. Naming them `link` and `button` is what let the
  // link fade in before the button it now sits under.
  const chromeOpacity = useSharedValue(0);
  const chromeTrailOpacity = useSharedValue(0);
  const membraneOpacity = useSharedValue(1);
  const bandOpacity = useSharedValue(0);
  const bandTranslateY = useSharedValue(0);

  // Where the band starts (below the bottom edge) and where it stops (centred
  // on the amount). Both come from layout rather than from a guess, because
  // the corridor's length changes with the summary's line count. The amount is
  // measured inside the centred cluster, so its screen position is the
  // cluster's own offset plus the amount's offset within it.
  const [screenHeight, setScreenHeight] = useState(0);
  const [clusterTop, setClusterTop] = useState(0);
  const [amountCenterInCluster, setAmountCenterInCluster] = useState(0);
  const amountCenterY = clusterTop + amountCenterInCluster;

  const handleScreenLayout = useCallback((event: LayoutChangeEvent) => {
    setScreenHeight(event.nativeEvent.layout.height);
  }, []);

  const handleClusterLayout = useCallback((event: LayoutChangeEvent) => {
    setClusterTop(event.nativeEvent.layout.y);
  }, []);

  const showWait = useWaitGate(settling);
  // And the wait is not merely unmounted when it ends: this branch swaps the
  // instant `settling` flips, so the closing wave used to play nowhere on the
  // one screen it matters most. `held` keeps the wait rendered — with
  // `visible={false}`, which is what starts its exit — until the last front has
  // left the screen and it reports back.
  const { held: waveHeld, onExited: onWaveGone } = useWaitExit(showWait);

  const handleAmountLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setAmountCenterInCluster(y + height / 2);
  }, []);

  useEffect(() => {
    // Keyed on the wait *screen*, not on `settling`: the gate can hold the wait
    // a moment past the settle, and The Surfacing must not play behind it.
    if (showWait) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 1. The membrane clears: the water above the transaction thins out.
    membraneOpacity.value = withTiming(MEMBRANE_OPACITY_TO, {
      duration: timeline.membrane.durationMs,
      easing: curve.current,
    });

    // 3. The amount settles. `settle` never passes its target, so a number
    //    never appears to have been wrong for a frame.
    amountTranslateY.value = timeline.amount.rise;
    amountOpacity.value = withDelay(
      timeline.amount.delayMs,
      withTiming(1, { duration: timeline.amount.durationMs, easing: curve.settle })
    );
    amountTranslateY.value = withDelay(
      timeline.amount.delayMs,
      withTiming(0, { duration: timeline.amount.durationMs, easing: curve.settle })
    );

    // Then everything else, after the moment rather than during it.
    statusOpacity.value = withTiming(1, {
      duration: timeline.chrome.durationMs,
      easing: curve.current,
    });
    chromeOpacity.value = withDelay(
      timeline.chrome.delayMs,
      withTiming(1, { duration: timeline.chrome.durationMs, easing: curve.current })
    );
    chromeTrailOpacity.value = withDelay(
      timeline.chrome.delayMs + timeline.chrome.staggerMs,
      withTiming(1, { duration: timeline.chrome.durationMs, easing: curve.current })
    );
  }, [
    showWait,
    timeline,
    statusOpacity,
    amountOpacity,
    amountTranslateY,
    chromeOpacity,
    chromeTrailOpacity,
    membraneOpacity,
  ]);

  // 2. The caustic band. Held back until the corridor has been measured — a
  //    band that travels to the wrong place is worse than one frame of nothing.
  useEffect(() => {
    if (showWait || screenHeight <= 0 || amountCenterInCluster <= 0) return;

    const restingY = amountCenterY - BAND_HEIGHT / 2;

    if (timeline.band.mode === 'static') {
      // Reduced motion: drawn once across the amount, held, then faded. It
      // does not travel, and it never repeats.
      bandTranslateY.value = restingY;
      bandOpacity.value = 1;
      bandOpacity.value = withDelay(
        timeline.band.durationMs,
        withTiming(0, { duration: timeline.band.fadeMs, easing: curve.sink })
      );
      return;
    }

    bandTranslateY.value = screenHeight;
    bandOpacity.value = 1;
    bandTranslateY.value = withTiming(restingY, {
      duration: timeline.band.durationMs,
      easing: curve.current,
    });
    bandOpacity.value = withDelay(
      timeline.band.durationMs,
      withTiming(0, { duration: timeline.band.fadeMs, easing: curve.sink })
    );
  }, [
    showWait,
    timeline,
    screenHeight,
    amountCenterInCluster,
    amountCenterY,
    bandOpacity,
    bandTranslateY,
  ]);

  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  const amountStyle = useAnimatedStyle(() => ({
    opacity: amountOpacity.value,
    transform: [{ translateY: amountTranslateY.value }],
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
  }));

  const chromeTrailStyle = useAnimatedStyle(() => ({
    opacity: chromeTrailOpacity.value,
  }));

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
      onLayout={handleScreenLayout}
      testID="tx-success-screen"
    >
      {/* The membrane this moment clears. Behind everything, and behind the
          content it is thinning out over. */}
      <SurfacingMembrane opacity={membraneOpacity} />

      {/* The cluster — status, amount, and the bridge details when there are
          any — is centred in the corridor between the top chrome and the
          actions. It owns the leftover height (flex: 1), so the actions stay
          on the bottom edge and the report sits in the middle of the water
          rather than leaving a void under it. */}
      <View style={styles.cluster} onLayout={handleClusterLayout} testID="tx-success-cluster">
      {/* Status is a line of ink, not a 96px disc: `status.success` is
          specified as ink (9.99:1), and the outcome the user came for is the
          amount below it. Three channels are kept — colour, the ✓ glyph, and
          the label — so the state never rides on hue alone. */}
      <Animated.View style={[styles.statusRow, statusStyle]}>
        <Text style={styles.statusGlyph}>✓</Text>
        <Text style={styles.statusLabel} testID="tx-success-title">
          {title}
        </Text>
      </Animated.View>

      {/* The hero. Isolated node, measured by the same onLayout whatever it
          holds, so the caustic band's stop follows the layout: for a swap or
          bridge receipt the exchange graphic (logo → arrow → logo, received
          amount one rank up) is the protagonist; otherwise the summary line. */}
      <Animated.View
        style={[styles.amountContainer, exchange ? styles.exchangeHero : null, amountStyle]}
        onLayout={handleAmountLayout}
        testID="tx-success-amount"
      >
        {exchange ? (
          <SwapReviewExchange
            send={exchange.send}
            receive={{ ...exchange.receive, emphasis: true }}
            style={styles.exchangeBlock}
          />
        ) : (
          /* One line, always. The receipt used to print the whole operation as
             one 36px title and it broke over three lines — an amount that wraps
             stops being an amount and becomes a sentence. It shrinks rather than
             wrapping or truncating: a number on a wallet receipt may not be
             elided. */
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
      </Animated.View>

      {/* The receipt under the exchange: quiet rows for what the flow already
          knows — effective rate, Salmon fee when it arrived, local time. They
          ride the chrome wave, after the moment rather than during it. */}
      {exchange ? (
        <Animated.View style={[styles.receiptRows, chromeStyle]} testID="tx-success-receipt">
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
        <Animated.View style={[styles.bridgeInfoBox, chromeStyle]}>
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

      {/* Continue first, explorer second — the same ranking the DOM receipt
          uses. The wallet's own action outranks a link that leaves it for a
          block explorer, and both the reading order and the stagger have to
          say so: the continue action rides the first chrome wave, the link the
          second. */}
      <View style={styles.actionGroup}>
        <Animated.View style={[styles.buttonContainer, chromeStyle]}>
          <PrimaryButton
            onPress={onContinue}
            style={styles.button}
            disabled={settling}
            testID="tx-success-continue-button"
          >
            {t('transaction.continue', 'Back to wallet')}
          </PrimaryButton>
        </Animated.View>

        {!isBridge && explorerUrl ? (
          <Animated.View style={[styles.linkContainer, chromeTrailStyle]}>
            <TouchableOpacity
              testID="tx-success-explorer-link"
              onPress={handleExplorerPress}
              activeOpacity={0.7}
            >
              <Text style={styles.explorerLink}>{t('transaction.viewOnExplorer')}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>

      {/* The shaft of light, last so it passes over the amount rather than
          under it. It takes no touches and it never repeats. */}
      <CausticBand opacity={bandOpacity} translateY={bandTranslateY} />
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
    // The caustic band blends in `screen`; without a stacking context here it
    // would blend against whatever is behind the whole sheet.
    isolation: 'isolate',
    // The band travels in from below the bottom edge.
    overflow: 'hidden',
  },
  // The receipt column: actions on the bottom edge, and the cluster centred in
  // whatever is left above them. Product 2026-08: the report belongs in the
  // middle of the corridor, not pinned under the top chrome with a void below.
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
  },
  // The exchange graphic takes the column's full width inside the centred
  // cluster; the summary text keeps its content-sized container.
  exchangeHero: {
    alignSelf: 'stretch',
  },
  exchangeBlock: {
    alignSelf: 'stretch',
  },
  // The quiet receipt: label left, value right, no card — secondary rank
  // under the exchange, above the bridge details when there are any.
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
  // Continue and explorer, pinned to the bottom of the column. The auto margin
  // separates the report from the actions without inventing a spacer.
  actionGroup: {
    marginTop: 'auto',
    alignItems: 'center',
    gap: vs(spacing.lg),
    paddingTop: vs(spacing.xl),
  },
  linkContainer: {
    alignItems: 'center',
  },
  explorerLink: {
    fontSize: ms(fontSize.body),
    fontFamily: fontFamilyNative.medium,
    color: semantic.text.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  // Width and height only. The gradient wrapper that used to sit around this
  // button forced the fill transparent, which cancelled the flesh — the one
  // material a filled control is supposed to show.
  button: {
    width: 'auto',
    minWidth: s(componentSizes.copyButtonWidth),
    height: vs(componentSizes.buttonHeightCompact),
  },
});
