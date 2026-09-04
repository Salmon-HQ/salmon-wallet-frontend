/**
 * BalanceHeader — the balance block of the redesigned Home (CORE 01).
 *
 * It replaces `BalanceCardCarousel` + `ActionButtonRow`: there is no card, no
 * gradient pane, no caustics and no edge light. The number sits directly on
 * the water column, and the two controls that move money sit beside it.
 *
 * What is kept from the carousel, deliberately, is the *carousel*: the whole
 * block still pages horizontally between chains, still reports
 * `onBlockchainChange(blockchain, index)`, still accepts a controlled
 * `activeIndex`. The host screen keeps the state it already has. The chain
 * pager itself is `ChainSelector` — a chevron trigger, not dots — which sits
 * where "Total balance" used to; the eye moved beside the amount instead.
 *
 * Sizes come from tokens, not from the design reference. Where the `.pen`
 * frame asks for a step the scale does not have (13, 11), the nearest token
 * step is used — the scale is the contract, the frame is the sketch.
 */
import {
  componentSizes,
  fontFamilyNative,
  fontSize,
  formatLargeNumber,
  getLabelValue,
  hiddenValue,
  isMainnetNetworkId,
  letterSpacing,
  motionMs,
  ms,
  NETWORK_DISPLAY,
  s,
  showPercentage,
  spacing,
  tabularNums,
  useCurrencyContext,
  vs,
  type Semantic,
} from '@salmon/shared';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityActionEvent, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ArrowDownLeftIcon, ArrowUpRightIcon, ClockIcon, EyeIcon, EyeSlashIcon } from '../../icons';
import { curve, timing } from '../../utils/motion';
import {
  DRAG_FOLLOW,
  LATERAL_SWAP_TRAVEL,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  floatEntering,
} from '../../utils/sinkAndFloat';
import { ChainSelector } from './ChainSelector';
import { IconBubble } from '../IconBubble';
import { PendingValue } from '../PendingValue';
import { useSemantic, useThemedStyles } from '../../theme/useThemedStyles';
import type { BalanceHeaderProps } from './types';

// `tabularNums.native` types its array as readonly; RN's TextStyle wants a
// mutable one, so the token is copied rather than spread in place.
const TABULAR = { fontVariant: [...tabularNums.native.fontVariant] };

/** A value the backend has not returned yet — never a fabricated 0. */
const EM_DASH = '—';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** Same commit distance the card carousel uses. */
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

/** How far a long total may shrink before it is allowed to clip. */
const BALANCE_MIN_FONT_SCALE = 0.6;

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({
  blockchains,
  hiddenBalance = false,
  onToggleVisibility,
  onBlockchainChange,
  activeIndex: controlledIndex,
  onSendPress,
  onReceivePress,
  onActivityPress,
  sendDisabled = false,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(stylesFor);
  const { text, change } = useSemantic();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const [internalIndex, setInternalIndex] = React.useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  const isReduceMotionEnabled = useReducedMotion();

  // The amount answers the finger; nothing else in the block does.
  // `dragX` is the amount's horizontal position — under the finger during a
  // drag, and the axis its exit and the next chain's arrival both ride.
  // `sinkProgress` is how far along the gesture is, 0 at rest and 1 at the
  // commit distance: the amount loses its light on it and the 24h change
  // plays the sink *in place* on it, so one gesture drives both.
  const dragX = useSharedValue(0);
  const sinkProgress = useSharedValue(0);

  // Leaving accelerates (`sink`); arriving and springing back come to rest
  // (`settle`). Both on `drift`, the beat the dots already travel on.
  const leaveTiming = timing(motionMs.drift, isReduceMotionEnabled, curve.sink);
  const arriveTiming = timing(motionMs.drift, isReduceMotionEnabled, curve.settle);

  const updateIndex = useCallback(
    (newIndex: number) => {
      // Controlled: the parent owns the index and writing the local copy only
      // creates a second source of truth that can disagree with it.
      if (controlledIndex == null) setInternalIndex(newIndex);
      const blockchain = blockchains[newIndex];
      if (blockchain) {
        onBlockchainChange?.(blockchain.network.blockchain, newIndex);
      }
    },
    [blockchains, onBlockchainChange, controlledIndex]
  );

  /**
   * Send the amount off the edge it is heading for, and change the chain when
   * it gets there. One verb for every chain change that is not a finger — a
   * dot, an assistive increment — so a tap and a swipe arrive the same way.
   *
   * `'worklet'` because the pan's `onEnd` calls it on the UI thread; a press
   * calls the same function on the JS thread, where writing a shared value is
   * equally legal.
   */
  const leaveFor = (newIndex: number) => {
    'worklet';
    const direction = newIndex > activeIndex ? -1 : 1;
    // Never walk the value back: a long drag is already further out than the
    // exit distance, and the exit only has to finish what the finger started.
    const target = direction * Math.max(Math.abs(dragX.value), LATERAL_SWAP_TRAVEL);
    sinkProgress.value = withTiming(1, leaveTiming);
    dragX.value = withTiming(target, leaveTiming, (finished) => {
      if (finished) runOnJS(updateIndex)(newIndex);
    });
  };

  // The arrival is the horizontal mirror of the exit: the new amount starts at
  // the opposite edge with no light and comes back to rest gaining it, and the
  // change un-sinks and floats. Run from an effect rather than from the
  // callback above so the new value is already committed when it starts —
  // otherwise the old number would be the one sliding in.
  const enteredIndex = useRef(activeIndex);
  useEffect(() => {
    if (enteredIndex.current === activeIndex) return;
    const fromRight = activeIndex > enteredIndex.current;
    enteredIndex.current = activeIndex;
    sinkProgress.value = 0;
    dragX.value = fromRight ? LATERAL_SWAP_TRAVEL : -LATERAL_SWAP_TRAVEL;
    dragX.value = withTiming(0, arriveTiming);
  }, [activeIndex, arriveTiming, dragX, sinkProgress]);

  // Swipes are invisible to assistive tech, so the balance exposes
  // increment/decrement the way the carousel's logo group did — and it leaves
  // on the same slide a finger would have given it. Not memoised: it closes
  // over `leaveFor`, which is rebuilt every render by design, and the Text it
  // hangs on is not a memoised child.
  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === 'increment' && activeIndex < blockchains.length - 1) {
      leaveFor(activeIndex + 1);
    } else if (actionName === 'decrement' && activeIndex > 0) {
      leaveFor(activeIndex - 1);
    }
  };

  // The swipe is the same gesture and the same commit distance the carousel
  // used. What travels with the finger is the amount and only the amount:
  // sliding the whole block off-screen took the label, the dots, the History
  // pill and the two money circles with it — a frame's worth of furniture
  // moving to report a number change (owner, first device run) — and holding
  // everything still made the gesture answerless. The frame holds; the number
  // answers the finger, with resistance and losing its light as it goes.
  // Horizontal only. Unconstrained, the block now sits inside the NFTs
  // SectionList header and claimed vertical drags too, so a scroll started on
  // the balance went nowhere.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Reduce motion: the gesture still commits, it just does not travel.
      if (isReduceMotionEnabled) return;
      // A drag toward a chain that is not there moves nothing — the same rule
      // the hint follows, in the same direction.
      const reachable =
        event.translationX < 0 ? activeIndex < blockchains.length - 1 : activeIndex > 0;
      dragX.value = reachable ? event.translationX * DRAG_FOLLOW : 0;
      sinkProgress.value = reachable
        ? Math.min(1, Math.abs(event.translationX) / SWIPE_THRESHOLD)
        : 0;
    })
    .onEnd((event) => {
      const goNext = event.translationX < -SWIPE_THRESHOLD && activeIndex < blockchains.length - 1;
      const goPrevious = event.translationX > SWIPE_THRESHOLD && activeIndex > 0;
      if (!goNext && !goPrevious) {
        // Short of the threshold nothing changed, so nothing swaps: the amount
        // springs back to rest and the change un-sinks on the same beat.
        dragX.value = withTiming(0, arriveTiming);
        sinkProgress.value = withTiming(0, arriveTiming);
        return;
      }
      leaveFor(activeIndex + (goNext ? 1 : -1));
    });

  // The amount's light falls with distance the way the sink's does — slow,
  // then fast — rather than linearly with the drag.
  const amountStyle = useAnimatedStyle(() => ({
    opacity: 1 - sinkProgress.value * sinkProgress.value,
    transform: [{ translateX: dragX.value }],
  }));

  // The 24h change never moves sideways — it has neighbours on both sides and
  // would collide with them. It plays the sink *in place* instead, the same
  // drop, recession and loss of light `sinkExiting` draws, driven by the drag
  // rather than by a clock.
  const changeSinkStyle = useAnimatedStyle(() => ({
    opacity: 1 - sinkProgress.value * sinkProgress.value,
    transform: [
      { translateY: sinkProgress.value * SINK_FLOAT_TRAVEL },
      { scale: 1 - sinkProgress.value * (1 - SINK_EXIT_SCALE) },
    ],
  }));

  const current = blockchains[activeIndex];
  const currentBlockchainId = current?.network.blockchain ?? 'solana';
  const { usdTotal, nativeAmount, changePercent, changeAmount, loading = false } = current ?? {};
  const currentNetworkId = current?.network.id ?? 'solana-mainnet';

  // Off mainnet there is no price, so there is no USD total to print (the
  // balance hook strips every fiat figure there) and the block used to sit on
  // an em-dash forever. The honest total on a test network is the native
  // quantity, formatted exactly as the token rows format theirs, and a 24h
  // change is not withheld but absent: nothing priced it. Unknown is still
  // unknown — a balance that has not been read yet is not a zero.
  const isTestNetwork = !isMainnetNetworkId(currentNetworkId);
  const nativeSymbol = NETWORK_DISPLAY[currentNetworkId]?.symbol ?? '';
  const nativeTotal =
    nativeAmount === undefined ? EM_DASH : `${formatLargeNumber(nativeAmount)} ${nativeSymbol}`;
  // Recalculation is reported by every value that can change and by none that
  // cannot (DESIGN.md rule 7). A change the backend has not returned yet is
  // unknown, not zero: defaulting it to 0 rendered "+$0.00 · 0% 24h", a
  // flat day the wallet never measured. Unknown renders as an em-dash.
  const hasChange = changePercent !== undefined && changeAmount !== undefined;
  const changeColor = hasChange ? change[getLabelValue(changePercent)] : text.secondary;

  // The value swap: everything that reports the active chain is keyed on it,
  // so a switch remounts exactly those nodes and the sink/float plays in
  // place. The beat before the float is owed only once a chain has really
  // changed — on first mount nothing sank.
  const [chainSwap, setChainSwap] = React.useState({
    chain: currentBlockchainId,
    hasPrior: false,
  });
  if (chainSwap.chain !== currentBlockchainId) {
    setChainSwap({ chain: currentBlockchainId, hasPrior: true });
  }

  // The change is the one value whose sink has already been played by the
  // time it swaps — the gesture sank it in place on the way out (see
  // `changeSinkStyle`), so the keyed node owes only the float, and owes it
  // with no beat: the amount's own exit was the beat. Handing it a second
  // `exiting` here would sink the old value twice.
  const changeMotion = {
    entering: chainSwap.hasPrior ? floatEntering(isReduceMotionEnabled) : undefined,
  };

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.balanceColumn}>
          <ChainSelector
            blockchains={blockchains}
            activeIndex={activeIndex}
            onSelect={leaveFor}
            testID="balance-chain-selector"
          />

          {/* The value stays readable while it is being recalculated — the
              number breathes, it is never replaced by a placeholder. The eye
              sits beside it rather than above it: a large total gives up its
              own width first (the shrink-to-fit below), never the toggle's. */}
          <View style={styles.amountRow}>
            <Animated.View style={[styles.amountFlex, amountStyle]} testID="balance-amount">
              <PendingValue pending={loading}>
                <Text
                  style={styles.balance}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={BALANCE_MIN_FONT_SCALE}
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel={current?.network.name}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={handleAccessibilityAction}
                >
                  {hiddenBalance ? hiddenValue : isTestNetwork ? nativeTotal : formatValue(usdTotal)}
                </Text>
              </PendingValue>
            </Animated.View>
            <IconBubble
              testID="balance-eye-toggle"
              size={componentSizes.iconSizeMedium}
              tone="ghost"
              icon={hiddenBalance ? EyeSlashIcon : EyeIcon}
              iconSize={componentSizes.changeArrowIcon}
              onPress={onToggleVisibility}
              accessibilityLabel={
                hiddenBalance
                  ? t('accessibility.show_balance', 'Show balance')
                  : t('accessibility.hide_balance', 'Hide balance')
              }
            />
          </View>

          {/* Off mainnet nothing priced the balance, so there is no 24h
              change to report — the line is absent rather than an em-dash,
              which would promise a figure that is merely late. */}
          {!isTestNetwork && (
            <Animated.View testID="balance-change-sink" style={[styles.changeText, changeSinkStyle]}>
              <Animated.View
                key={`change-${currentBlockchainId}`}
                testID="balance-change"
                {...changeMotion}
              >
                <PendingValue pending={loading}>
                  <Text
                    style={[styles.change, { color: hiddenBalance ? text.secondary : changeColor }]}
                  >
                    {hiddenBalance
                      ? `${hiddenValue} · ${hiddenValue}`
                      : hasChange
                        ? `${formatChange(changeAmount)} · ${showPercentage(changePercent)} ${t('home.change_period_24h', '24h')}`
                        : EM_DASH}
                  </Text>
                </PendingValue>
              </Animated.View>
            </Animated.View>
          )}
        </View>

        {/* The three controls are the same object as the wallet thumb and the
            FAB: one `IconBubble`, differing only in tone, sized like
            `portfolio-order-button` (36, DESIGN.md's secondary-control step)
            rather than a primary action's 42. Send is the block's single
            salmon fill (and carries the flesh with it); Receive and Activity
            are its outline twins. */}
        <View style={styles.actions}>
          <IconBubble
            testID="home-activity-button"
            size={componentSizes.iconBubbleSm}
            tone="outline"
            icon={ClockIcon}
            iconSize={componentSizes.iconSizeXSmall}
            onPress={onActivityPress}
            accessibilityLabel={t('accessibility.view_activity', 'View activity')}
          />

          <IconBubble
            testID="home-send-button"
            size={componentSizes.iconBubbleSm}
            tone="accent"
            icon={ArrowUpRightIcon}
            iconWeight="bold"
            iconSize={componentSizes.iconSizeXSmall}
            onPress={onSendPress}
            disabled={sendDisabled}
            accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
          />

          <IconBubble
            testID="home-receive-button"
            size={componentSizes.iconBubbleSm}
            tone="outline"
            icon={ArrowDownLeftIcon}
            iconSize={componentSizes.iconSizeXSmall}
            onPress={onReceivePress}
            accessibilityLabel={t('accessibility.receive_tokens', 'Receive tokens')}
          />
        </View>
      </View>
    </GestureDetector>
  );
};

const stylesFor = (t: Semantic) =>
  StyleSheet.create({
    container: {
      gap: vs(spacing.sm),
    },
    balanceColumn: {
      gap: vs(spacing.xs),
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xs),
    },
    // The eye keeps its own width; the amount gives up whatever it needs to
    // (shrink-to-fit, below) so a large total never pushes the toggle out.
    amountFlex: {
      flexShrink: 1,
      minWidth: 0,
    },
    balance: {
      // `balance` is 48 (owner, 2026-09-02: the number takes the lead). Beside
      // the Send/Receive circles a long total no longer has the width it had
      // alone on a card, so the Text fits itself down rather than wrapping.
      fontSize: ms(fontSize.balance),
      fontFamily: fontFamilyNative.bold,
      color: t.text.primary,
      letterSpacing: letterSpacing.balance,
      ...TABULAR,
    },
    // The swap wrapper may shrink; nothing else sits beside it any more.
    changeText: {
      flexShrink: 1,
    },
    // Same size as the Portfolio/NFTs subtabs (`UnderlineTabs` at `md`) —
    // one reading size for the block's two lateral-choice/status lines.
    change: {
      fontSize: ms(fontSize.bodyLg),
      fontFamily: fontFamilyNative.bold,
      letterSpacing: letterSpacing.change,
      ...TABULAR,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
  });

export default BalanceHeader;
