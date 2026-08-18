/**
 * BrandMark — the salmon mark, drawn, for the DOM.
 *
 * The mark used to be `<img src="/images/Logo.png">`: a 197x183 raster with a
 * near-white `#FCFCFC` baked into it, letterboxed inside square boxes of 48,
 * 60, 72, 80 and 120. At 120 on a 2x display that is 240 device pixels asked
 * of 197, which is the softness visible on a real screen — and the white was
 * never a design decision, it was the raster.
 *
 * This draws `markPaths` instead, so the mark is crisp at any size and takes
 * its ink from a token. Geometry is the authored master at 253x236: the slot
 * drives the width and the height follows `markAspectRatio`, so it is never
 * squashed into a square.
 *
 * The React Native twin is `apps/mobile/src/components/BrandMark`; both read
 * `markPaths` from `@salmon/shared` rather than either owning the geometry.
 */
import { markAspectRatio, markPaths, markViewBoxAttr, semantic } from '@salmon/shared';
import type { Testable } from '@salmon/shared';

export interface BrandMarkProps extends Testable {
  /** Drawn width in px. Height follows the aspect ratio. */
  size: number;
  /**
   * Ink. Defaults to `semantic.text.primary` — white, which is what the mark
   * has always looked like on these screens, except that it was the PNG's
   * baked `#FCFCFC` rather than a token anyone chose.
   */
  color?: string;
  /** Accessible name. Omit for a decorative mark, which is the usual case. */
  title?: string;
}

export function BrandMark({
  size,
  color = semantic.text.primary,
  title,
  testID = 'brand-mark',
}: BrandMarkProps): React.ReactElement {
  return (
    <svg
      data-testid={testID}
      width={size}
      height={size / markAspectRatio}
      viewBox={markViewBoxAttr}
      fill={color}
      focusable="false"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {markPaths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
