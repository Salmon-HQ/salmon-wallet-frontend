import type { IconBubbleRadius, IconBubbleShape, IconBubbleTone } from '../types/ui/icon-bubble';
import type { Semantic } from './semantic';
import { borderRadius } from './spacing';

/** The two card corners a rounded bubble can take — `Card`'s own two steps. */
const RADII: Record<IconBubbleRadius, number> = {
  lg: borderRadius.r3,
  xl: borderRadius.r4,
};

/** The drawn glyph-to-bubble ratio, from the design frames. */
const ICON_RATIO = 0.45;

/** Ground + ink per tone. The ink is not a choice the call site gets to make. */
const tonesFor = (
  t: Semantic
): Record<IconBubbleTone, { background: string; ink: string; border?: string }> => ({
  ink: { background: t.depth.abyss, ink: t.text.primary },
  accent: { background: t.accent.fill, ink: t.accent.onFill },
  'accent-tint': { background: t.accent.tint, ink: t.accent.ink },
  surface: { background: t.surface.raised, ink: t.text.primary },
  'success-tint': { background: t.status.successTint, ink: t.status.success },
  outline: { background: 'transparent', ink: t.text.primary, border: t.border.raised },
  ghost: { background: 'transparent', ink: t.text.secondary },
});

/**
 * How an icon bubble is drawn, in unscaled design units, the same on both
 * platforms.
 *
 * A disabled control is a different object, not a dimmed one: it takes its
 * own ground and ink, drops the border, and ignores the call site's
 * `iconColor`.
 */
export function iconBubbleLook(
  t: Semantic,
  options: {
    tone: IconBubbleTone;
    shape: IconBubbleShape;
    radius: IconBubbleRadius;
    size: number;
    iconSize?: number;
    iconColor?: string;
    disabled: boolean;
  }
): { background: string; ink: string; border?: string; cornerRadius: number; glyph: number } {
  const { tone, shape, radius, size, iconSize, iconColor, disabled } = options;
  const look = disabled
    ? { background: t.surface.crest, ink: t.text.disabled, border: undefined }
    : tonesFor(t)[tone];

  return {
    background: look.background,
    ink: disabled ? look.ink : (iconColor ?? look.ink),
    border: look.border,
    cornerRadius: shape === 'circle' ? borderRadius.full : RADII[radius],
    glyph: iconSize ?? Math.round(size * ICON_RATIO),
  };
}
