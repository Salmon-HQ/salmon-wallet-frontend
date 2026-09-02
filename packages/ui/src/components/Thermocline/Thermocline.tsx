/**
 * Thermocline — the P3 membrane material, named after the phenomenon it is.
 *
 * A thermocline is the boundary layer between water masses of different
 * density; light crossing it refracts, so everything seen through it blurs
 * and shimmers. Tint over scrolling content is that, rendered. See
 * DESIGN.md §The thermocline.
 *
 * DOM build — the mobile twin is
 * `apps/mobile/src/components/Thermocline/Thermocline.native.tsx`. The material is
 * the tint: the translucent membrane ink alone, adopted over the glass/blur
 * ladder on 2026-08-19 (owner's live comparison). `prefers-reduced-transparency`
 * collapses it to the nearest opaque plane without moving the layout by a
 * pixel. The scrim floor is painted on every rung; it is not negotiable.
 *
 * Renders background only — `pointer-events: none`, no children.
 *
 * The material is tint + scrim only (2026-09-01) — the membrane field, the
 * flat dark scales layer that used to cover the whole surface, is retired.
 * See DESIGN.md §The thermocline, "The membrane field."
 */
import { useEffect, useState, type CSSProperties } from 'react';
import type { Semantic } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { ThermoclineProps, ThermoclineTier } from './types';

/** Scrim per tier — the floor, always painted, never negotiated. */
const scrimFor = (t: Semantic): Record<ThermoclineTier, string> => ({
  thin: t.surface.membraneThin,
  thick: t.surface.membraneThick,
});

/** Opaque rung — the nearest opaque plane per tier (thin → raised, thick → crest). */
const opaqueFor = (t: Semantic): Record<ThermoclineTier, string> => ({
  thin: t.surface.raised,
  thick: t.surface.crest,
});

const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

/** Opaque-rung entry on the DOM: the OS signal, `prefers-reduced-transparency`. */
function usePrefersReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return window.matchMedia(REDUCED_TRANSPARENCY_QUERY).matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(REDUCED_TRANSPARENCY_QUERY);
    } catch {
      return undefined;
    }
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

const rootStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  pointerEvents: 'none',
};

const layerStyle = (background: string): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  background,
});

export function Thermocline({ tier = 'thin', style, className }: ThermoclineProps) {
  const semantic = useSemantic();
  const reduced = usePrefersReducedTransparency();
  const rung = reduced ? 'opaque' : 'tint';

  return (
    <div
      style={{ ...rootStyle, ...style }}
      className={className}
      data-testid="thermocline"
      data-rung={rung}
    >
      {rung === 'opaque' ? (
        <div style={layerStyle(opaqueFor(semantic)[tier])} data-testid="thermocline-opaque" />
      ) : (
        <div style={layerStyle(scrimFor(semantic)[tier])} data-testid="thermocline-scrim" />
      )}
    </div>
  );
}
