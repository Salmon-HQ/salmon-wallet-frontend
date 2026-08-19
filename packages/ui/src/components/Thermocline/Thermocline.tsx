/**
 * Thermocline — the P3 membrane material, named after the phenomenon it is.
 *
 * A thermocline is the boundary layer between water masses of different
 * density; light crossing it refracts, so everything seen through it blurs
 * and shimmers. Tint over scrolling content is that, rendered. See
 * DESIGN.md §The thermocline.
 *
 * DOM build — the material is the tint: the translucent membrane ink alone,
 * adopted over the glass/blur ladder on 2026-08-19 (owner's live
 * comparison). `prefers-reduced-transparency` collapses it to the nearest
 * opaque plane without moving the layout by a pixel. The scrim floor is
 * painted on every rung; it is not negotiable.
 *
 * Renders background only — `pointer-events: none`, no children. The
 * `surface.membrane*` tokens keep their name; the material is the thing
 * that got named.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import Box from '@mui/material/Box';
import { semantic } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { ScalesBackground } from '../ScalesBackground';

const { scales } = semantic;

export type ThermoclineTier = 'thin' | 'thick';

export interface ThermoclineProps {
  /** @default 'thin' */
  tier?: ThermoclineTier;
  /** The 24px refraction strip at the top edge — part of the material. @default true */
  refraction?: boolean;
  style?: CSSProperties;
  className?: string;
}

const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

/** Opaque rung — the nearest opaque plane (thin → raised, thick → crest). */
const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

/** Opaque-rung entry in v1: the OS signal alone (owner, 2026-08-18). */
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

const Root = styled(Box)({
  position: 'relative',
  overflow: 'hidden',
  pointerEvents: 'none',
});

const Layer = styled(Box)<{ $background: string }>(({ $background }) => ({
  position: 'absolute',
  inset: 0,
  background: $background,
}));

const RefractionBand = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: scales.refractionHeight,
  opacity: scales.refractionOpacity,
  overflow: 'hidden',
});

export function Thermocline({ tier = 'thin', refraction = true, style, className }: ThermoclineProps) {
  const reduced = usePrefersReducedTransparency();
  const rung = reduced ? 'opaque' : 'tint';

  return (
    <Root style={style} className={className} data-testid="thermocline" data-rung={rung}>
      {rung === 'opaque' ? (
        <Layer $background={OPAQUE[tier]} data-testid="thermocline-opaque" />
      ) : (
        <Layer $background={SCRIM[tier]} data-testid="thermocline-scrim" />
      )}
      {refraction && (
        <RefractionBand data-testid="thermocline-refraction">
          <ScalesBackground variant="refraction" />
        </RefractionBand>
      )}
    </Root>
  );
}

export default Thermocline;
