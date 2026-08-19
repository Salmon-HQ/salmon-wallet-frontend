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

export type ThermoclineTier = 'thin' | 'thick';

export interface ThermoclineProps {
  /** @default 'thin' */
  tier?: ThermoclineTier;
  /**
   * @deprecated Unread since 2026-08-19: the refraction strip merged into
   * the membrane field — its brighter top 24px stacked over the field and
   * read as a band that broke the material. The field is now one continuous
   * dark ink; there is no separate strip to toggle.
   */
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

/**
 * The membrane field — the 0.5× seigaiha over the whole surface as one flat
 * dark ink (owner, 2026-08-19: dark scales, one continuous field). The
 * former 24px refraction strip is merged into this field: a second, brighter
 * copy clipped to the top edge stacked over the field there and read as a
 * band that broke the material. No container opacity — the subtlety is the
 * ink's own alpha (`scales.membraneFieldStroke`), one knob. Texture, not
 * transparency: painted on every rung.
 */
const ScalesField = styled(Box)({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
});

export function Thermocline({ tier = 'thin', style, className }: ThermoclineProps) {
  const reduced = usePrefersReducedTransparency();
  const rung = reduced ? 'opaque' : 'tint';

  return (
    <Root style={style} className={className} data-testid="thermocline" data-rung={rung}>
      {rung === 'opaque' ? (
        <Layer $background={OPAQUE[tier]} data-testid="thermocline-opaque" />
      ) : (
        <Layer $background={SCRIM[tier]} data-testid="thermocline-scrim" />
      )}
      <ScalesField data-testid="thermocline-field">
        <ScalesBackground variant="membrane" />
      </ScalesField>
    </Root>
  );
}

export default Thermocline;
