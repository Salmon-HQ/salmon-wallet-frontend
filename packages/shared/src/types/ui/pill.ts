import type { Semantic } from '../../theme/semantic';
import type { PowerupIconName } from './powerup-icon';
import type { Testable } from './testable';

/**
 * `positive` and `negative` are a change (a gain, a fall), `success` a
 * status ("Active"), `accent` the brand mark on a figure ("15.1% APY"),
 * `neutral` anything else. A gain and a fall never share a colour.
 */
export type PillTone = 'neutral' | 'accent' | 'positive' | 'negative' | 'success';

/** A short read-only label on a tinted capsule; never a control. */
export interface PillPropsBase extends Testable {
  label: string;
  tone: PillTone;
  icon?: PowerupIconName;
  /** A status dot before the label. */
  dot?: boolean;
}

/** Ink and ground per tone, read by both twins so they cannot drift. */
export const pillColorsFor = (t: Semantic): Record<PillTone, { ink: string; ground: string }> => ({
  neutral: { ink: t.text.secondary, ground: t.state.hover },
  accent: { ink: t.accent.ink, ground: t.accent.tint },
  positive: { ink: t.change.positive, ground: t.status.successTint },
  negative: { ink: t.change.negative, ground: t.status.dangerTint },
  success: { ink: t.status.success, ground: t.status.successTint },
});
