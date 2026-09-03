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
 * `activeIndex`, and still exposes `balance-carousel-dot-{i}`. The host screen
 * keeps the state it already has.
 *
 * Sizes come from tokens, not from the design reference. Where the `.pen`
 * frame asks for a step the scale does not have (13, 11), the nearest token
 * step is used — the scale is the contract, the frame is the sketch.
 */
import {
  borderRadius,
  componentSizes,
  fontFamilyNative,
  fontScaleCap,
  fontSize,
  formatLargeNumber,
  getLabelValue,
  getNetworkLabel,
  hiddenValue,
  isMainnetNetworkId,
  letterSpacing,
  motionMs,
  ms,
  NETWORK_DISPLAY,
  balanceCues,
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
import {
  AccessibilityActionEvent,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  FLOAT_DELAY_MS,
  LATERAL_SWAP_TRAVEL,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  floatEntering,
  sinkExiting,
} from '../../utils/sinkAndFloat';
import { Chip } from '../Chip';
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

// Dot touch geometry, unchanged from the carousel: hit boxes may meet but
// never cross, and within that cap they take everything they can get.
const DOT_SIZE = s(spacing.xs);
/** The active dot is a pill, not a dot: it travels between chains on `drift`. */
const DOT_ACTIVE_WIDTH = s(componentSizes.iconSizeXxsm);
const DOT_GAP = s(spacing.xxs + 1);
const TOUCH_TARGET_MIN = 44;
/** How far a long total may shrink before it is allowed to clip. */
const BALANCE_MIN_FONT_SCALE = 0.6;
const DOT_HIT_SLOP = {
  left: DOT_GAP,
  right: DOT_GAP,
  top: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
  bottom: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
};
/** A cue is `micro` text; the slop lifts it to the same 44 the dots get. */
const HINT_HIT_SLOP = {
  left: s(spacing.xs),
  right: s(spacing.xs),
  top: (TOUCH_TARGET_MIN - ms(fontSize.micro)) / 2,
  bottom: (TOUCH_TARGET_MIN - ms(fontSize.micro)) / 2,
};

interface ChainDotProps {
  index: number;
  isActive: boolean;
  isReduceMotionEnabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * One chain dot. Selection indicators inside one block agree (DESIGN.md
 * §The balance block's motion, rule 8): the active pill widens and the row
 * re-flows around it on the same `drift` beat the sub-tab underline travels
 * on, so neither indicator out-speaks the other. `timing()` is built on the
 * JS thread and handed to the worklet — never called inside one.
 */
const ChainDot: React.FC<ChainDotProps> = ({
  index,
  isActive,
  isReduceMotionEnabled,
  accessibilityLabel,
  onPress,
}) => {
  const styles = useThemedStyles(stylesFor);
  const width = useSharedValue(isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE);

  useEffect(() => {
    width.value = withTiming(
      isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE,
      timing(motionMs.drift, isReduceMotionEnabled)
    );
  }, [isActive, isReduceMotionEnabled, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Pressable
      testID={`balance-carousel-dot-${index}`}
      onPress={onPress}
      hitSlop={DOT_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={[styles.dot, isActive && styles.dotActive, animatedStyle]} />
    </Pressable>
  );
};

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
  const { text, change, chain } = useSemantic();
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

  // The environment chip. It is the active network that decides, not a
  // setting: a devnet session says "Devnet" whether or not Developer Networks
  // is on, and mainnet says nothing (DESIGN.md §Chain identity — a non-mainnet
  // environment always keeps a text chip). `getNetworkLabel` returns null on
  // every mainnet, which is the whole rule.
  const networkLabel = getNetworkLabel(currentNetworkId);

  // The cues sit to the right of the dots, both of them (owner, 2026-09-02):
  // "← SOL" for the page behind, "BTC →" for the page ahead, each arrow
  // pointing the way the page lies and each in its destination chain's hue.
  // With two chains only one shows; with four (developer mode) both. A cue is
  // a press target that goes where the dot goes. One derivation for both
  // platforms: `balanceCues` in shared.
  const cues = balanceCues(blockchains, activeIndex);
  const previousHint = cues.previous && {
    ...cues.previous,
    ink: chain.hintInk[cues.previous.blockchain],
  };
  const nextHint = cues.next && { ...cues.next, ink: chain.hintInk[cues.next.blockchain] };

  // The value swap: everything that reports the active chain is keyed on it,
  // so a switch remounts exactly those nodes and the sink/float plays in
  // place. Rendered as three small wrappers rather than one, because the
  // History pill, the dots and the two money circles sit between them and
  // must not move. The beat before the float is owed only once a chain has
  // really changed — on first mount nothing sank.
  const [chainSwap, setChainSwap] = React.useState({
    chain: currentBlockchainId,
    hasPrior: false,
  });
  if (chainSwap.chain !== currentBlockchainId) {
    setChainSwap({ chain: currentBlockchainId, hasPrior: true });
  }
  // No entering animation on the block's FIRST mount — not even an undelayed
  // one. Home moves this block between the pinned wrapper and the NFT grid's
  // list header, so switching sub-tabs unmounts and remounts it, and the value
  // wrappers replayed the float: an in-page tab change looked exactly like a
  // chain switch. The float belongs to a real chain change, which is the only
  // thing that sets `hasPrior`.
  // The swap is symmetric or it does not run (DESIGN.md rule 3): `exiting` is
  // gated on the same `hasPrior` as `entering`, so a remount that is not a
  // chain change — Home moving this block between the pinned wrapper and the
  // NFT grid's list header — cuts instead of playing half the verb.
  const swapMotion = {
    entering: chainSwap.hasPrior
      ? floatEntering(isReduceMotionEnabled, { delayMs: FLOAT_DELAY_MS })
      : undefined,
    exiting: chainSwap.hasPrior ? sinkExiting(isReduceMotionEnabled) : undefined,
  };

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
        <View style={styles.column}>
          <View style={styles.labelRow}>
            <Text style={styles.label} maxFontSizeMultiplier={fontScaleCap.chrome}>
              {t('home.total_balance', 'Total balance')}
            </Text>
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

          {/* The value stays readable while it is being recalculated — the
              number breathes, it is never replaced by a placeholder. */}
          <Animated.View testID="balance-amount" style={amountStyle}>
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

          <View style={styles.changeRow}>
            {/* Off mainnet nothing priced the balance, so there is no 24h
                change to report — the line is absent rather than an em-dash,
                which would promise a figure that is merely late. */}
            {!isTestNetwork && (
              <Animated.View
                testID="balance-change-sink"
                style={[styles.changeText, changeSinkStyle]}
              >
                <Animated.View
                  key={`change-${currentBlockchainId}`}
                  testID="balance-change"
                  {...changeMotion}
                >
                  <PendingValue pending={loading}>
                    <Text
                      style={[
                        styles.change,
                        { color: hiddenBalance ? text.secondary : changeColor },
                      ]}
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
            <Chip
              testID="home-activity-button"
              size="sm"
              variant="outline"
              label={t('actions.activity', 'Activity')}
              leadingIcon={
                <ClockIcon size={ms(componentSizes.iconSizeXxs)} color={text.secondary} />
              }
              onPress={onActivityPress}
              accessibilityLabel={t('accessibility.view_activity', 'View activity')}
            />
          </View>

          {/* The cue row also carries the environment chip, so it paints for a
              single-chain wallet standing off mainnet — the chip is the
              warning a test-network session gets (spec 026 D5/D6). */}
          {(blockchains.length > 1 || !!networkLabel) && (
            <View style={styles.cueRow}>
              {blockchains.length > 1 && (
                <View style={styles.dotRow}>
                  {blockchains.map((chainBalance, index) => (
                    <ChainDot
                      key={chainBalance.network.id}
                      index={index}
                      isActive={index === activeIndex}
                      isReduceMotionEnabled={isReduceMotionEnabled}
                      accessibilityLabel={t(
                        'accessibility.select_blockchain',
                        'Switch to {{name}}',
                        { name: chainBalance.network.name }
                      )}
                      onPress={() => index !== activeIndex && leaveFor(index)}
                    />
                  ))}
                </View>
              )}
              {previousHint && (
                <Animated.View
                  key={`prev-hint-${currentBlockchainId}`}
                  testID="balance-prev-hint"
                  {...swapMotion}
                >
                  <Pressable
                    onPress={() => leaveFor(previousHint.index)}
                    hitSlop={HINT_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                      name: blockchains[previousHint.index]?.network.name,
                    })}
                  >
                    <Text style={[styles.nextHint, { color: previousHint.ink }]}>
                      {`← ${previousHint.symbol}`}
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
              {nextHint && (
                <Animated.View
                  key={`hint-${currentBlockchainId}`}
                  testID="balance-next-hint"
                  {...swapMotion}
                >
                  <Pressable
                    onPress={() => leaveFor(nextHint.index)}
                    hitSlop={HINT_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                      name: blockchains[nextHint.index]?.network.name,
                    })}
                  >
                    <Text style={[styles.nextHint, { color: nextHint.ink }]}>
                      {`${nextHint.symbol} →`}
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
              {networkLabel && (
                <Chip
                  testID="balance-network-chip"
                  size="sm"
                  variant="outline"
                  label={networkLabel}
                />
              )}
            </View>
          )}
        </View>

        {/* The two money controls are the same object as the wallet thumb and
            the FAB: one `IconBubble`, differing only in tone. Send is the
            block's single salmon fill (and carries the flesh with it); Receive
            is its outline twin. */}
        <View style={styles.actions}>
          <IconBubble
            testID="home-send-button"
            size={componentSizes.buttonHeightCompact}
            tone="accent"
            icon={ArrowUpRightIcon}
            iconWeight="bold"
            iconSize={componentSizes.iconSizeSmall}
            onPress={onSendPress}
            disabled={sendDisabled}
            accessibilityLabel={t('accessibility.send_tokens', 'Send tokens')}
          />

          <IconBubble
            testID="home-receive-button"
            size={componentSizes.buttonHeightCompact}
            tone="outline"
            icon={ArrowDownLeftIcon}
            iconSize={componentSizes.iconSizeSmall}
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
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: s(spacing.md),
    },
    column: {
      flex: 1,
      gap: vs(spacing.xs),
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.xs),
    },
    label: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.medium,
      color: t.text.secondary,
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
    changeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.base),
    },
    // The swap wrapper may shrink; the pill beside it keeps its own width.
    changeText: {
      flexShrink: 1,
    },
    change: {
      fontSize: ms(fontSize.caption),
      fontFamily: fontFamilyNative.bold,
      letterSpacing: letterSpacing.change,
      ...TABULAR,
    },
    cueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.md),
    },
    // The dots keep the step they always had; the row around them spends the
    // wider one, so the hints flank the group instead of joining it.
    dotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: ms(borderRadius.full),
      backgroundColor: t.text.disabled,
    },
    // Width is animated (see `ChainDot`); only the ink is static here.
    dotActive: {
      backgroundColor: t.accent.fill,
    },
    nextHint: {
      fontSize: ms(fontSize.micro),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.secondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s(spacing.sm),
    },
  });

export default BalanceHeader;
