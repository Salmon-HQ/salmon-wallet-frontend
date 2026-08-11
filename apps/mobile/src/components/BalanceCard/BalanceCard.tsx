import { Ionicons } from '@expo/vector-icons';
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
  getScalesColorForBlockchain,
  getNetworkLabel,
  fontWeight,
  opacity,
} from '@salmon/shared';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BitcoinSvgIcon, EthereumSvgIcon, SolanaSvgIcon } from '../Icon/SvgIcons';
import { ScalesBackground } from '../ScalesBackground';
import { ShimmerRect } from '../ShimmerRect';
import type { BalanceCardProps, BlockchainId } from './types';

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

  // Get gradient and scales color for current blockchain
  const gradient = getGradientForBlockchain(blockchain);
  const scalesColor = getScalesColorForBlockchain(blockchain);

  // Get network label — in developer mode, always show (including "Mainnet")
  const networkLabel = showNetworkLabel ? (getNetworkLabel(blockchain) ?? t('general.network_mainnet', 'Mainnet')) : null;

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
            <Ionicons
              name="eye-off"
              size={ms(componentSizes.eyeIcon)}
              color={colors.text.muted}
            />
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
            <Text style={[styles.balanceDollars, styles.balanceDecimals]}>
              .{parts[1]}
            </Text>
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
          <Ionicons name="eye" size={ms(componentSizes.eyeIcon)} color={colors.text.muted} />
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
        <Text style={[styles.changeText, { color: changeColor }]}>
          {displayPercentage}
        </Text>
        <Ionicons
          name={isPositive ? 'chevron-up' : 'chevron-down'}
          size={ms(componentSizes.changeArrowIcon)}
          color={changeColor}
          style={styles.trendingIcon}
        />
        {displayAbsChange && (
          <Text style={[styles.changeText, { color: changeColor }]}>
            ({displayAbsChange})
          </Text>
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
    >
      {/* Scales pattern overlay - color based on blockchain */}
      <ScalesBackground
        strokeColor={scalesColor}
        strokeWidth={1}
        patternHeight={26}
        style={styles.scalesOverlay}
      />
      {/* Group 1: Logo + Network tag */}
      <View style={styles.contentGroup}>
        <View style={styles.logoContainer}>
          {renderBlockchainLogo(blockchain)}
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
          {loading ? (
            <View style={styles.balanceRow}>
              <ShimmerRect width={ms(componentSizes.buttonMinWidthLg)} height={ms(fontSize.balance)} />
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
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  scalesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: ms(borderRadius.card),
  },
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
  contentGroup: {
    alignItems: 'center',
    gap: vs(spacing.xs),
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
    color: colors.text.muted,
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
    backgroundColor: colors.text.primary,
  },
});

export default BalanceCard;
