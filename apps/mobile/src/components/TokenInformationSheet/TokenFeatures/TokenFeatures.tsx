import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
 * Map common feature icons to Ionicons names
 */
const FEATURE_ICON_MAP: Record<string, string> = {
  native: 'diamond-outline',
  defi: 'swap-horizontal-outline',
  governance: 'people-outline',
  staking: 'layers-outline',
  nft: 'image-outline',
  gaming: 'game-controller-outline',
  privacy: 'eye-off-outline',
  oracle: 'analytics-outline',
  bridge: 'git-branch-outline',
  exchange: 'repeat-outline',
  lending: 'cash-outline',
  yield: 'trending-up-outline',
  meme: 'happy-outline',
  utility: 'build-outline',
  payment: 'card-outline',
  social: 'chatbubbles-outline',
  storage: 'cloud-outline',
  identity: 'finger-print-outline',
  verified: 'checkmark-circle-outline',
  new: 'sparkles-outline',
};

/**
 * Get icon name for a feature
 */
function getFeatureIcon(feature: TokenFeature): string {
  if (feature.icon) return feature.icon;

  // Try to match by label (case-insensitive)
  const normalizedLabel = feature.label.toLowerCase();
  for (const [key, iconName] of Object.entries(FEATURE_ICON_MAP)) {
    if (normalizedLabel.includes(key)) {
      return iconName;
    }
  }

  // Default icon
  return 'pricetag-outline';
}

/**
 * Individual feature badge component
 */
const FeatureBadge: React.FC<{ feature: TokenFeature; index: number }> = ({ feature, index }) => {
  const color = getFeatureColor(feature, index);
  const iconName = getFeatureIcon(feature);

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Ionicons
        name={iconName as keyof typeof Ionicons.glyphMap}
        size={14}
        color={color}
        style={styles.badgeIcon}
      />
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
