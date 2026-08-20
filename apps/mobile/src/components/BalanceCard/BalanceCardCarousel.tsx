import {
  borderRadius,
  colors,
  componentSizes,
  fontFamilyNative,
  fontSize,
  getLabelValue,
  gradients,
  hiddenValue,
  letterSpacing,
  motionMs,
  ms,
  s,
  shadows,
  showPercentage,
  spacing,
  useCurrencyContext,
  vs,
  getNetworkLabel,
  fontWeight,
  opacity,
  semantic,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityActionEvent,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { curve, timing } from '../../utils/motion';
import { useTabChrome } from '../../../hooks/useTabChrome';
import { DEBUG_LAYER_COLORS, DEBUG_LAYER_COLOR } from '../../debug/layerColors';
import { EdgeLight } from './EdgeLight';
import type { BalanceCardCarouselProps, BlockchainId } from './types';

// Import the SVG icons from Icon component
import { CaretDownIcon, CaretUpIcon, EyeIcon, EyeSlashIcon } from '../../icons';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
/** The mark inside its box. Under 1 by construction: the mark can never reach
 *  the edge, so no glyph can be clipped by the container that centres it. */
const BLOCKCHAIN_MARK_RATIO = 0.74;

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// ============================================================================
// The neighbour light
// ============================================================================

/**
 * The edge light — what says there is another chain beside this one, and which.
 *
 * The carousel's only affordance was the dot row, which says *how many* and
 * *which one*, but never *where*. A card with nothing at its edges reads as the
 * whole surface rather than as one of several. This lights the side a
 * neighbour is on, in that neighbour's own colour, so the edge answers both
 * questions at once: something is over there, and here is what it is.
 *
 * **It rests lit** (owner, on device). DESIGN.md §Overview says light is an
 * event and never a state, and this is a state — the amendment is owed if this
 * is adopted, and it is not written yet because the reading is still being
 * judged. What the rule was protecting is intact either way: this is not light
 * as *hierarchy*. It does not say "this is important". It says "the surface
 * continues in this direction", which is a fact about the layout, not an
 * emphasis, and no amount of staring at it makes the balance look more urgent.
 *
 * It still goes dark for the one moment it has to. On a swipe the light is
 * extinguished by the travel itself — opacity falls out of the drag distance —
 * because the light does not *travel* between sides: the neighbour on the
 * right becomes the neighbour on the left the instant a swipe lands, and both
 * the side and the colour change in the same frame. The fade is what hides that
 * swap, and it is derived rather than sequenced, so a swipe abandoned halfway
 * simply lights back up on its own.
 *
 * **Colour is the chain's own** (owner, reversing the cold-light reading).
 * DESIGN.md §Chain identity says identity is carried by an opaque mark or a
 * labelled chip and never by tinting a surface; the argument for the exception
 * is that this tints nothing the user is reading — it is not the current
 * chain's identity, it is a pointer at an adjacent one, and the card you land
 * on still carries the mark and the label that actually identify it. Two things
 * to watch on device, both real:
 *
 * 1. Bitcoin's orange sits between `salmon-500` and `warning-500`. On a dark
 *    ground at low alpha those three converge, and this app spends orange on
 *    the primary action and on caution. If the edge reads as either, the
 *    exception is not worth it.
 * 2. With developer networks on, two neighbours can be the same chain
 *    (mainnet beside devnet), and the hue cannot tell them apart. It does not
 *    lie — there *is* a Solana over there — and the distinction is carried
 *    where it always was: the pane itself is `SHALLOW_PANE` on a test network
 *    and `DEEP_PANE` on mainnet, plus the network label on the card.
 */
const CHAIN_LIGHT: Record<BlockchainId, readonly string[]> = {
  // The brand's own gradient, purple through blue to green.
  solana: ['#9945FF', '#00D1FF', '#14F195'],
  'solana-devnet': ['#9945FF', '#00D1FF', '#14F195'],
  // One hue, and the easy case.
  bitcoin: ['#F7931A'],
  'bitcoin-testnet': ['#F7931A'],
  ethereum: ['#627EEA'],
  'ethereum-sepolia': ['#627EEA'],
};

/**
 * How far the strip reaches inward, as a fraction of the card's width.
 *
 * This is not how far the light *shows* — the falloff decides that, and on an
 * inverse-square curve most of the alpha is spent in the first fifth of the
 * strip. What this buys is somewhere for the tail to die: at 0.3 the curve was
 * still carrying visible alpha when it hit the strip's end, and a light that
 * stops because it ran out of room has a boundary. Widening moves the end of
 * the strip out past the end of the light.
 *
 * Band 0.30-0.46. The ceiling is not taste: the balance figure is centred and
 * wide, and past ~0.46 the two strips meet under it, which is the one place a
 * wash is not allowed to go. A test fails if they ever do.
 */
const EDGE_LIGHT_REACH = 0.46;

/**
 * How much drag it takes to put the light out, in px. Shorter than
 * `SWIPE_THRESHOLD` so the light is already gone by the time the swipe
 * commits — the switch itself must happen in the dark.
 */
const EDGE_LIGHT_EXTINGUISH_PX = SWIPE_THRESHOLD * 0.6;

// Pagination dot touch geometry. The dots' visible size, colour and spacing
// are fixed by design, so the hit area is the only thing allowed to grow —
// and it grows under two rules, in that order:
//
//  1. Adjacent hit boxes must not overlap. A tap landing in the gap between
//     two dots has to belong to exactly one of them, so the horizontal reach
//     is capped at half the gap on each side; the boxes meet, never cross.
//  2. Within that cap, each box is as large as it can be.
//
// Rule 1 pins the box width to the dot pitch (DOT_SIZE + 2 * DOT_GAP), which
// is far below the 44pt floor. Widening it further is not a hit-slop problem:
// it needs the dots themselves spaced further apart, which is a visual change
// this component is not allowed to make. Height has no neighbour, so it takes
// the full floor.
const DOT_SIZE = s(spacing.xs);
const DOT_GAP = s(spacing.xxs + 1);
const TOUCH_TARGET_MIN = 44;
const DOT_HIT_SLOP = {
  left: DOT_GAP,
  right: DOT_GAP,
  top: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
  bottom: (TOUCH_TARGET_MIN - DOT_SIZE) / 2,
};

// Gradient colors for each blockchain
const BLOCKCHAIN_GRADIENTS: Record<BlockchainId, readonly [string, string, string]> = {
  solana: gradients.balanceCardSolana.colors,
  'solana-devnet': gradients.balanceCardSolanaDevnet.colors,
  bitcoin: gradients.balanceCardBitcoin.colors,
  'bitcoin-testnet': gradients.balanceCardBitcoinTestnet.colors,
  ethereum: gradients.balanceCardEthereum.colors,
  'ethereum-sepolia': gradients.balanceCardEthereumSepolia.colors,
};

/**
 * BalanceCardCarousel - Fixed container carousel with sliding content
 *
 * Features:
 * - Card container stays FIXED (doesn't move)
 * - Gradient color transitions between blockchains
 * - Only the CONTENT (logo, balance, change%) slides left/right
 * - Uses PanGestureHandler + Reanimated for smooth animations
 *
 * @example
 * ```tsx
 * <BalanceCardCarousel
 *   blockchains={[
 *     { network: { id: 'solana', name: 'Solana', blockchain: 'solana' }, usdTotal: 1000 },
 *     { network: { id: 'bitcoin', name: 'Bitcoin', blockchain: 'bitcoin' }, usdTotal: 500 },
 *   ]}
 *   hiddenBalance={false}
 *   onBlockchainChange={(blockchain, index) => console.log(blockchain)}
 * />
 * ```
 */
export const BalanceCardCarousel: React.FC<BalanceCardCarouselProps> = ({
  blockchains,
  hiddenBalance = false,
  onToggleVisibility,
  onBlockchainChange,
  activeIndex: controlledIndex,
  showNetworkLabel = false,
  style,
  testID,
}) => {
  const { t } = useTranslation();
  const [, { formatValue, formatChange }] = useCurrencyContext();
  const { heroCardTopInset, topInset } = useTabChrome();
  const [internalIndex, setInternalIndex] = React.useState(0);
  const activeIndex = controlledIndex ?? internalIndex;

  // Calculate offsets for header overlap effect.
  // On Android the card starts at y=0 (behind status bar) so contentPaddingTop
  // must include topInset to ensure logo/balance land below the collapsed gate.
  // On iOS the card starts at y=topInset so no extra offset needed.
  const cardMarginTop = heroCardTopInset;
  const contentPaddingTop =
    (Platform.OS === 'ios' ? 0 : topInset) + componentSizes.headerInnerHeight + spacing.md;

  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  // 0 dark, 1 lit. Separate from the drag on purpose — see `lightIgnite`.
  const ignite = useSharedValue(0);

  // Swapping the card is a tab change: the incoming card arrives on `drift`,
  // the outgoing one leaves on `ebb`. Exit is shorter than enter on purpose —
  // the card being replaced has already been read.
  const isReduceMotionEnabled = useReducedMotion();
  const cardIn = timing(motionMs.drift, isReduceMotionEnabled);
  const cardOut = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);
  // The light comes up on `tide`, the water's long clock, and it is the one
  // thing here allowed to be that slow. The card lands first and the water
  // behind it lights afterwards, which is what puts the source *behind* the
  // pane rather than on it: near things arrive, far things take their time.
  // `settle` rather than `current` — this is a value coming to rest, not an
  // element entering, and the monotonic tail is what keeps the bloom from
  // arriving in a rush and then creeping.
  const lightIgnite = timing(motionMs.tide, isReduceMotionEnabled, curve.settle);

  const updateIndex = useCallback(
    (newIndex: number) => {
      setInternalIndex(newIndex);
      // The neighbour changed, so the light is a different colour on a
      // different side: it is re-lit rather than revealed. Restarting from
      // zero is what stops it appearing fully formed the instant the card
      // lands. Every path in — swipe, dot, assistive action — comes through
      // here, so none of them can skip it.
      ignite.value = 0;
      ignite.value = withTiming(1, lightIgnite);
      const blockchain = blockchains[newIndex];
      onBlockchainChange?.(blockchain.network.blockchain, newIndex);
    },
    [blockchains, onBlockchainChange, ignite, lightIgnite]
  );

  // Screen-reader chain switching: swipe gestures are invisible to assistive
  // tech, so the chain identity element exposes increment/decrement actions.
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

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (isAnimating.value) return;
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (isAnimating.value) return;
      const shouldSwipeLeft =
        event.translationX < -SWIPE_THRESHOLD && activeIndex < blockchains.length - 1;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD && activeIndex > 0;

      if (shouldSwipeLeft) {
        // Swipe left → animate current content OFF to the left
        isAnimating.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH, cardOut, (finished) => {
          if (finished) {
            // Update index (loads new content)
            runOnJS(updateIndex)(activeIndex + 1);
            // Position new content OFF to the right
            translateX.value = SCREEN_WIDTH;
            // Animate new content IN from the right
            translateX.value = withTiming(0, cardIn, (timingFinished) => {
              if (timingFinished) {
                isAnimating.value = false;
              }
            });
          }
        });
      } else if (shouldSwipeRight) {
        // Swipe right → animate current content OFF to the right
        isAnimating.value = true;
        translateX.value = withTiming(SCREEN_WIDTH, cardOut, (finished) => {
          if (finished) {
            // Update index (loads new content)
            runOnJS(updateIndex)(activeIndex - 1);
            // Position new content OFF to the left
            translateX.value = -SCREEN_WIDTH;
            // Animate new content IN from the left
            translateX.value = withTiming(0, cardIn, (timingFinished) => {
              if (timingFinished) {
                isAnimating.value = false;
              }
            });
          }
        });
      } else {
        // Not enough swipe distance → smooth return to center (no bounce)
        isAnimating.value = true;
        translateX.value = withTiming(0, cardIn, (finished) => {
          if (finished) {
            isAnimating.value = false;
          }
        });
      }
    });

  // Animated style for content sliding
  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Lit at rest, put out by the travel itself. No timer and no sequence: the
  // opacity is a function of how far the card has been dragged, so an
  // abandoned swipe lights back up on the way home for free, and the commit —
  // which jumps `translateX` a full screen width before floating it back —
  // spends its whole swap at zero. That is the frame where the light changes
  // both side and colour, and it is the frame nobody sees.
  // Two gates, and the dimmer wins. The drag is immediate — it has to be, it
  // is hiding the frame where the light swaps side and colour. The ignition is
  // slow. On a swipe both run: the drag gate is already climbing back while
  // the ignition is still near zero, so what the eye follows is the slow one.
  // On an abandoned swipe the ignition is untouched at 1 and the drag gate
  // alone brings the light home at the card's own speed.
  const edgeLightStyle = useAnimatedStyle(() => {
    const drag = 1 - Math.min(Math.abs(translateX.value) / EDGE_LIGHT_EXTINGUISH_PX, 1);
    return { opacity: Math.min(drag, ignite.value) };
  });

  // The first light of the session comes up the same way a switch does, so the
  // home screen is never painted with it already there.
  useEffect(() => {
    ignite.value = withTiming(1, lightIgnite);
    // Mount only. Re-firing this on a prop change would make an ambient state
    // flash every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Which sides have a neighbour. With two chains this is one side or the
  // other; the light never claims a direction the swipe cannot go.
  // The light is the *neighbour's* colour, not this card's — it points at what
  // is over there. `chainLight` falls back to Solana's for an id the palette
  // does not know, which is the same default the gradients already take.
  const chainLight = (index: number) => {
    const id = blockchains[index]?.network.blockchain as BlockchainId | undefined;
    return (id && CHAIN_LIGHT[id]) || CHAIN_LIGHT.solana;
  };
  const hasLeftNeighbour = activeIndex > 0;
  const hasRightNeighbour = activeIndex < blockchains.length - 1;
  const leftNeighbourLight = chainLight(activeIndex - 1);
  const rightNeighbourLight = chainLight(activeIndex + 1);

  // Get current blockchain data
  const currentBlockchain = blockchains[activeIndex];
  const currentBlockchainId = currentBlockchain?.network.blockchain || 'solana';
  const currentGradient = BLOCKCHAIN_GRADIENTS[currentBlockchainId];
  // Format values
  const { usdTotal, changePercent = 0, changeAmount = 0 } = currentBlockchain || {};
  const labelType = getLabelValue(changePercent);
  const changeColor = colors.change[labelType];

  // Render blockchain logo (handles all network variants)
  const renderLogo = (blockchain: BlockchainId) => {
    // Derived from the box, never from its own token. `blockchainIcon` is 45
    // against a `logoContainer` of 35, so the mark was eight points wider than
    // the thing holding it and Bitcoin's glyph — which fills its viewBox more
    // than the Solana mark does — came out clipped. Sizing from the container
    // makes overflow impossible whatever either token is retuned to, and the
    // ratio is what the owner asked to bring down.
    const iconSize = s(componentSizes.logoContainer) * BLOCKCHAIN_MARK_RATIO;
    // Map network variants to their base blockchain for icon selection
    if (blockchain.startsWith('solana')) {
      return <SolanaSvgIcon size={iconSize} color={colors.text.primary} />;
    }
    if (blockchain.startsWith('bitcoin')) {
      return <BitcoinSvgIcon size={iconSize} color={colors.text.primary} />;
    }
    if (blockchain.startsWith('ethereum')) {
      return <EthereumSvgIcon size={iconSize} color={colors.text.primary} />;
    }
    return <SolanaSvgIcon size={iconSize} color={colors.text.primary} />;
  };

  // Get network label — in developer mode, always show (including "Mainnet")
  const networkLabel = showNetworkLabel
    ? (getNetworkLabel(currentBlockchainId) ?? t('general.network_mainnet', 'Mainnet'))
    : null;

  // Render balance with decimal opacity
  const renderBalance = () => {
    if (hiddenBalance) {
      return <Text style={styles.balance}>{hiddenValue}</Text>;
    }
    const formatted = formatValue(usdTotal);
    const dotIndex = formatted.lastIndexOf('.');
    if (dotIndex === -1) {
      return <Text style={styles.balance}>{formatted}</Text>;
    }
    const integerPart = formatted.substring(0, dotIndex);
    const decimalPart = formatted.substring(dotIndex);
    return (
      <View style={styles.balanceRow}>
        <Text style={styles.balance}>{integerPart}</Text>
        <Text style={[styles.balance, styles.balanceDecimals]}>{decimalPart}</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        { marginTop: cardMarginTop },
        style,
        DEBUG_LAYER_COLORS && { backgroundColor: DEBUG_LAYER_COLOR.balanceCardOuter },
      ]}
      testID={testID}
    >
      <LinearGradient
        colors={
          DEBUG_LAYER_COLORS
            ? [DEBUG_LAYER_COLOR.balanceCardGradient, DEBUG_LAYER_COLOR.balanceCardGradient]
            : [...currentGradient]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1.3 }}
        style={[styles.gradient, { paddingTop: contentPaddingTop }]}
      >
        {/* Mounted outside the sliding content on purpose: the content is what
            travels, so a light glued to it would leave the screen with the
            card it belongs to. The light belongs to the frame. */}
        {hasLeftNeighbour && (
          <Animated.View
            testID="balance-carousel-edge-light-left"
            pointerEvents="none"
            style={[styles.edgeLight, styles.edgeLightLeft, edgeLightStyle]}
          >
            <EdgeLight side="left" colors={leftNeighbourLight} />
          </Animated.View>
        )}
        {hasRightNeighbour && (
          <Animated.View
            testID="balance-carousel-edge-light-right"
            pointerEvents="none"
            style={[styles.edgeLight, styles.edgeLightRight, edgeLightStyle]}
          >
            <EdgeLight side="right" colors={rightNeighbourLight} />
          </Animated.View>
        )}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.content, animatedContentStyle]}>
            {/* Group 1: Logo + Network tag. No motif here — it belongs to
                the water behind this card, not to the card, which is content
                and carries the balance figure. Asserted in
                BalanceCard.scales.test.tsx. */}
            <View
              style={styles.logoGroup}
              testID="balance-carousel-logo-group"
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={currentBlockchain?.network.name}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={handleAccessibilityAction}
            >
              <View style={styles.logoContainer}>
                {renderLogo(currentBlockchain?.network.blockchain || 'solana')}
              </View>
              {networkLabel && (
                <View style={styles.networkLabelContainer}>
                  <Text style={styles.networkLabelText}>{networkLabel}</Text>
                </View>
              )}
            </View>

            {/* Group 2: Balance + Change */}
            <View style={styles.contentGroup}>
              <View style={styles.balanceContainer}>
                {renderBalance()}
                <TouchableOpacity
                  onPress={onToggleVisibility}
                  style={styles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hiddenBalance
                      ? t('accessibility.show_balance', 'Show balance')
                      : t('accessibility.hide_balance', 'Hide balance')
                  }
                >
                  {hiddenBalance ? (
                    <EyeSlashIcon size={ms(componentSizes.eyeIcon)} color={semantic.text.secondary} />
                  ) : (
                    <EyeIcon size={ms(componentSizes.eyeIcon)} color={semantic.text.secondary} />
                  )}
                </TouchableOpacity>
              </View>
              {/* Masked, not unmounted: hiding the balance must not move the
                  layout (the DOM BalanceCard twin does the same). */}
              <View style={styles.changeRow}>
                {hiddenBalance ? (
                  <Text style={[styles.changeText, { color: semantic.text.secondary }]}>
                    {hiddenValue}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.changeText, { color: changeColor }]}>
                      {showPercentage(changePercent)}
                    </Text>
                    {changePercent >= 0 ? (
                      <CaretUpIcon
                        size={ms(componentSizes.changeArrowIcon)}
                        color={changeColor}
                        style={styles.changeArrow}
                      />
                    ) : (
                      <CaretDownIcon
                        size={ms(componentSizes.changeArrowIcon)}
                        color={changeColor}
                        style={styles.changeArrow}
                      />
                    )}
                    <Text style={[styles.changeText, { color: changeColor }]}>
                      ({formatChange(changeAmount)})
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Pagination dots — fixed, not part of the sliding content */}
        {blockchains.length > 1 && (
          <View style={styles.pagination}>
            {blockchains.map((chain, index) => (
              <Pressable
                key={index}
                testID={`balance-carousel-dot-${index}`}
                onPress={() => index !== activeIndex && updateIndex(index)}
                hitSlop={DOT_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                  name: chain.network.name,
                })}
                accessibilityState={{ selected: index === activeIndex }}
                style={[styles.dot, index === activeIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'visible',
    borderRadius: ms(borderRadius.card),
    ...Platform.select({
      ios: {
        shadowColor: shadows.card.shadowColor,
        shadowOffset: shadows.card.shadowOffset,
        shadowOpacity: shadows.card.shadowOpacity,
        shadowRadius: shadows.card.shadowRadius,
      },
      android: {
        elevation: shadows.card.elevation,
      },
    }),
  },
  gradient: {
    borderRadius: ms(borderRadius.card),
    paddingHorizontal: s(spacing['2xl']),
    paddingBottom: vs(spacing.lg),
    overflow: 'hidden',
  },
  // Full height of the card, a fraction of its width, clipped by the
  // gradient's own `overflow: hidden` — so the light takes the card's corner
  // instead of squaring off inside it.
  edgeLight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: `${EDGE_LIGHT_REACH * 100}%`,
  },
  edgeLightLeft: {
    left: 0,
  },
  edgeLightRight: {
    right: 0,
  },
  content: {
    alignItems: 'center',
    gap: vs(spacing.sm),
  },
  contentGroup: {
    alignItems: 'center',
    gap: vs(spacing.xs),
  },
  /** Group 1. Stretches so the motif reads as a band, and clips it. */
  logoGroup: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: vs(spacing.xs),
    position: 'relative',
    overflow: 'hidden',
  },
  logoContainer: {
    // Both axes on `s()`. It was `s()` wide and `vs()` tall, which are two
    // different ratios, so the box that holds a round mark was not square.
    width: s(componentSizes.logoContainer),
    height: s(componentSizes.logoContainer),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: shadows.logo.shadowColor,
        shadowOffset: shadows.logo.shadowOffset,
        shadowOpacity: shadows.logo.shadowOpacity,
        shadowRadius: shadows.logo.shadowRadius,
      },
      android: {
        elevation: shadows.logo.elevation,
      },
    }),
  },
  networkLabelContainer: {
    backgroundColor: colors.background.glass,
    paddingHorizontal: s(spacing.sm),
    paddingVertical: vs(spacing.xxs),
    borderRadius: ms(borderRadius.sm),
  },
  networkLabelHidden: {
    opacity: 0,
  },
  networkLabelText: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(spacing.md),
    ...Platform.select({
      ios: {
        shadowColor: shadows.balanceText.shadowColor,
        shadowOffset: shadows.balanceText.shadowOffset,
        shadowOpacity: shadows.balanceText.shadowOpacity,
        shadowRadius: shadows.balanceText.shadowRadius,
      },
      android: {
        elevation: shadows.balanceText.elevation,
      },
    }),
  },
  balance: {
    fontSize: ms(fontSize.balance),
    fontFamily: fontFamilyNative.semiBold,
    fontWeight: fontWeight.semibold,
    color: colors.text.balance,
    letterSpacing: letterSpacing.balance,
  },
  balanceDecimals: {
    opacity: opacity.faint,
    color: colors.text.primary,
  },
  eyeButton: {
    padding: s(spacing.xs),
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: shadows.balanceText.shadowColor,
        shadowOffset: shadows.balanceText.shadowOffset,
        shadowOpacity: shadows.balanceText.shadowOpacity,
        shadowRadius: shadows.balanceText.shadowRadius,
      },
      android: {
        elevation: shadows.balanceText.elevation,
      },
    }),
  },
  changeText: {
    fontSize: ms(fontSize.sm),
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.change,
    lineHeight: ms(fontSize.sm * 1.3),
  },
  changeArrow: {
    marginHorizontal: s(spacing.xxs),
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(spacing.lg),
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: s(spacing.xxs),
    backgroundColor: colors.step.inactive,
    marginHorizontal: DOT_GAP,
  },
  dotActive: {
    backgroundColor: colors.text.primary,
  },
});

export default BalanceCardCarousel;
