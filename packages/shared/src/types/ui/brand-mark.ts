import type { Testable } from './testable';

/**
 * The salmon mark, drawn from `markPaths` on both platforms. The slot drives
 * the width; the height follows `markAspectRatio`. The ink defaults to the
 * active mode's `text.primary`; the doors (welcome, success, the lock, the
 * wait) pass `accent.fill`.
 */
export interface BrandMarkPropsBase extends Testable {
  /** Drawn width. Height follows the aspect ratio. */
  size: number;
  /** Ink. Defaults to the mode's `text.primary`. */
  color?: string;
}

/**
 * The product's name, drawn from `wordmarkPaths`. The height is the title
 * token it replaced; the width follows `wordmarkAspectRatio`.
 */
export interface WordmarkPropsBase extends Testable {
  /** Drawn height. Width follows the aspect ratio. */
  height?: number;
  /** Ink. The title's own — the mode's `text.primary`. */
  color?: string;
}
