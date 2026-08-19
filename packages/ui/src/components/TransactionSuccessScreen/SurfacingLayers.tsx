/**
 * The Surfacing — the two painted layers. DOM port of
 * `apps/mobile/src/components/TransactionSuccessScreen/SurfacingLayers.tsx`.
 *
 * The timing lives in `surfacing.ts`; the driving lives in
 * `TransactionSuccessScreen`. This file only draws, and it draws exactly two
 * things: the membrane that clears, and the caustic band that travels.
 *
 * Both are `pointer-events: none`. P4 (Caustic) is transient light in
 * DESIGN.md's plane model — additive, non-blocking, and never something a
 * pointer can land on.
 *
 * The two deliberate omissions of the mobile build apply here for the same
 * reasons (DESIGN.md §The Surfacing, "deliberately not built"):
 * 1. **No membrane blur 32px → 12px.** The screen mounts over an opaque
 *    ground, so there is nothing behind the membrane to defocus — the tint
 *    clearing (α 0.80 → 0.55, expressed as element opacity 1 → 0.6875)
 *    carries the whole event.
 * 2. **No 24px Gaussian on the band.** The blur erases the scales geometry
 *    that masks the band, which is the only thing that makes the light read
 *    as this system's light. The band ships sharp; its downward gradient
 *    falloff carries the softness.
 */
import React, { forwardRef } from 'react';
import { keyframes } from '@mui/material/styles';
import { motionEasing, semantic } from '@salmon/shared';
import { styled } from '../../utils/styled';
import { ScalesBackground } from '../ScalesBackground';
import { BAND_HEIGHT, MEMBRANE_OPACITY_TO } from './surfacing';

const membraneClear = keyframes`
  from { opacity: 1; }
  to { opacity: ${MEMBRANE_OPACITY_TO}; }
`;

const MembraneLayer = styled('div')<{ $durationMs: number }>(({ $durationMs }) => ({
  position: 'absolute',
  inset: 0,
  backgroundColor: semantic.surface.membraneThick,
  pointerEvents: 'none',
  animation: `${membraneClear} ${$durationMs}ms ${motionEasing.current.css} forwards`,
}));

/**
 * The sheet's membrane, clearing.
 *
 * One element filled with `surface.membraneThick`, whose opacity carries the
 * α 0.80 → 0.55 of the specification (see `MEMBRANE_OPACITY_TO`). A pure CSS
 * animation: the clear has no layout dependency, so it needs no script. Under
 * reduced motion the global `prefers-reduced-motion` collapse makes it a
 * step — which is exactly the mapping the timeline asks for.
 */
export function SurfacingMembrane({ durationMs }: { durationMs: number }) {
  return <MembraneLayer data-testid="tx-surfacing-membrane" $durationMs={durationMs} aria-hidden />;
}

const BandLayer = styled('div')({
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  height: BAND_HEIGHT,
  // 0 until the driver has measured the corridor and starts the WAAPI plan —
  // a band that travels to the wrong place is worse than one frame of nothing.
  opacity: 0,
  // Transient light adds, it does not tint. The receipt sets
  // `isolation: isolate` so the blend stays inside this screen.
  mixBlendMode: 'screen',
  pointerEvents: 'none',
});

/**
 * The caustic band — a 140px shaft of cold light, masked by the scales
 * geometry at 0.5×, travelling from the bottom of the sheet up to the amount.
 * It is the shaft of light hitting the fish.
 *
 * The travel is driven with WAAPI from `TransactionSuccessScreen`, because
 * where the band stops is a function of layout, not of CSS. `data-surfacing-mode`
 * carries which variant of the moment was chosen, so the choice is observable
 * without a frame clock.
 */
export const CausticBand = forwardRef<HTMLDivElement, { mode: 'travel' | 'static' }>(
  function CausticBand({ mode }, ref) {
    return (
      <BandLayer ref={ref} data-testid="tx-surfacing-band" data-surfacing-mode={mode} aria-hidden>
        <ScalesBackground variant="caustic" />
      </BandLayer>
    );
  }
);
