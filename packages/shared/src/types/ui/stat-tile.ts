import type { Semantic } from '../../theme/semantic';
import { fontSize } from '../../theme/typography';
import type { PillPropsBase } from './pill';
import type { Testable } from './testable';

export type StatTileTone = 'default' | 'positive' | 'negative' | 'accent';
/** `hero` is the one figure a screen is about; `sm` sits at the end of a row. */
export type StatTileSize = 'sm' | 'md' | 'lg' | 'hero';

/**
 * One figure: an uppercase label above, the value with its unit, a caption
 * under it (its value in the user's currency, usually). The value never
 * wraps; it shrinks to fit a narrow phone instead.
 */
export interface StatTilePropsBase extends Testable {
  label?: string;
  value: string;
  unit?: string;
  caption?: string;
  tone?: StatTileTone;
  size?: StatTileSize;
  align?: 'start' | 'end';
  /** Beside the figure, centred on the tile: the change over a period. */
  pill?: PillPropsBase;
  /** At the end of the value line, on its baseline: "70% of circulating". */
  note?: { text: string; tone?: 'accent' | 'secondary' };
}

/** Figures side by side, each an equal share of the row. */
export interface StatGridPropsBase extends Testable {
  items: readonly (StatTilePropsBase & { key: string })[];
}

/** The value's ink per tone, read by both twins. */
export const statInkFor = (t: Semantic): Record<StatTileTone, string> => ({
  default: t.text.primary,
  positive: t.change.positive,
  negative: t.change.negative,
  accent: t.accent.ink,
});

/** The value's and the unit's type size per tile size, read by both twins. */
export const STAT_SIZES: Record<StatTileSize, { value: number; unit: number }> = {
  sm: { value: fontSize.body, unit: fontSize.caption },
  md: { value: fontSize.heading, unit: fontSize.body },
  lg: { value: fontSize.headline, unit: fontSize.bodyLg },
  hero: { value: fontSize.display, unit: fontSize.bodyLg },
};

/**
 * How far a value may shrink to stay on one line on a narrow phone: a figure
 * read at 60% of its size is still a figure, a clipped one is a wrong number.
 */
export const STAT_MIN_FONT_SCALE = 0.6;
