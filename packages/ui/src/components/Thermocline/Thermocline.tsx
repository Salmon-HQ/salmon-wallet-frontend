/**
 * Thermocline — the P3 membrane material, named after the phenomenon it is.
 *
 * A thermocline is the boundary layer between water masses of different
 * density; light crossing it refracts, so everything seen through it blurs
 * and shimmers. Backdrop blur + tint over scrolling content is not a
 * metaphor for that — it is that, rendered. See DESIGN.md §The thermocline.
 *
 * DOM build — rung 4 of the degradation ladder: `backdrop-filter: blur()
 * saturate(115%)` over the membrane tint, gated by `@supports`, and only on
 * fixed chrome (sticky header, tab bar) — never on a sheet or a scrolling
 * container, so `surface="sheet"` renders the tint alone. Rung 5
 * (`prefers-reduced-transparency`) collapses to the nearest opaque plane
 * without moving the layout by a pixel. The scrim floor is painted on every
 * rung; it is not negotiable.
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
import { thermoclineVariant } from './thermoclineVariant';

const { scales } = semantic;

export type ThermoclineTier = 'thin' | 'thick';
export type ThermoclineSurface = 'sheet' | 'chrome';

export interface ThermoclineProps {
  surface: ThermoclineSurface;
  /** @default 'thin' */
  tier?: ThermoclineTier;
  /** The 24px refraction strip at the top edge — part of the material. @default true */
  refraction?: boolean;
  style?: CSSProperties;
  className?: string;
}

/** Rung 4 blur radius per tier (DESIGN.md scrim-floor table: 20px / 32px). */
const BLUR_PX: Record<ThermoclineTier, number> = { thin: 20, thick: 32 };

const SCRIM: Record<ThermoclineTier, string> = {
  thin: semantic.surface.membraneThin,
  thick: semantic.surface.membraneThick,
};

/** Rung 5 — the nearest opaque plane (thin → raised, thick → crest). */
const OPAQUE: Record<ThermoclineTier, string> = {
  thin: semantic.surface.raised,
  thick: semantic.surface.crest,
};

const REDUCED_TRANSPARENCY_QUERY = '(prefers-reduced-transparency: reduce)';

/** Rung 5 entry in v1: the OS signal alone (owner, 2026-08-18). */
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

/** The `@supports (backdrop-filter: blur(1px))` gate, in its JS form. */
function supportsBackdropBlur(): boolean {
  try {
    return (
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('backdrop-filter', 'blur(1px)')
    );
  } catch {
    return false;
  }
}

const Root = styled(Box)({
  position: 'relative',
  overflow: 'hidden',
  pointerEvents: 'none',
});

const Layer = styled(Box)<{ $background: string; $blurPx?: number }>(
  ({ $background, $blurPx }) => ({
    position: 'absolute',
    inset: 0,
    background: $background,
    ...($blurPx
      ? {
          backdropFilter: `blur(${$blurPx}px) saturate(115%)`,
          WebkitBackdropFilter: `blur(${$blurPx}px) saturate(115%)`,
        }
      : {}),
  })
);

const RefractionBand = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: scales.refractionHeight,
  opacity: scales.refractionOpacity,
  overflow: 'hidden',
});

export function Thermocline({
  surface,
  tier = 'thin',
  refraction = true,
  style,
  className,
}: ThermoclineProps) {
  const reduced = usePrefersReducedTransparency();

  // Blur is fixed-chrome-only on the DOM (rung 4); the tint alone still
  // holds the scrim floor everywhere else — the alpha is derived from a
  // pure-white worst case, so blur is aesthetic, not contractual.
  const rung =
    reduced || thermoclineVariant === 'opaque'
      ? 'opaque'
      : thermoclineVariant === 'tint' || surface === 'sheet' || !supportsBackdropBlur()
        ? 'tint'
        : 'blur';

  return (
    <Root style={style} className={className} data-testid="thermocline" data-rung={rung}>
      {rung === 'opaque' ? (
        <Layer $background={OPAQUE[tier]} data-testid="thermocline-opaque" />
      ) : (
        <Layer
          $background={SCRIM[tier]}
          $blurPx={rung === 'blur' ? BLUR_PX[tier] : undefined}
          data-testid="thermocline-scrim"
        />
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
