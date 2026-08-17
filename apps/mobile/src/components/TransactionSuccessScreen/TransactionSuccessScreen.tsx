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
} from '@salmon/shared';
import type { TransactionSuccessScreenProps } from '@salmon/shared';
import { PrimaryButton } from '../Button';
import { LoadingScreen } from '../LoadingScreen';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { curve } from '../../utils/motion';
import { CausticBand, SurfacingMembrane } from './SurfacingLayers';
import { BAND_HEIGHT, MEMBRANE_OPACITY_TO, surfacingTimeline } from './surfacing';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/** The floor `adjustsFontSizeToFit` may shrink the amount to before it stops. */
const MIN_AMOUNT_SCALE = 0.6;

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
}) => {
  const isBridge = !!bridgeDepositAddress;
  const { t } = useTranslation();
  const { floatingBottomOffset } = useTabChrome();

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
  const linkOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const membraneOpacity = useSharedValue(1);
  const bandOpacity = useSharedValue(0);
  const bandTranslateY = useSharedValue(0);

  // Where the band starts (below the bottom edge) and where it stops (centred
  // on the amount). Both come from layout rather than from a guess, because
  // the corridor's length changes with the summary's line count.
  const [screenHeight, setScreenHeight] = useState(0);
  const [amountCenterY, setAmountCenterY] = useState(0);

  const handleScreenLayout = useCallback((event: LayoutChangeEvent) => {
    setScreenHeight(event.nativeEvent.layout.height);
  }, []);

  const showWait = useWaitGate(settling);

  const handleAmountLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setAmountCenterY(y + height / 2);
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
    linkOpacity.value = withDelay(
      timeline.chrome.delayMs,
      withTiming(1, { duration: timeline.chrome.durationMs, easing: curve.current })
    );
    buttonOpacity.value = withDelay(
      timeline.chrome.delayMs + timeline.chrome.staggerMs,
      withTiming(1, { duration: timeline.chrome.durationMs, easing: curve.current })
    );
  }, [
    showWait,
    timeline,
    statusOpacity,
    amountOpacity,
    amountTranslateY,
    linkOpacity,
    buttonOpacity,
    membraneOpacity,
  ]);

  // 2. The caustic band. Held back until the corridor has been measured — a
  //    band that travels to the wrong place is worse than one frame of nothing.
  useEffect(() => {
    if (showWait || screenHeight <= 0 || amountCenterY <= 0) return;

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
  }, [showWait, timeline, screenHeight, amountCenterY, bandOpacity, bandTranslateY]);

  const statusStyle = useAnimatedStyle(() => ({
    opacity: statusOpacity.value,
  }));

  const amountStyle = useAnimatedStyle(() => ({
    opacity: amountOpacity.value,
    transform: [{ translateY: amountTranslateY.value }],
  }));

  const linkStyle = useAnimatedStyle(() => ({
    opacity: linkOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
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
  if (showWait) {
    return (
      <View style={styles.container}>
        <LoadingScreen
          visible
          waves
          title={pendingTitle ?? title}
          subtitle={summary}
          bottomOffset={floatingBottomOffset}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { paddingBottom: floatingBottomOffset }]}
      onLayout={handleScreenLayout}
      testID="tx-success-screen"
    >
      {/* The membrane this moment clears. Behind everything, and behind the
          content it is thinning out over. */}
      <SurfacingMembrane opacity={membraneOpacity} />

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

      {/* The hero. Isolated node, tabular digits, nothing between it and the
          bottom of the screen for a caustic band to travel through. */}
      <Animated.View
        style={[styles.amountContainer, amountStyle]}
        onLayout={handleAmountLayout}
        testID="tx-success-amount"
      >
        {/* One line, always. The receipt used to print the whole operation as
            one 36px title and it broke over three lines — an amount that wraps
            stops being an amount and becomes a sentence. It shrinks rather than
            wrapping or truncating: a number on a wallet receipt may not be
            elided. */}
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

      {isBridge ? (
        <Animated.View style={[styles.bridgeInfoBox, linkStyle]}>
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
      ) : explorerUrl ? (
        <Animated.View style={[styles.linkContainer, linkStyle]}>
          <TouchableOpacity
            testID="tx-success-explorer-link"
            onPress={handleExplorerPress}
            activeOpacity={0.7}
          >
            <Text style={styles.explorerLink}>{t('transaction.viewOnExplorer')}</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.buttonContainer, buttonStyle]}>
        <PrimaryButton
          onPress={onContinue}
          style={styles.button}
          disabled={settling}
          testID="tx-success-continue-button"
        >
          {t('transaction.continue', 'Back to wallet')}
        </PrimaryButton>
      </Animated.View>

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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.sm),
    marginBottom: vs(spacing.md),
  },
  statusGlyph: {
    fontSize: ms(fontSize.body),
    color: semantic.status.success,
    fontFamily: fontFamilyNative.bold,
    fontWeight: fontWeight.bold,
  },
  statusLabel: {
    fontSize: ms(fontSize.micro),
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.status.success,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['2xl']),
  },
  amount: {
    ...TABULAR,
    fontSize: ms(fontSize.display),
    fontFamily: fontFamilyNative.bold,
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: ms(fontSize.display * lineHeight.condensed),
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
  linkContainer: {
    alignItems: 'center',
    marginBottom: vs(spacing['4xl']),
  },
  explorerLink: {
    fontSize: ms(fontSize.base),
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
