/**
 * FleshBackground - the myoseptal texture of salmon flesh, for salmon fills.
 *
 * The DOM half of the pair; `apps/mobile` draws the same geometry through
 * `react-native-svg`. Both read `fleshTile` / `fleshFills` from
 * `@salmon/shared`, so neither platform owns the drawing and the two cannot
 * drift apart. The rationale for the geometry lives beside the data in
 * `packages/shared/src/theme/flesh.ts`.
 *
 * This replaced `ScalesBackground variant="fish"` inside salmon fills. Scales
 * are skin — the outside of the animal, and the right texture for a ground or
 * a plane. A filled button is mass, so the honest material for it is the cut
 * surface. It is also a matter of feature size: the seigaiha tile is far taller
 * than a 56px pill, so the eye counts scallops and reads a stamp applied on
 * top; the myosepta read as material.
 *
 * @example
 * ```tsx
 * // Inside a salmon fill, under the label
 * <FleshBackground />
 * ```
 */
import { useId } from 'react';
import { fleshFills, fleshTile } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { FleshBackgroundProps } from './types';

export function FleshBackground({
  color,
  scale = 1,
  opacity = 1,
  style,
  className,
}: FleshBackgroundProps) {
  const { flesh } = useSemantic();
  const band = color ?? flesh.band;

  // Unique per instance: two FleshBackgrounds in one document sharing a
  // hardcoded `id` would both resolve to whichever pattern rendered first —
  // the same collision `ScalesBackground` fixes with `useId`. The colons in a
  // React id are not valid in an SVG fragment identifier, so they are stripped.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const patternId = `flesh${uid}`;

  // Filled tapered polygons at flat opacity — no fade gradients, the taper
  // does the organic work — so the pattern is a plain map over the fills.
  return (
    <svg
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
      className={className}
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={fleshTile.width}
          height={fleshTile.height}
          patternTransform={`scale(${scale})`}
        >
          {fleshFills.map(([d, fillOpacity], i) => (
            <path key={i} d={d} fill={band} fillOpacity={fillOpacity * opacity} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
