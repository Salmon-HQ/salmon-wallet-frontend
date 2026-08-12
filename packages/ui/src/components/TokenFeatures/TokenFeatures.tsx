/**
 * TokenFeatures - Token characteristics/features display component
 *
 * Web version using MUI and @emotion/styled for browser extension
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  getFeatureColor,
  componentSizes,
} from '@salmon/shared';
import type { TokenFeature } from '@salmon/shared';
import type { TokenFeaturesProps } from './types';

/**
 * Feature icon SVG paths (Material Design icons)
 */
const FEATURE_ICONS: Record<string, string> = {
  native: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  defi: 'M6 6h12v2H6V6zm0 4h12v2H6v-2zm0 4h12v2H6v-2z',
  governance:
    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  staking:
    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
  nft: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-9-7.33l-3-4-3 5.33h14l-5-6.67z',
  gaming:
    'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  privacy:
    'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  oracle:
    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
  bridge: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  exchange:
    'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  lending:
    'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  yield: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
  meme: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z',
  utility:
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  payment:
    'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  social:
    'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z',
  storage:
    'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
  identity:
    'M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.07.04-.15.06-.23.06-.83 0-1.5.67-1.5 1.5 0 .65.42 1.2 1 1.41V18c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7.38c.58-.21 1-.76 1-1.41 0-.83-.67-1.5-1.5-1.5zm-.31 3.73V18H6.5V8.2c.81-.16 1.56-.42 2.25-.78 1.05-.56 2.19-.86 3.36-.86 1.18 0 2.32.3 3.37.86.69.36 1.44.62 2.25.78H17.5z',
  verified:
    'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  new: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
  default:
    'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z',
};

/**
 * Get icon path for a feature
 */
function getFeatureIconPath(feature: TokenFeature): string {
  if (feature.icon && FEATURE_ICONS[feature.icon]) {
    return FEATURE_ICONS[feature.icon];
  }

  // Try to match by label (case-insensitive)
  const normalizedLabel = feature.label.toLowerCase();
  for (const [key, iconPath] of Object.entries(FEATURE_ICONS)) {
    if (normalizedLabel.includes(key)) {
      return iconPath;
    }
  }

  // Default icon
  return FEATURE_ICONS.default;
}

const Container = styled(Box)({
  marginTop: spacing.sm,
  marginBottom: spacing.sm,
});

const ScrollContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.sm,
  overflowX: 'auto',
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
});

const Badge = styled(Box)<{ $badgeColor: string }>(({ $badgeColor }) => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: borderRadius.full,
  backgroundColor: `${$badgeColor}20`,
  flexShrink: 0,
}));

const BadgeIcon = styled('svg')({
  marginRight: spacing.xs,
});

const BadgeLabel = styled(Typography)<{ $labelColor: string }>(({ $labelColor }) => ({
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: $labelColor,
  whiteSpace: 'nowrap',
}));

const SkeletonBadge = styled(Skeleton)({
  width: componentSizes.skeletonBadgeWidth,
  height: componentSizes.iconSizeLarge,
  borderRadius: borderRadius.full,
  flexShrink: 0,
});

/**
 * Feature badge icon component
 */
function FeatureIcon({ path, color }: { path: string; color: string }) {
  return (
    <BadgeIcon
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} fill={color} />
    </BadgeIcon>
  );
}

/**
 * Individual feature badge component
 */
function FeatureBadge({ feature, index }: { feature: TokenFeature; index: number }) {
  const color = getFeatureColor(feature, index);
  const iconPath = getFeatureIconPath(feature);

  return (
    <Badge $badgeColor={color}>
      <FeatureIcon path={iconPath} color={color} />
      <BadgeLabel $labelColor={color}>{feature.label}</BadgeLabel>
    </Badge>
  );
}

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
 *     { label: 'Native Token', icon: 'native' },
 *     { label: 'DeFi', color: '#10B981' },
 *     { label: 'Governance' },
 *   ]}
 * />
 * ```
 */
export function TokenFeatures({ features, loading = false, style, className }: TokenFeaturesProps) {
  if (loading) {
    return (
      <Container style={style} className={className}>
        <ScrollContainer>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBadge key={i} variant="rounded" sx={{ bgcolor: colors.skeleton.base }} />
          ))}
        </ScrollContainer>
      </Container>
    );
  }

  if (!features || features.length === 0) {
    return null;
  }

  return (
    <Container style={style} className={className}>
      <ScrollContainer>
        {features.map((feature, index) => (
          <FeatureBadge key={feature.label} feature={feature} index={index} />
        ))}
      </ScrollContainer>
    </Container>
  );
}
