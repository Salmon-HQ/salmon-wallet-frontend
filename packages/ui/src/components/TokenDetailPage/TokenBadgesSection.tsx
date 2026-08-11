/**
 * TokenBadgesSection - Displays token tags/badges in a grid
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Migrated from React Native TokenBadgesSection component.
 *
 * Shows verification status, token type, community info, and more.
 * Each badge displays an icon with its name below for clarity.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';

// MUI Icons - mapped from Ionicons equivalents
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GroupIcon from '@mui/icons-material/Group';
import PanToolIcon from '@mui/icons-material/PanTool';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SchoolIcon from '@mui/icons-material/School';
import SavingsIcon from '@mui/icons-material/Savings';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';

import { colors, spacing, borderRadius, fontSize, fontWeight, letterSpacing, componentSizes } from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { TokenBadgesSectionProps } from './types';

// ============================================================================
// Badge Configuration
// ============================================================================

/**
 * Badge configuration with icon component, color, and human-readable label
 */
interface BadgeConfig {
  icon: React.ElementType;
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
    icon: CheckCircleIcon,
    color: colors.palette.green,
    label: 'Verified',
    labelKey: 'token.badges.verified',
  },
  strict: {
    icon: ShieldIcon,
    color: colors.palette.amber,
    label: 'Strict',
    labelKey: 'token.badges.strict',
  },
  major: {
    icon: EmojiEventsIcon,
    color: colors.palette.amber,
    label: 'Major',
    labelKey: 'token.badges.major',
  },
  'moonshot-verified': {
    icon: VerifiedUserIcon,
    color: colors.palette.cyan,
    label: 'Moonshot',
    labelKey: 'token.badges.moonshot',
  },

  // Community tags
  community: {
    icon: GroupIcon,
    color: colors.palette.blue,
    label: 'Community',
    labelKey: 'token.badges.community',
  },
  'community-assist': {
    icon: PanToolIcon,
    color: colors.palette.blue,
    label: 'Community Assist',
    labelKey: 'token.badges.communityAssist',
  },

  // Token types
  lst: {
    icon: WaterDropIcon,
    color: colors.palette.cyan,
    label: 'LST',
  },
  'original-lst': {
    icon: MilitaryTechIcon,
    color: colors.palette.cyan,
    label: 'Original LST',
    labelKey: 'token.badges.originalLst',
  },
  stable: {
    icon: AttachMoneyIcon,
    color: colors.palette.green,
    label: 'Stablecoin',
    labelKey: 'token.badges.stablecoin',
  },
  'token-2022': {
    icon: ViewInArIcon,
    color: colors.palette.purple,
    label: 'Token-2022',
  },
  yb: {
    icon: AnalyticsIcon,
    color: colors.palette.indigo,
    label: 'Yield Bearing',
    labelKey: 'token.badges.yieldBearing',
  },

  // Launchpad & trading
  launchpad: {
    icon: RocketLaunchIcon,
    color: colors.palette.pink,
    label: 'Launchpad',
    labelKey: 'token.badges.launchpad',
  },
  moonshot: {
    icon: DarkModeIcon,
    color: colors.palette.purple,
    label: 'Moonshot',
    labelKey: 'token.badges.moonshot',
  },
  'birdeye-trending': {
    icon: TrendingUpIcon,
    color: colors.palette.orange,
    label: 'Trending',
    labelKey: 'token.badges.trending',
  },
  'pumpfun-graduates': {
    icon: SchoolIcon,
    color: colors.palette.pink,
    label: 'Pump.fun',
  },

  // Financial products
  'jup-lend-earn': {
    icon: SavingsIcon,
    color: colors.palette.green,
    label: 'Jupiter Lend',
  },
  prestocks: {
    icon: BarChartIcon,
    color: colors.palette.blue,
    label: 'Pre-stocks',
    labelKey: 'token.badges.preStocks',
  },
  xstocks: {
    icon: PieChartIcon,
    color: colors.palette.indigo,
    label: 'X-stocks',
    labelKey: 'token.badges.xStocks',
  },

  // Registry & metadata
  'old-registry': {
    icon: DescriptionIcon,
    color: colors.text.secondary,
    label: 'Legacy Registry',
    labelKey: 'token.badges.legacyRegistry',
  },
  'solana-fm': {
    icon: SearchIcon,
    color: colors.palette.indigo,
    label: 'Solana FM',
  },
  wormhole: {
    icon: LinkIcon,
    color: colors.palette.purple,
    label: 'Wormhole',
  },
  deduplicated: {
    icon: AccountTreeIcon,
    color: colors.text.tertiary,
    label: 'Deduplicated',
    labelKey: 'token.badges.deduplicated',
  },
  duplicate: {
    icon: ContentCopyIcon,
    color: colors.text.tertiary,
    label: 'Duplicate',
    labelKey: 'token.badges.duplicate',
  },
  deprecated: {
    icon: WarningIcon,
    color: colors.status.error,
    label: 'Deprecated',
    labelKey: 'token.badges.deprecated',
  },
  internal: {
    icon: LockIcon,
    color: colors.text.secondary,
    label: 'Internal',
    labelKey: 'token.badges.internal',
  },
};

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  padding: spacing.md,
});

const Title = styled(Typography)({
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
  marginBottom: spacing.md,
  letterSpacing: letterSpacing.slight,
});

const BadgesGrid = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: spacing.lg,
});

const BadgeItemContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: componentSizes.badgeMinWidth,
});

const BadgeIconWrapper = styled(Box)<{ $badgeColor: string }>(({ $badgeColor }) => ({
  width: componentSizes.iconSize2XL,
  height: componentSizes.iconSize2XL,
  borderRadius: borderRadius.iconLg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: spacing.xs,
  backgroundColor: `${$badgeColor}15`,
}));

const BadgeLabel = styled(Typography)<{ $badgeColor: string }>(({ $badgeColor }) => ({
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  textAlign: 'center',
  letterSpacing: letterSpacing.slight,
  color: $badgeColor,
}));

const SkeletonContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
});

const SkeletonBadgesRow = styled(Box)({
  display: 'flex',
  gap: spacing.lg,
});

// ============================================================================
// BadgeItem Component
// ============================================================================

/**
 * Individual badge item with icon and label
 */
const BadgeItem: React.FC<{ tag: string }> = ({ tag }) => {
  const { t } = useTranslation();
  const config = BADGE_CONFIG[tag];

  if (!config) {
    return null;
  }

  const IconComponent = config.icon;

  return (
    <BadgeItemContainer>
      <BadgeIconWrapper $badgeColor={config.color}>
        <IconComponent sx={{ fontSize: fontSize.lg, color: config.color }} />
      </BadgeIconWrapper>
      <BadgeLabel $badgeColor={config.color} noWrap>
        {config.labelKey ? t(config.labelKey, config.label) : config.label}
      </BadgeLabel>
    </BadgeItemContainer>
  );
};

// ============================================================================
// TokenBadgesSection Component
// ============================================================================

/**
 * TokenBadgesSection component for displaying all token tags/badges.
 * Shows verification status, token type, community info, and more.
 * Each badge displays an icon with its name below for clarity.
 */
export function TokenBadgesSection({
  tags,
  loading = false,
  style,
  className,
}: TokenBadgesSectionProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <BlurContainer
        style={{ borderRadius: borderRadius.iconContainer, overflow: 'hidden', ...style }}
        className={className}
      >
        <Container>
          <SkeletonContainer>
            <Skeleton
              variant="text"
              width={60}
              height={18}
              sx={{ bgcolor: colors.skeleton.base }}
            />
            <SkeletonBadgesRow>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${spacing.xs}px` }}>
                  <Skeleton
                    variant="circular"
                    width={40}
                    height={40}
                    sx={{ bgcolor: colors.skeleton.base }}
                  />
                  <Skeleton
                    variant="text"
                    width={50}
                    height={12}
                    sx={{ bgcolor: colors.skeleton.base }}
                  />
                </Box>
              ))}
            </SkeletonBadgesRow>
          </SkeletonContainer>
        </Container>
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
    <BlurContainer
      style={{ borderRadius: borderRadius.iconContainer, overflow: 'hidden', ...style }}
      className={className}
    >
      <Container>
        <Title>{t('token.badges.title', 'Badges')}</Title>
        <BadgesGrid>
          {validTags.map((tag) => (
            <BadgeItem key={tag} tag={tag} />
          ))}
        </BadgesGrid>
      </Container>
    </BlurContainer>
  );
}
