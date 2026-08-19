import { CaretDownIcon, CaretUpIcon, EyeIcon, EyeSlashIcon } from '../../icons';
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
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cardLight } from '../../debug/cardLight';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';
import { ShimmerRect } from '../ShimmerRect';
import type { BalanceCardProps, BlockchainId } from './types';

/* ------------------------------------------------------------------------ *
 * The caustic — the water's light on the card's face
 *
 * The card is an opaque pane suspended in the column. Unlit it reads as a grey
 * rectangle, because a pane at depth with no light on it is exactly that. This
 * layer gives it the water's own light rather than the brand's: `water.light`
 * (`#9FE0EF`), the cold caustic ink The Surfacing's band and the press specular
 * already spend. Same rgba literal the two `ScalesBackground`s use for the
 * caustic stroke — the token is the source of truth, the literal is the
 * platform's spelling of it.
 *
 * Two objections had to be answered before this could be light at all.
 *
 * 1. The gate hangs above this card and casts a shadow onto it, so light
 *    arriving from directly overhead is occluded before it lands — a spotlight
 *    here would contradict the geometry the shadow already states. So this is
 *    not incident light. It is a *reflection on the card's own face*: the pane
 *    returns the rippling surface far above it toward the viewer, and where a
 *    reflection sits is decided by the viewer's angle, not the source's. An
 *    awning over your head does not remove the sky from a window in front of
 *    you. The gate's shadow and this reflection are therefore not rivals; the
 *    dark band the gate lays across the top edge is what the light beneath it
 *    reads against, and the two together model the card as a solid object.
 * 2. DESIGN.md refuses "ambient light shafts or resting caustics" and holds
 *    that light is an event, never a state. That refusal is about the *water* —
 *    the column must not glow, or The Surfacing stops meaning anything. This is
 *    not the medium emitting; it is a surface's specularity, a material
 *    property in the same class as the thermocline's own frosted texture. It
 *    stays inside the card, it is static, and it never brightens: nothing about
 *    it can be mistaken for something having just happened.
 *
 * The Scales Exclusion Rule is untouched — no motif enters the card, and the
 * card's ground stays fully opaque over the water. The rule is about the
 * motif, not about light.
 *
 * Cost: two static `LinearGradient`s inside a layer the card already
 * composites. No blur, no native module, no clock. Deliberately *not*
 * `mixBlendMode: 'screen'` like the press specular: over a ground this dark the
 * two composite within a level or two of each other, and screen would buy a
 * separate compositing group for nothing.
 * ------------------------------------------------------------------------ */

/** `water.light`, in the alpha-carrying spelling `expo-linear-gradient` needs. */
const causticInk = (alpha: number) => `rgba(159, 224, 239, ${alpha})`;

/**
 * The three readings the debug switch offers, and what each is for.
 *
 * `peak` is the opacity of the brightest filament; `reach` is how far the light
 * survives along its own axis; `cross` is what the second filament carries as a
 * fraction of the peak. Those are the only three levers, and each reading is
 * the same light seen at a different strength — not three different ideas.
 *
 * The earlier 0.07 opacity ceiling assumed the light could arrive at the change
 * row. It cannot: the axis runs down-right, and at these reaches the change row
 * sits past the end of the gradient, so its alpha is exactly zero at every
 * reading here. The ceiling that actually binds is the amount, whose leftmost
 * glyphs the light grazes because the axis is diagonal — and even the `bold`
 * graze leaves the amount at 7.65:1 on the lightest of the two panes, well over
 * AA. Contrast is therefore not what limits this layer; the register is. The
 * numbers below were re-derived from the card's measured geometry, not carried
 * over.
 *
 * Worst-case measured ratios over the lighter `SHALLOW_PANE` ground (the
 * unfavourable of the two), taken at the brightest point inside each text box:
 *
 * | reading | peak | reach | cross | amount `#DDE3ED`   | change `#FF6B85` |
 * | ------- | ---- | ----- | ----- | ------------------ | ---------------- |
 * | none    | —    | —     | —     | 11.62:1            | 6.21:1           |
 * | subtle  | 0.05 | 0.30  | 0.60  | 10.89:1 (α 0.027)  | 6.21:1 (α 0)     |
 * | present | 0.11 | 0.32  | 0.70  |  9.50:1 (α 0.082)  | 6.21:1 (α 0)     |
 * | bold    | 0.18 | 0.34  | 0.75  |  7.65:1 (α 0.164)  | 6.21:1 (α 0)     |
 *
 * `reach` stays well under 0.40 at every reading — the amount's cap-height sits
 * there, and the light must never gather on the number. It is nudged rather
 * than pushed between readings because reach is what turns a gathered
 * reflection into a header treatment; `peak` is the lever that buys visibility
 * without spreading the shape. `cross` rises with `peak` for the same reason a
 * brighter caustic needs a stronger second filament: one filament alone reads
 * as a wash the moment it is bright enough to see.
 */
const CAUSTIC_READINGS = {
  /** The first pass, kept verbatim. Judged invisible; on the dial as the floor. */
  subtle: { peak: 0.05, reach: 0.3, cross: 0.6 },
  /** The intended reading: the same shape, opened until it is actually there. */
  present: { peak: 0.11, reach: 0.32, cross: 0.7 },
  /** Past comfort on purpose, to bracket the answer from above. */
  bold: { peak: 0.18, reach: 0.34, cross: 0.75 },
} as const;

/**
 * Where the light enters and which way it runs. The shoulder, not the crown:
 * the top edge is where the gate's shadow is densest, and a reflection that
 * starts off-centre reads as gathered rather than as a header treatment.
 */
const CAUSTIC_AXIS = { start: { x: 0.05, y: 0 }, end: { x: 0.75, y: 1 } } as const;
/** The crossing filament: shallower, nearly lateral, so the two actually cross. */
const CAUSTIC_CROSS_AXIS = { start: { x: 0, y: 0.14 }, end: { x: 1, y: 0.44 } } as const;

/** The reflection on the card's face. Static, non-interactive, clipped to the card. */
const BalanceCardCaustic = ({ reading }: { reading: keyof typeof CAUSTIC_READINGS }) => {
  const { peak, reach, cross } = CAUSTIC_READINGS[reading];

  return (
    <View style={styles.causticLayer} pointerEvents="none" testID="balance-card-caustic">
      <LinearGradient
        colors={[causticInk(0), causticInk(peak * 0.5), causticInk(peak), causticInk(0)]}
        // Rises fast off the edge and decays slowly — a filament has a bright
        // core and a long tail, which is what separates it from a linear fade.
        locations={[0, reach * 0.22, reach * 0.52, reach]}
        start={CAUSTIC_AXIS.start}
        end={CAUSTIC_AXIS.end}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[causticInk(0), causticInk(peak * cross), causticInk(0)]}
        locations={[0, reach * 0.45, reach * 1.1]}
        start={CAUSTIC_CROSS_AXIS.start}
        end={CAUSTIC_CROSS_AXIS.end}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

/**
 * Get gradient configuration for a blockchain
 */
const getGradientForBlockchain = (blockchain: BlockchainId) => {
  switch (blockchain) {
    case 'solana':
      return gradients.balanceCardSolana;
    case 'solana-devnet':
      return gradients.balanceCardSolanaDevnet;
    case 'bitcoin':
      return gradients.balanceCardBitcoin;
    case 'bitcoin-testnet':
      return gradients.balanceCardBitcoinTestnet;
    case 'ethereum':
      return gradients.balanceCardEthereum;
    case 'ethereum-sepolia':
      return gradients.balanceCardEthereumSepolia;
    default:
      return gradients.balanceCardSolana;
  }
};

/**
 * Render the blockchain logo using local SVG icons
 */
const renderBlockchainLogo = (blockchain: BlockchainId) => {
  const iconSize = s(componentSizes.blockchainIcon);
  switch (blockchain) {
    case 'solana':
    case 'solana-devnet':
      return <SolanaSvgIcon size={iconSize} color={colors.text.primary} />;
    case 'bitcoin':
    case 'bitcoin-testnet':
      return <BitcoinSvgIcon size={iconSize} color={colors.text.primary} />;
    case 'ethereum':
    case 'ethereum-sepolia':
      return <EthereumSvgIcon size={iconSize} color={colors.text.primary} />;
    default:
      return <SolanaSvgIcon size={iconSize} color={colors.text.primary} />;
  }
};

/**
 * BalanceCard component for displaying total portfolio balance
 *
 * Features:
 * - Large centered blockchain logo (42x38px)
 * - Centered balance with decimal opacity styling
 * - Inline eye icon for visibility toggle
 * - 24h percentage and absolute change with trending arrow
 * - Blockchain-specific gradient background
 * - Pagination dots for multi-network carousel
 *
 * @example
 * ```tsx
 * <BalanceCard
 *   network={{ id: 'solana-mainnet', name: 'Solana Mainnet' }}
 *   blockchain="solana"
 *   usdTotal={1234.56}
 *   changePercent={5.23}
 *   changeAmount={61.45}
 *   hiddenBalance={false}
 *   onToggleVisibility={() => setHidden(!hidden)}
 * />
 * ```
 */
export const BalanceCard: React.FC<BalanceCardProps> = ({
  network: _network,
  blockchain = 'solana',
  usdTotal,
  changePercent = 0,
  changeAmount = 0,
  hiddenBalance = false,
  onToggleVisibility,
  currentIndex = 0,
  totalCount = 1,
  loading = false,
  showNetworkLabel = false,
  style,
}) => {
  const { t } = useTranslation();
  const [, { formatValue, formatChange }] = useCurrencyContext();

  const handleToggleVisibility = useCallback(() => {
    onToggleVisibility?.();
  }, [onToggleVisibility]);

  // Determine the label type for coloring
  const labelType = getLabelValue(changePercent);
  const changeColor = colors.change[labelType];

  // Format display values
  const displayPercentage = showPercentage(changePercent);
  const displayAbsChange = formatChange(changeAmount);

  // Get gradient for current blockchain
  const gradient = getGradientForBlockchain(blockchain);

  // Get network label — in developer mode, always show (including "Mainnet")
  const networkLabel = showNetworkLabel
    ? (getNetworkLabel(blockchain) ?? t('general.network_mainnet', 'Mainnet'))
    : null;

  // Determine if change is positive
  const isPositive = changePercent >= 0;

  /**
   * Render balance with decimal opacity styling
   * Format: $1,177.90 where .90 has 40% opacity
   */
  const renderBalance = () => {
    if (hiddenBalance) {
      return (
        <View style={styles.balanceRow}>
          <Text style={styles.balanceDollars}>{hiddenValue}</Text>
          <TouchableOpacity
            testID="balance-eye-toggle"
            onPress={handleToggleVisibility}
            style={styles.eyeButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.show_balance', 'Show balance')}
          >
            <EyeSlashIcon size={ms(componentSizes.eyeIcon)} color={semantic.text.secondary} />
          </TouchableOpacity>
        </View>
      );
    }

    const formatted = formatValue(usdTotal);
    const parts = formatted.split('.');

    return (
      <View style={styles.balanceRow}>
        <View style={styles.balanceTextGroup}>
          <Text style={styles.balanceDollars}>{parts[0]}</Text>
          {parts[1] && (
            <Text style={[styles.balanceDollars, styles.balanceDecimals]}>.{parts[1]}</Text>
          )}
        </View>
        <TouchableOpacity
          testID="balance-eye-toggle"
          onPress={handleToggleVisibility}
          style={styles.eyeButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.hide_balance', 'Hide balance')}
        >
          <EyeIcon size={ms(componentSizes.eyeIcon)} color={semantic.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render 24h change with trending arrow
   * Format: 3,2 % (arrow) (+$199.45)
   */
  const renderChange = () => {
    if (hiddenBalance) {
      return (
        <View style={styles.changeRow}>
          <Text style={styles.changeHidden}>{hiddenValue}</Text>
        </View>
      );
    }

    return (
      <View style={styles.changeRow}>
        <Text style={[styles.changeText, { color: changeColor }]}>{displayPercentage}</Text>
        {isPositive ? (
          <CaretUpIcon
            size={ms(componentSizes.changeArrowIcon)}
            color={changeColor}
            style={styles.trendingIcon}
          />
        ) : (
          <CaretDownIcon
            size={ms(componentSizes.changeArrowIcon)}
            color={changeColor}
            style={styles.trendingIcon}
          />
        )}
        {displayAbsChange && (
          <Text style={[styles.changeText, { color: changeColor }]}>({displayAbsChange})</Text>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[...gradient.colors, gradient.colors[gradient.colors.length - 1]]}
      locations={[0, 0.35, 0.75, 1]}
      start={gradient.start}
      end={gradient.end}
      style={[styles.container, style]}
      testID="balance-card-root"
    >
      {cardLight !== 'none' && <BalanceCardCaustic reading={cardLight} />}

      {/* Group 1: Logo + Network tag. No motif: the motif belongs to the
          water, and this card is content — it carries the balance figure, and
          the scales never go behind a numeric value. Confining the field to
          this band was how the card kept the rule while the ground had no
          field of its own; the ground now runs the whole column, so a field
          inside the card would be wallpaper. Asserted in
          BalanceCard.scales.test.tsx. */}
      <View style={styles.logoGroup} testID="balance-card-logo-group">
        <View style={styles.logoContainer}>{renderBlockchainLogo(blockchain)}</View>
        {networkLabel && (
          <View style={styles.networkLabelContainer}>
            <Text style={styles.networkLabelText}>{networkLabel}</Text>
          </View>
        )}
      </View>

      {/* Group 2: Balance + Change */}
      <View style={styles.contentGroup}>
        <View style={styles.balanceContainer}>
          {loading ? (
            <View style={styles.balanceRow}>
              <ShimmerRect
                width={ms(componentSizes.buttonMinWidthLg)}
                height={ms(fontSize.balance)}
              />
            </View>
          ) : (
            renderBalance()
          )}
        </View>
        {loading ? (
          <View style={styles.changeRow}>
            <ShimmerRect width={ms(componentSizes.buttonMinWidth)} height={ms(fontSize.sm)} />
          </View>
        ) : (
          renderChange()
        )}
      </View>

      {/* Group 3: Pagination dots */}
      {totalCount > 1 && (
        <View style={styles.pagination}>
          {Array.from({ length: totalCount }).map((_, index) => (
            <View
              key={index}
              style={[styles.paginationDot, index === currentIndex && styles.paginationDotActive]}
            />
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: ms(borderRadius.card),
    paddingTop: vs(spacing['2xl']),
    paddingHorizontal: s(spacing['2xl']),
    paddingBottom: vs(spacing['2xl']),
    alignItems: 'center',
    justifyContent: 'center',
    gap: vs(spacing.sm),
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
  /**
   * Clips the reflection to the card's own rounded face. It carries the clip
   * rather than the container so the container keeps its drop shadow — on iOS
   * `overflow: 'hidden'` sets `masksToBounds` and would erase it.
   */
  causticLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ms(borderRadius.card),
    overflow: 'hidden',
  },
  contentGroup: {
    alignItems: 'center',
    gap: vs(spacing.xs),
  },
  /**
   * Stretches to the card's full width so the motif reads as a band rather
   * than a patch, and clips it to this group's own box.
   */
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
  balanceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceRow: {
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
  balanceTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceDollars: {
    fontSize: ms(fontSize.balance),
    fontFamily: fontFamilyNative.semiBold,
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
  trendingIcon: {
    marginHorizontal: s(spacing.xxs),
  },
  changeHidden: {
    fontSize: ms(fontSize.sm),
    color: semantic.text.secondary,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(spacing.sm),
  },
  paginationDot: {
    width: s(spacing.xs),
    height: s(spacing.xs),
    borderRadius: s(spacing.xxs),
    backgroundColor: colors.step.inactive,
    marginHorizontal: s(spacing.xxs + 1),
  },
  paginationDotActive: {
    // Which chain you are looking at is a selected state, so the active dot is
    // salmon ink (6.07:1) against inactive neutral — a 4px mark, not a fill.
    backgroundColor: semantic.accent.ink,
  },
});

export default BalanceCard;
