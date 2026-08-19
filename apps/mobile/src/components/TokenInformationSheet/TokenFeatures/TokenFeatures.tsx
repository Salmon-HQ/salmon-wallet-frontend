import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRightIcon,
  ChartLineIcon,
  ChatsCircleIcon,
  CheckCircleIcon,
  CloudIcon,
  CreditCardIcon,
  DiamondIcon,
  EyeSlashIcon,
  FingerprintIcon,
  GameControllerIcon,
  ImageIcon,
  MoneyIcon,
  SmileyIcon,
  SparkleIcon,
  StackIcon,
  TagIcon,
  TreeStructureIcon,
  TrendUpIcon,
  UsersIcon,
  WrenchIcon,
} from '../../../icons';
import type { IconComponent } from '../../../icons';
import {
  colors,
  ContentLoader,
  fontFamilyNative,
  Rect,
  spacing,
  borderRadius,
  fontWeight,
  fontSize,
  getFeatureColor,
} from '@salmon/shared';
import type { TokenFeature } from '@salmon/shared';
import type { TokenFeaturesProps } from './types';

/**
 * Map common feature keys to icon components
 */
const FEATURE_ICON_MAP: Record<string, IconComponent> = {
  native: DiamondIcon,
  defi: ArrowsLeftRightIcon,
  governance: UsersIcon,
  staking: StackIcon,
  nft: ImageIcon,
  gaming: GameControllerIcon,
  privacy: EyeSlashIcon,
  oracle: ChartLineIcon,
  bridge: TreeStructureIcon,
  exchange: ArrowsClockwiseIcon,
  lending: MoneyIcon,
  yield: TrendUpIcon,
  meme: SmileyIcon,
  utility: WrenchIcon,
  payment: CreditCardIcon,
  social: ChatsCircleIcon,
  storage: CloudIcon,
  identity: FingerprintIcon,
  verified: CheckCircleIcon,
  new: SparkleIcon,
};

/**
 * Get icon name for a feature
 */
function getFeatureIcon(feature: TokenFeature): IconComponent {
  if (feature.icon && FEATURE_ICON_MAP[feature.icon]) {
    return FEATURE_ICON_MAP[feature.icon];
  }

  // Try to match by label (case-insensitive)
  const normalizedLabel = feature.label.toLowerCase();
  for (const [key, FeatureIcon] of Object.entries(FEATURE_ICON_MAP)) {
    if (normalizedLabel.includes(key)) {
      return FeatureIcon;
    }
  }

  // Default icon
  return TagIcon;
}

/**
 * Individual feature badge component
 */
const FeatureBadge: React.FC<{ feature: TokenFeature; index: number }> = ({ feature, index }) => {
  const color = getFeatureColor(feature, index);

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      {React.createElement(getFeatureIcon(feature), {
        size: 14,
        color,
        style: styles.badgeIcon,
      })}
      <Text style={[styles.badgeLabel, { color }]}>{feature.label}</Text>
    </View>
  );
};

/**
 * TokenFeatures component for displaying token characteristics
 *
 * Features:
 * - Horizontal scrollable row of feature badges/chips
 * - Each badge shows icon + label
 * - Custom colors per feature
 * - Loading skeleton state
 *
 * @example
 * ```tsx
 * <TokenFeatures
 *   features={[
 *     { label: 'Native Token', icon: 'diamond-outline' },
 *     { label: 'DeFi', color: '#10B981' },
 *     { label: 'Governance' },
 *   ]}
 * />
 * ```
 */
export const TokenFeatures: React.FC<TokenFeaturesProps> = ({
  features,
  loading = false,
  style,
}) => {
  if (loading) {
    const badgeWidth = 100;
    const badgeHeight = 32;
    return (
      <View style={[styles.container, style]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3, 4].map((i) => (
            <ContentLoader
              key={i}
              speed={1.5}
              width={badgeWidth}
              height={badgeHeight}
              viewBox={`0 0 ${badgeWidth} ${badgeHeight}`}
              backgroundColor={colors.skeleton.base}
              foregroundColor={colors.skeleton.highlight}
            >
              <Rect
                x="0"
                y="0"
                rx={badgeHeight / 2}
                ry={badgeHeight / 2}
                width={badgeWidth}
                height={badgeHeight}
              />
            </ContentLoader>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!features || features.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {features.map((feature, index) => (
          <FeatureBadge key={feature.label} feature={feature} index={index} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  badgeIcon: {
    marginRight: spacing.xs,
  },
  badgeLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamilyNative.medium,
    fontWeight: fontWeight.medium as '500',
  },
});

export default TokenFeatures;
