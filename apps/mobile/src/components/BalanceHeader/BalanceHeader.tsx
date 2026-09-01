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
  getLabelValue,
  getNetworkLabel,
  hiddenValue,
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
import React, { useCallback, useEffect } from 'react';
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
import { timing } from '../../utils/motion';
import { FLOAT_DELAY_MS, floatEntering, sinkExiting } from '../../utils/sinkAndFloat';
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
const DOT_HIT_SLOP = {
  left: DOT_GAP,
  right: DOT_GAP,
  top: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
  bottom: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
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
  showNetworkLabel = false,
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

  // Swipes are invisible to assistive tech, so the balance exposes
  // increment/decrement the way the carousel's logo group did.
  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const { actionName } = event.nativeEvent;
      if (actionName === 'increment' && activeIndex < blockchains.length - 1) {
        updateIndex(activeIndex + 1);
      } else if (actionName === 'decrement' && activeIndex > 0) {
        updateIndex(activeIndex - 1);
      }
    },
    [activeIndex, blockchains.length, updateIndex]
  );

  // The swipe is the same gesture and the same commit distance the carousel
  // used, but the block no longer travels with the finger. Sliding the whole
  // thing off-screen took the label, the dots, the History pill and the two
  // money circles with it — a frame's worth of furniture moving to report a
  // number change (owner, first device run). The frame holds still; only the
  // values inside it swap, on the verb.
  // Horizontal only. Unconstrained, the block now sits inside the NFTs
  // SectionList header and claimed vertical drags too, so a scroll started on
  // the balance went nowhere.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onEnd((event) => {
      const goNext = event.translationX < -SWIPE_THRESHOLD && activeIndex < blockchains.length - 1;
      const goPrevious = event.translationX > SWIPE_THRESHOLD && activeIndex > 0;
      if (!goNext && !goPrevious) return;
      runOnJS(updateIndex)(activeIndex + (goNext ? 1 : -1));
    });

  const current = blockchains[activeIndex];
  const currentBlockchainId = current?.network.blockchain ?? 'solana';
  const { usdTotal, changePercent, changeAmount, loading = false } = current ?? {};
  // Recalculation is reported by every value that can change and by none that
  // cannot (DESIGN.md rule 7). A change the backend has not returned yet is
  // unknown, not zero: defaulting it to 0 rendered "+$0.00 · 0% 24h", a
  // flat day the wallet never measured. Unknown renders as an em-dash.
  const hasChange = changePercent !== undefined && changeAmount !== undefined;
  const changeColor = hasChange ? change[getLabelValue(changePercent)] : text.secondary;

  const networkLabel = showNetworkLabel
    ? (getNetworkLabel(currentBlockchainId) ?? t('general.network_mainnet', 'Mainnet'))
    : null;

  // The hint points where the next swipe actually goes, arrow included: the
  // next chain is to the RIGHT, the previous one to the LEFT. It used to wrap
  // around and read "→ SOL" on the last chain, pointing the wrong way at a
  // swipe that does not exist. With one chain there is no cue row at all.
  const nextChain = blockchains[activeIndex + 1];
  const previousChain = blockchains[activeIndex - 1];
  const hintChain = nextChain ?? previousChain;
  const hintSymbol = hintChain ? NETWORK_DISPLAY[hintChain.network.id]?.symbol : undefined;
  const hintArrow = nextChain ? '→' : '←';

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

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.column}>
          <View style={styles.labelRow}>
            <Text style={styles.label} maxFontSizeMultiplier={fontScaleCap.chrome}>
              {t('home.total_balance', 'Total balance')}
            </Text>
            {networkLabel && <Text style={styles.networkLabel}>{networkLabel}</Text>}
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
          <Animated.View
            key={`amount-${currentBlockchainId}`}
            testID="balance-amount"
            {...swapMotion}
          >
            <PendingValue pending={loading}>
              <Text
                style={styles.balance}
                numberOfLines={1}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={current?.network.name}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={handleAccessibilityAction}
              >
                {hiddenBalance ? hiddenValue : formatValue(usdTotal)}
              </Text>
            </PendingValue>
          </Animated.View>

          <View style={styles.changeRow}>
            <Animated.View
              key={`change-${currentBlockchainId}`}
              testID="balance-change"
              style={styles.changeText}
              {...swapMotion}
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

          {blockchains.length > 1 && (
            <View style={styles.cueRow}>
              {blockchains.map((chain, index) => (
                <ChainDot
                  key={chain.network.id}
                  index={index}
                  isActive={index === activeIndex}
                  isReduceMotionEnabled={isReduceMotionEnabled}
                  accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                    name: chain.network.name,
                  })}
                  onPress={() => index !== activeIndex && updateIndex(index)}
                />
              ))}
              {hintSymbol && (
                <Animated.View
                  key={`hint-${currentBlockchainId}`}
                  testID="balance-next-hint"
                  {...swapMotion}
                >
                  <Text style={styles.nextHint}>{`${hintArrow} ${hintSymbol}`}</Text>
                </Animated.View>
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
    networkLabel: {
      fontSize: ms(fontSize.label),
      fontFamily: fontFamilyNative.semiBold,
      color: t.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: letterSpacing.label,
    },
    balance: {
      // `balance` is 38 now, the size the `.pen` draws: the number sits beside
      // the Send/Receive circles rather than alone on a card, so it no longer
      // needs `adjustsFontSizeToFit` to survive a long total.
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
