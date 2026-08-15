import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontFamilyNative,
  fontSize,
  componentSizes,
  ms,
  s,
  spacing,
  vs,
  borderRadius,
  semantic,
} from '@salmon/shared';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ContentLoader, Rect } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';

interface TokenBadgesSectionProps {
  tags?: string[];
  loading?: boolean;
  style?: ViewStyle;
}

/**
 * Badge configuration with icon, color, and human-readable label
 */
interface BadgeConfig {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  /** i18n key; proper-noun badges (LST, Token-2022, Pump.fun, ...) stay literal */
  labelKey?: string;
}

/**
 * Complete mapping of token tags to their visual representation
 */
const BADGE_CONFIG: Record<string, BadgeConfig> = {
  // Verification & trust tags
  verified: {
    icon: 'checkmark-circle',
    color: colors.palette.green,
    label: 'Verified',
    labelKey: 'token.badges.verified',
  },
  strict: {
    icon: 'shield',
    color: colors.palette.amber,
    label: 'Strict',
    labelKey: 'token.badges.strict',
  },
  major: {
    icon: 'trophy',
    color: colors.palette.amber,
    label: 'Major',
    labelKey: 'token.badges.major',
  },
  'moonshot-verified': {
    icon: 'shield-checkmark',
    color: colors.palette.cyan,
    label: 'Moonshot',
    labelKey: 'token.badges.moonshot',
  },

  // Community tags
  community: {
    icon: 'people',
    color: colors.palette.blue,
    label: 'Community',
    labelKey: 'token.badges.community',
  },
  'community-assist': {
    icon: 'hand-right',
    color: colors.palette.blue,
    label: 'Community Assist',
    labelKey: 'token.badges.communityAssist',
  },

  // Token types
  lst: {
    icon: 'water',
    color: colors.palette.cyan,
    label: 'LST',
  },
  'original-lst': {
    icon: 'medal',
    color: colors.palette.cyan,
    label: 'Original LST',
    labelKey: 'token.badges.originalLst',
  },
  stable: {
    icon: 'logo-usd',
    color: colors.palette.green,
    label: 'Stablecoin',
    labelKey: 'token.badges.stablecoin',
  },
  'token-2022': {
    icon: 'cube',
    color: colors.palette.purple,
    label: 'Token-2022',
  },
  yb: {
    icon: 'analytics',
    color: colors.palette.indigo,
    label: 'Yield Bearing',
    labelKey: 'token.badges.yieldBearing',
  },

  // Launchpad & trading
  launchpad: {
    icon: 'rocket',
    color: colors.palette.pink,
    label: 'Launchpad',
    labelKey: 'token.badges.launchpad',
  },
  moonshot: {
    icon: 'moon',
    color: colors.palette.purple,
    label: 'Moonshot',
    labelKey: 'token.badges.moonshot',
  },
  'birdeye-trending': {
    icon: 'trending-up',
    color: colors.palette.orange,
    label: 'Trending',
    labelKey: 'token.badges.trending',
  },
  'pumpfun-graduates': {
    icon: 'school',
    color: colors.palette.pink,
    label: 'Pump.fun',
  },

  // Financial products
  'jup-lend-earn': {
    icon: 'cash',
    color: colors.palette.green,
    label: 'Jupiter Lend',
  },
  prestocks: {
    icon: 'bar-chart',
    color: colors.palette.blue,
    label: 'Pre-stocks',
    labelKey: 'token.badges.preStocks',
  },
  xstocks: {
    icon: 'pie-chart',
    color: colors.palette.indigo,
    label: 'X-stocks',
    labelKey: 'token.badges.xStocks',
  },

  // Registry & metadata
  'old-registry': {
    icon: 'document-text',
    color: colors.text.secondary,
    label: 'Legacy Registry',
    labelKey: 'token.badges.legacyRegistry',
  },
  'solana-fm': {
    icon: 'search',
    color: colors.palette.indigo,
    label: 'Solana FM',
  },
  wormhole: {
    icon: 'link',
    color: colors.palette.purple,
    label: 'Wormhole',
  },
  deduplicated: {
    icon: 'git-branch',
    color: colors.text.tertiary,
    label: 'Deduplicated',
    labelKey: 'token.badges.deduplicated',
  },
  duplicate: {
    icon: 'copy',
    color: colors.text.tertiary,
    label: 'Duplicate',
    labelKey: 'token.badges.duplicate',
  },
  deprecated: {
    icon: 'warning',
    color: semantic.status.danger,
    label: 'Deprecated',
    labelKey: 'token.badges.deprecated',
  },
  internal: {
    icon: 'lock-closed',
    color: colors.text.secondary,
    label: 'Internal',
    labelKey: 'token.badges.internal',
  },
};

/**
 * Individual badge item with icon and label
 */
const BadgeItem: React.FC<{ tag: string }> = ({ tag }) => {
  const { t } = useTranslation();
  const config = BADGE_CONFIG[tag];

  if (!config) {
    return null;
  }

  return (
    <View style={styles.badgeItem}>
      <View style={[styles.badgeIcon, { backgroundColor: `${config.color}15` }]}>
        <Ionicons name={config.icon} size={ms(18)} color={config.color} />
      </View>
      <Text style={[styles.badgeLabel, { color: config.color }]} numberOfLines={1}>
        {config.labelKey ? t(config.labelKey, config.label) : config.label}
      </Text>
    </View>
  );
};

/**
 * TokenBadgesSection component for displaying all token tags/badges
 * Shows verification status, token type, community info, and more
 * Each badge displays an icon with its name below for clarity
 */
export const TokenBadgesSection: React.FC<TokenBadgesSectionProps> = ({
  tags,
  loading = false,
  style,
}) => {
  const { t } = useTranslation();

  if (loading) {
    // Match loaded layout: title + row of vertical badges (circle 40x40 + label below)
    const circleSize = s(40);
    const circleRadius = circleSize / 2;
    const labelHeight = ms(10);
    const labelGap = vs(spacing.xs);
    const badgeItemWidth = s(55);
    const badgeGap = s(spacing.lg);
    const titleHeight = ms(14);
    const titleMargin = vs(spacing.md);
    const badgeRowY = titleHeight + titleMargin;
    const badgeHeight = circleSize + labelGap + labelHeight;
    const totalHeight = badgeRowY + badgeHeight;

    return (
      <BlurContainer style={[styles.glassWrapper, style]}>
        <View style={styles.container}>
          <ContentLoader
            speed={1.5}
            width="100%"
            height={totalHeight}
            backgroundColor={colors.skeleton.base}
            foregroundColor={colors.skeleton.highlight}
          >
            {/* Title "Badges" */}
            <Rect x="0" y="0" rx="4" ry="4" width="60" height={titleHeight} />
            {/* Badge 1: circle + label */}
            <Rect
              x={0}
              y={badgeRowY}
              rx={circleRadius}
              ry={circleRadius}
              width={circleSize}
              height={circleSize}
            />
            <Rect
              x={(circleSize - 30) / 2}
              y={badgeRowY + circleSize + labelGap}
              rx="3"
              ry="3"
              width="30"
              height={labelHeight}
            />
            {/* Badge 2 */}
            <Rect
              x={badgeItemWidth + badgeGap}
              y={badgeRowY}
              rx={circleRadius}
              ry={circleRadius}
              width={circleSize}
              height={circleSize}
            />
            <Rect
              x={badgeItemWidth + badgeGap + (circleSize - 30) / 2}
              y={badgeRowY + circleSize + labelGap}
              rx="3"
              ry="3"
              width="30"
              height={labelHeight}
            />
            {/* Badge 3 */}
            <Rect
              x={(badgeItemWidth + badgeGap) * 2}
              y={badgeRowY}
              rx={circleRadius}
              ry={circleRadius}
              width={circleSize}
              height={circleSize}
            />
            <Rect
              x={(badgeItemWidth + badgeGap) * 2 + (circleSize - 30) / 2}
              y={badgeRowY + circleSize + labelGap}
              rx="3"
              ry="3"
              width="30"
              height={labelHeight}
            />
          </ContentLoader>
        </View>
      </BlurContainer>
    );
  }

  // Filter to only known tags
  const validTags = tags?.filter((tag) => BADGE_CONFIG[tag]) || [];

  // Return null if no valid tags
  if (validTags.length === 0) {
    return null;
  }

  return (
    <BlurContainer style={[styles.glassWrapper, style]}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('token.badges.title', 'Badges')}</Text>
        <View style={styles.badgesContainer}>
          {validTags.map((tag) => (
            <BadgeItem key={tag} tag={tag} />
          ))}
        </View>
      </View>
    </BlurContainer>
  );
};

const styles = StyleSheet.create({
  glassWrapper: {
    borderRadius: borderRadius.iconContainer,
    marginHorizontal: s(spacing['2xl']),
    overflow: 'hidden',
  },
  container: {
    padding: s(spacing.md),
  },
  title: {
    fontSize: ms(fontSize.base),
    fontFamily: fontFamilyNative.semiBold,
    color: colors.text.primary,
    marginBottom: vs(spacing.md),
    letterSpacing: ms(-0.07, 0.3),
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: s(spacing.lg),
  },
  badgeItem: {
    alignItems: 'center',
    minWidth: s(componentSizes.badgeMinWidth),
  },
  badgeIcon: {
    width: s(componentSizes.iconSize2XL),
    height: s(componentSizes.iconSize2XL),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(spacing.xs),
  },
  badgeLabel: {
    fontSize: ms(fontSize.xs),
    fontFamily: fontFamilyNative.medium,
    textAlign: 'center',
    letterSpacing: ms(-0.05, 0.3),
  },
});

export default TokenBadgesSection;
