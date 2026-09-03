/**
 * DepthBackground — the water column's ground: the depth ramp.
 *
 * The DOM half of the pair; `apps/mobile` draws the same ramp through
 * `expo-linear-gradient`. Both read `water.gradient` from `@salmon/shared`, so
 * neither platform owns the drawing.
 *
 * One layer: a vertical gradient that darkens toward the bottom. Painted once
 * and never moved. It suggests an abyss without drawing a floor, and because
 * it only ever darkens the shipped ground it cannot lower any text's contrast.
 *
 * Marine snow — a drifting field of suspended flocs over the ramp — used to
 * live here too; it was retired (DESIGN.md §The water column). The ramp is
 * what remains, and it is static: no clock, no parallax, nothing for
 * `prefers-reduced-motion` to have to stop.
 *
 * @example
 * ```tsx
 * // The app ground, behind the balance header
 * <Main>
 *   <DepthBackground />
 *   <ScalesBackground variant="deepField" />
 * </Main>
 * ```
 */
import type { CSSProperties } from 'react';

import { useSemantic } from '../../theme/ThemeProvider';
import type { DepthBackgroundProps } from './types';

const groundStyle = (gradient: readonly string[]): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
  backgroundColor: gradient[0],
  backgroundImage: `linear-gradient(to bottom, ${gradient.join(', ')})`,
});

export function DepthBackground({ style, className }: DepthBackgroundProps) {
  const { water } = useSemantic();

  return (
    <div
      aria-hidden="true"
      style={{ ...groundStyle(water.gradient), ...style }}
      className={className}
    />
  );
}
