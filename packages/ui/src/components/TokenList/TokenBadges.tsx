/**
 * TokenBadges — the token's tags, at list-row volume.
 *
 * The tags are real information (each one is spelled out on the token detail
 * screen), so none of them is removed. What is fixed here is *volume*. A row
 * used to render up to five ~10px saturated chips beside the token name: six
 * hues competing with the price, the name crushed toward truncation, and
 * nothing legible enough at that size to actually decode. Three changes:
 *
 * 1. **A cap.** Two render inline; the rest collapse into a `+N` chip that
 *    carries their names in its accessible label. Signals sort to the front,
 *    so a risk tag is never the one that got collapsed.
 * 2. **Colour is spent, not sprayed.** Only a verification or risk fact takes
 *    a status ramp — it is the only kind of tag that should change what a user
 *    does next. Everything descriptive is monochrome `text.tertiary` on the
 *    neutral state overlay, which still separates the chips from each other
 *    and from the name without claiming urgency.
 * 3. **A name.** Every chip was previously unlabelled colour, i.e. invisible
 *    to a screen reader. Each is now `role="img"` with its translated label.
 *
 * Web version using MUI icons and @emotion/styled for browser extension.
 */
import { useTranslation } from 'react-i18next';
import type { SvgIconComponent } from '@mui/icons-material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BarChartIcon from '@mui/icons-material/BarChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CubeIcon from '@mui/icons-material/ViewInAr';
import DescriptionIcon from '@mui/icons-material/Description';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import NightlightIcon from '@mui/icons-material/Nightlight';
import PanToolIcon from '@mui/icons-material/PanTool';
import PieChartIcon from '@mui/icons-material/PieChart';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningIcon from '@mui/icons-material/Warning';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  spacing,
  borderRadius,
  componentSizes,
  semantic,
  fontFamily,
  fontWeight,
  s,
  vs,
  ms,
  fontSize,
} from '@salmon/shared';
import { styled } from '../../utils/styled';
import type { TokenBadgesProps } from './types';
import { TOKEN_TAG_META, sortTagsBySignalFirst, type TokenTagTone } from './tokenTagMeta';

/**
 * How many chips a row may carry before the rest collapse.
 *
 * Two, because the name is the row's primary key and the price sits directly
 * under it; past two the name starts eating its own ellipsis in the narrow
 * column. The overflow chip is the third slot and it never grows.
 */
const INLINE_BADGE_LIMIT = 2;

/**
 * Mapping of token tags to MUI icon components
 */
const TAG_ICON_MAP: Record<string, SvgIconComponent> = {
  // Verification & trust tags
  verified: CheckCircleIcon,
  strict: ShieldIcon,
  major: EmojiEventsIcon,
  'moonshot-verified': VerifiedUserIcon,

  // Community tags
  community: GroupIcon,
  'community-assist': PanToolIcon,

  // Token types
  lst: WaterDropIcon,
  'original-lst': MilitaryTechIcon,
  stable: AttachMoneyIcon,
  'token-2022': CubeIcon,
  yb: AnalyticsIcon,

  // Launchpad & trading
  launchpad: RocketLaunchIcon,
  moonshot: NightlightIcon,
  'birdeye-trending': TrendingUpIcon,
  'pumpfun-graduates': SchoolIcon,

  // Financial products
  'jup-lend-earn': MonetizationOnIcon,
  prestocks: BarChartIcon,
  xstocks: PieChartIcon,

  // Registry & metadata
  'old-registry': DescriptionIcon,
  'solana-fm': SearchIcon,
  wormhole: LinkIcon,
  deduplicated: ForkRightIcon,
  duplicate: ContentCopyIcon,
  deprecated: WarningIcon,
  internal: LockIcon,
};

/**
 * The only colour in the row. A signal tag says the token is who it claims to
 * be, or that it is retired or impersonating — facts worth a hue. Everything
 * else is monochrome.
 */
const TONE_INK: Record<TokenTagTone, string> = {
  positive: semantic.status.success,
  caution: semantic.status.warning,
  negative: semantic.status.danger,
};

// --- Styled components ---

const BadgesContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: s(spacing.xxs),
  flexWrap: 'nowrap',
  flexShrink: 0,
  marginLeft: s(spacing.xs),
});

const BadgeBox = styled(Box)({
  width: s(componentSizes.iconSizeXSmall),
  height: vs(componentSizes.iconSizeXSmall),
  borderRadius: borderRadius.sm,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: semantic.state.hover,
});

const OverflowBox = styled(Box)({
  height: vs(componentSizes.iconSizeXSmall),
  paddingLeft: s(spacing.xxs),
  paddingRight: s(spacing.xxs),
  borderRadius: borderRadius.sm,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: semantic.state.hover,
});

const OverflowText = styled(Typography)({
  fontSize: ms(fontSize.xs),
  fontWeight: fontWeight.semibold,
  fontFamily: fontFamily.sans,
  color: semantic.text.tertiary,
  lineHeight: 1,
});

/**
 * Individual badge for a single tag. Icon plus accessible name — never colour
 * alone, which no screen reader and no colourblind user can read.
 */
function TokenBadge({ tag, label }: { tag: string; label: string }) {
  const IconComponent = TAG_ICON_MAP[tag];
  const meta = TOKEN_TAG_META[tag];

  if (!IconComponent) {
    return null;
  }

  const ink =
    meta?.weight === 'signal' && meta.tone ? TONE_INK[meta.tone] : semantic.text.tertiary;

  return (
    <BadgeBox role="img" aria-label={label} data-testid={`token-badge-${tag}`}>
      <IconComponent sx={{ fontSize: ms(fontSize.xs), color: ink }} />
    </BadgeBox>
  );
}

/**
 * TokenBadges — capped, quiet, and named.
 *
 * @example
 * ```tsx
 * <TokenBadges tags={['community', 'verified', 'birdeye-trending', 'lst']} />
 * // renders: [verified] [community] [+2]
 * ```
 */
export function TokenBadges({ tags }: TokenBadgesProps) {
  const { t } = useTranslation();

  if (!tags || tags.length === 0) {
    return null;
  }

  // Only tags this surface can actually draw; an unknown tag rendered nothing
  // before and must not now consume one of the two inline slots.
  const known = sortTagsBySignalFirst(tags).filter((tag) => TAG_ICON_MAP[tag]);

  if (known.length === 0) {
    return null;
  }

  const labelFor = (tag: string): string => {
    const meta = TOKEN_TAG_META[tag];
    if (!meta) return tag;
    return meta.labelKey ? t(meta.labelKey, meta.label) : meta.label;
  };

  const inline = known.slice(0, INLINE_BADGE_LIMIT);
  const overflow = known.slice(INLINE_BADGE_LIMIT);

  return (
    <BadgesContainer>
      {inline.map((tag) => (
        <TokenBadge key={tag} tag={tag} label={labelFor(tag)} />
      ))}
      {overflow.length > 0 && (
        <OverflowBox
          role="img"
          // The collapsed tags are still announced — the chip is a density
          // affordance, not a place information goes to die.
          aria-label={overflow.map(labelFor).join(', ')}
          data-testid="token-badge-overflow"
        >
          <OverflowText>{`+${overflow.length}`}</OverflowText>
        </OverflowBox>
      )}
    </BadgesContainer>
  );
}
