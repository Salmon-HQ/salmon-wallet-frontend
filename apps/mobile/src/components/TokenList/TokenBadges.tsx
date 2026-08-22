import {
  ArrowElbowUpRightIcon,
  ChartBarIcon,
  ChartLineIcon,
  ChartPieIcon,
  CheckCircleIcon,
  CopyIcon,
  CubeIcon,
  CurrencyCircleDollarIcon,
  CurrencyDollarIcon,
  DropIcon,
  FileTextIcon,
  GraduationCapIcon,
  HandPalmIcon,
  LinkIcon,
  LockIcon,
  MagnifyingGlassIcon,
  MedalIcon,
  MoonIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  ShieldIcon,
  TrendUpIcon,
  TrophyIcon,
  UsersIcon,
  WarningIcon,
} from '../../icons';
import type { IconComponent } from '../../icons';
import {
  borderRadius,
  componentSizes,
  fontFamilyNative,
  fontSize,
  fontWeight,
  ms,
  s,
  semantic,
  spacing,
  vs,
} from '@salmon/shared';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
 * Mapping of token tags to icon components (mirrors the packages/ui twin)
 */
const TAG_ICON_MAP: Record<string, IconComponent> = {
  // Verification & trust tags
  verified: CheckCircleIcon,
  strict: ShieldIcon,
  major: TrophyIcon,
  'moonshot-verified': ShieldCheckIcon,

  // Community tags
  community: UsersIcon,
  'community-assist': HandPalmIcon,

  // Token types
  lst: DropIcon,
  'original-lst': MedalIcon,
  stable: CurrencyDollarIcon,
  'token-2022': CubeIcon,
  yb: ChartLineIcon,

  // Launchpad & trading
  launchpad: RocketLaunchIcon,
  moonshot: MoonIcon,
  'birdeye-trending': TrendUpIcon,
  'pumpfun-graduates': GraduationCapIcon,

  // Financial products
  'jup-lend-earn': CurrencyCircleDollarIcon,
  prestocks: ChartBarIcon,
  xstocks: ChartPieIcon,

  // Registry & metadata
  'old-registry': FileTextIcon,
  'solana-fm': MagnifyingGlassIcon,
  wormhole: LinkIcon,
  deduplicated: ArrowElbowUpRightIcon,
  duplicate: CopyIcon,
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

/**
 * Individual badge for a single tag. Icon plus accessible name — never colour
 * alone, which no screen reader and no colourblind user can read.
 *
 * On React Native the accessible name is `accessibilityLabel` paired with
 * `accessibilityRole="image"`; there is no DOM `role`/`aria-label` here.
 * `accessible` is set explicitly so TalkBack and VoiceOver treat the chip as
 * one node rather than descending into the icon glyph.
 */
const TokenBadge: React.FC<{ tag: string; label: string }> = ({ tag, label }) => {
  const TagIcon = TAG_ICON_MAP[tag];
  const meta = TOKEN_TAG_META[tag];

  if (!TagIcon) {
    return null;
  }

  const ink = meta?.weight === 'signal' && meta.tone ? TONE_INK[meta.tone] : semantic.text.tertiary;

  return (
    <View
      style={styles.badge}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID={`token-badge-${tag}`}
    >
      <TagIcon size={ms(fontSize.xs)} color={ink} />
    </View>
  );
};

/**
 * TokenBadges — the token's tags, at list-row volume.
 *
 * The tags are real information (each one is spelled out on the token detail
 * sheet), so none of them is removed. What is fixed here is *volume*. A row
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
 *    to a screen reader.
 *
 * @example
 * ```tsx
 * <TokenBadges tags={['community', 'verified', 'birdeye-trending', 'lst']} />
 * // renders: [verified] [community] [+2]
 * ```
 */
const TokenBadges: React.FC<TokenBadgesProps> = ({ tags }) => {
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
    <View style={styles.container}>
      {inline.map((tag) => (
        <TokenBadge key={tag} tag={tag} label={labelFor(tag)} />
      ))}
      {overflow.length > 0 && (
        <View
          style={styles.overflow}
          accessible
          accessibilityRole="image"
          // The collapsed tags are still announced — the chip is a density
          // affordance, not a place information goes to die.
          accessibilityLabel={overflow.map(labelFor).join(', ')}
          testID="token-badge-overflow"
        >
          <Text style={styles.overflowText}>{`+${overflow.length}`}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(spacing.xxs),
    flexWrap: 'nowrap',
    flexShrink: 0,
    marginLeft: s(spacing.xs),
  },
  badge: {
    width: s(componentSizes.iconSizeXSmall),
    height: vs(componentSizes.iconSizeXSmall),
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.state.hover,
  },
  overflow: {
    height: vs(componentSizes.iconSizeXSmall),
    paddingHorizontal: s(spacing.xxs),
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.state.hover,
  },
  overflowText: {
    fontSize: ms(fontSize.xs),
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamilyNative.semiBold,
    color: semantic.text.tertiary,
  },
});

export default TokenBadges;
