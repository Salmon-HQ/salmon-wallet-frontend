import type { ReactNode } from 'react';

import type { Semantic } from '../../theme/semantic';
import { borderRadius, spacing } from '../../theme/spacing';

import type { Testable } from './testable';

/**
 * The four grounds a card can take.
 *
 * `surface` is the default membrane every list item, receipt and content box
 * sits on; `accent` is the salmon tint; `warning` the amber notice wash;
 * `ink` the inverse well used for a featured block that must read as a
 * different object rather than a louder one.
 */
/**
 * `shelf` is the opaque step above the bedrock — the one tone with no
 * translucency, for a card under the Bedrock Rule (the signing gate).
 * `clear` draws no ground and no edge: the card's layout without the card,
 * for a row that heads a screen (spec 040).
 */
export type CardTone = 'surface' | 'accent' | 'warning' | 'ink' | 'shelf' | 'clear';

/** 0 / 12 / 14 / 16 / 24 — `none` for a `clear` card that aligns with the column. */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/** `lg` is the 12px control radius, `xl` the 16px card radius. */
export type CardRadius = 'lg' | 'xl';

/**
 * Card — the one content container the redesign composes everything from,
 * platform-agnostic. Each platform adds its own style prop.
 */
export interface CardPropsBase extends Testable {
  tone?: CardTone;
  padding?: CardPadding;
  /** Gap between children, in px. Use a `spacing` token at the call site. */
  gap?: number;
  radius?: CardRadius;
  /** When present the card becomes a button and takes the pressed feedback. */
  onPress?: () => void;
  /**
   * Announced role when pressable. Defaults to `button`; pass `link` for a
   * row whose press opens an external URL, so it announces as a link rather
   * than an action.
   */
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  children?: ReactNode;
}

/**
 * Ground and edge per tone, read by both twins. Every border is the
 * decorative hairline except `warning`, which keeps the amber stroke the tint
 * ships with. `surface` grounds on the thin-tier membrane rather than the
 * opaque `surface.raised` (2026-09-01, owner: what lies under a card must
 * show through a little).
 */
export const cardTonesFor = (
  t: Semantic
): Record<CardTone, { background: string; border: string }> => ({
  surface: { background: t.surface.membraneThin, border: t.border.hairline },
  accent: { background: t.accent.tint, border: t.border.hairline },
  warning: { background: t.status.warningTint, border: t.status.warningTintBorder },
  ink: { background: t.depth.abyss, border: t.border.hairline },
  shelf: { background: t.surface.shelf, border: t.border.hairline },
  clear: { background: 'transparent', border: 'transparent' },
});

/**
 * `md` is 14: the spacing scale steps 12 → 16 with nothing between, and the
 * dense list row sits on the half step. Named here rather than spelled at a
 * call site so it moves in one place if the scale gains it.
 */
const PADDING_MD = 14;

/** Inner padding per step, read by both twins (mobile scales it). */
export const CARD_PADDINGS: Record<CardPadding, number> = {
  none: 0,
  sm: spacing.md,
  md: PADDING_MD,
  lg: spacing.lg,
  xl: spacing['2xl'],
};

export const CARD_RADII: Record<CardRadius, number> = {
  lg: borderRadius.r3,
  xl: borderRadius.r4,
};
