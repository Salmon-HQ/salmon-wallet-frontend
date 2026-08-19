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
import React, { useCallback } from 'react';
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
import type { BalanceCardCarouselProps, BlockchainId } from './types';

// Import the SVG icons from Icon component
import { CaretDownIcon, CaretUpIcon, EyeIcon, EyeSlashIcon } from '../../icons';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

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

  // Swapping the card is a tab change: the incoming card arrives on `drift`,
  // the outgoing one leaves on `ebb`. Exit is shorter than enter on purpose —
  // the card being replaced has already been read.
  const isReduceMotionEnabled = useReducedMotion();
  const cardIn = timing(motionMs.drift, isReduceMotionEnabled);
  const cardOut = timing(motionMs.ebb, isReduceMotionEnabled, curve.sink);

  const updateIndex = useCallback(
    (newIndex: number) => {
      setInternalIndex(newIndex);
      const blockchain = blockchains[newIndex];
      onBlockchainChange?.(blockchain.network.blockchain, newIndex);
    },
    [blockchains, onBlockchainChange]
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

  /**
   * The one animated route to another chain — swipe settle and dot tap both
   * land here, so the exit-on-`ebb` / enter-on-`drift` choreography (and its
   * reduce-motion resolution, already baked into cardIn/cardOut) cannot fork.
   * Content exits toward the side it would have been swiped: forward targets
   * exit left, backward targets exit right.
   */
  const slideToIndex = useCallback(
    (targetIndex: number) => {
      'worklet';
      if (isAnimating.value || targetIndex === activeIndex) return;
      const exitX = targetIndex > activeIndex ? -SCREEN_WIDTH : SCREEN_WIDTH;
      isAnimating.value = true;
      // Animate current content OFF toward the exit side
      translateX.value = withTiming(exitX, cardOut, (finished) => {
        if (finished) {
          // Update index (loads new content)
          runOnJS(updateIndex)(targetIndex);
          // Position new content OFF on the opposite side, then bring it IN
          translateX.value = -exitX;
          translateX.value = withTiming(0, cardIn, (timingFinished) => {
            if (timingFinished) {
              isAnimating.value = false;
            }
          });
        }
      });
    },
    [activeIndex, cardIn, cardOut, isAnimating, translateX, updateIndex]
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
        slideToIndex(activeIndex + 1);
      } else if (shouldSwipeRight) {
        slideToIndex(activeIndex - 1);
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
    const iconSize = s(componentSizes.blockchainIcon);
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

        {/* The chain selector — one dot per available network, fixed under the
            sliding content. The dots are the switch affordance, not a footnote:
            each sits in its own 44pt cell so a thumb can land on it, and a tap
            plays the exact slide choreography a swipe does (slideToIndex). */}
        {blockchains.length > 1 && (
          <View style={styles.pagination} testID="balance-carousel-dots">
            {blockchains.map((chain, index) => (
              <Pressable
                key={chain.network.id}
                onPress={() => slideToIndex(index)}
                accessibilityRole="button"
                accessibilityLabel={t('accessibility.select_blockchain', 'Switch to {{name}}', {
                  name: chain.network.name,
                })}
                accessibilityState={{ selected: index === activeIndex }}
                style={styles.dotTarget}
                testID={`balance-carousel-dot-${chain.network.id}`}
              >
                <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
              </Pressable>
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
    width: s(componentSizes.logoContainer),
    height: vs(componentSizes.logoContainer),
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
    letterSpacing: letterSpacing.wide,
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
    // No marginTop: each dot's 44pt cell already supplies the clearance the
    // old spacing.lg margin used to.
  },
  /**
   * One dot's pressable cell. 44pt square — the WCAG AA touch floor
   * (PRODUCT.md), reusing componentSizes.headerButtonSize, the token that
   * carries 44 elsewhere. Deliberately unscaled: a hit target is a floor, not
   * a design size. The visible dot stays small inside it, per DESIGN.md's
   * hit-slop-over-inflation rule; adjacent cells touch without overlapping,
   * which lands dot centers ~44pt apart (≈ spacing.paginationGap).
   */
  dotTarget: {
    width: componentSizes.headerButtonSize,
    height: componentSizes.headerButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: s(componentSizes.stepDotSize),
    height: s(componentSizes.stepDotSize),
    borderRadius: borderRadius.full,
    backgroundColor: colors.step.inactive,
  },
  // Which chain you are looking at is a selected state: the active dot is a
  // step larger and takes the primary ink. Still a circle — this is chrome.
  dotActive: {
    width: s(componentSizes.stepDotSize + spacing.xxs),
    height: s(componentSizes.stepDotSize + spacing.xxs),
    backgroundColor: colors.text.primary,
  },
});

export default BalanceCardCarousel;
