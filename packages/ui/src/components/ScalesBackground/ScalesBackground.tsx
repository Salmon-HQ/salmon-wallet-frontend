/**
 * ScalesBackground - Repeating fish scales pattern background
 *
 * Web version. The seigaiha tile is serialised into a `background-image` data
 * URI rather than mounted as a live `<svg><pattern>`: the field now runs the
 * full height of whatever it is mounted in, and DESIGN.md's degradation ladder
 * forbids the extension from carrying a full-viewport SVG the browser can be
 * asked to repaint. A repeating background image is composited once, and it
 * also removes the `<pattern id>` collision that two live instances in one
 * document used to risk.
 */
import { useMemo } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { seigaihaTile, seigaihaTiledPaths, semantic } from '@salmon/shared';
import type { ScalesBackgroundProps, ScalesVariant } from './types';

const { scales } = semantic;

/**
 * Per-appearance defaults. The old component had one look — a near-black
 * stroke measured at 1.068:1 against its own ground, i.e. arithmetically
 * absent — tiled edge to edge as wallpaper. Each variant now has a job, a
 * distance, and a stroke that is actually visible at that distance.
 */
const VARIANTS: Record<
  ScalesVariant,
  { stroke: string; scale: number; fade: boolean; fadeFloor: number }
> = {
  deepField: {
    stroke: scales.deepFieldStroke,
    scale: scales.deepFieldScale,
    // Thins as the eye travels down, to `deepFieldFloor` rather than to
    // nothing: the field is the column's texture, and the column has no
    // bottom edge in the middle of the screen.
    fade: true,
    fadeFloor: scales.deepFieldFloor,
  },
  fish: {
    stroke: scales.fishStroke,
    scale: scales.fishScale,
    fade: false,
    fadeFloor: 1,
  },
  /**
   * The refraction strip — the top edge of every thermocline surface. The
   * sweep must run across the whole band, so it cannot be the tile's own
   * stroke (it would restart inside every repeat): the tile is drawn in white
   * and used as a mask over one full-width horizontal gradient.
   */
  refraction: {
    stroke: '#FFFFFF',
    scale: scales.refractionScale,
    fade: false,
    fadeFloor: 1,
  },
  /**
   * The membrane field — the thermocline's own texture, edge to edge. Same
   * 0.5× geometry as the refraction strip but a flat *dark* ink (owner,
   * 2026-08-19: dark scales, one continuous field, no brighter band).
   */
  membrane: {
    stroke: scales.membraneFieldStroke,
    scale: scales.refractionScale,
    fade: false,
    fadeFloor: 1,
  },
};

/** `background-image` for the refraction band: the horizontal sweep. */
function refractionSweep(): string {
  return `linear-gradient(to right, ${scales.refractionSweep.join(', ')})`;
}

/**
 * One tile as an SVG document, sized so the browser tiles it at `scale`.
 *
 * The paths are drawn at the native tile size and the whole document is
 * scaled, rather than the tile being stretched — stretching would shear the
 * drawing instead of moving it away from the eye. 1px is the only stroke
 * weight for a boundary in this system, so the authored width is divided by
 * the scale to survive the multiplication.
 *
 * `seigaihaTiledPaths` rather than the bare drawing: a `viewBox` crops the
 * same way a pattern cell does, so the curves that run past an edge are drawn
 * again a tile over, where they re-enter. The browser would not need that for
 * a live `<svg>` with `overflow: visible`, but it does need it here — and it
 * is the same data mobile draws, which is the point.
 */
function tileUrl(stroke: string, strokeWidth: number, scale: number, tile: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${seigaihaTile.width * scale}" height="${tile * scale}" viewBox="0 0 ${seigaihaTile.width} ${tile}">` +
    seigaihaTiledPaths
      .map(
        (d) =>
          `<path d="${d}" stroke="${stroke}" stroke-width="${strokeWidth / scale}" fill="none"/>`
      )
      .join('') +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const Container = styled(Box)<{
  $topOffset: number;
  $image: string;
  $fade: boolean;
  $floor: number;
  $sweep: boolean;
}>(({ $topOffset, $image, $fade, $floor, $sweep }) => ({
  position: 'absolute',
  top: $topOffset,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  // The refraction band inverts the roles: the sweep gradient is the paint
  // and the white-stroked tile is the mask, so the gradient runs unbroken
  // across the whole band instead of restarting per repeat.
  backgroundImage: $sweep ? refractionSweep() : $image,
  backgroundRepeat: 'repeat',
  ...($sweep
    ? {
        maskImage: $image,
        maskRepeat: 'repeat',
        WebkitMaskImage: $image,
        WebkitMaskRepeat: 'repeat',
      }
    : {}),
  ...($fade
    ? {
        maskImage: `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,${$floor}) 100%)`,
        WebkitMaskImage: `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,${$floor}) 100%)`,
      }
    : {}),
}));

/**
 * ScalesBackground - the seigaiha fish-scale motif, at one of its three scales.
 *
 * Density is a depth cue: `deepField` is the far water of the column, `fish`
 * is the material of the primary call-to-action's own body. The field fills
 * whatever it is mounted in and thins downward; *where* the motif may appear
 * is decided by the parent it is mounted in, which is what makes The Scales
 * Exclusion Rule structural rather than conventional. The rule is about
 * readability, not about leaving ground blank: the motif goes behind no
 * number, row, address, seed phrase, input or approval sheet because the
 * content on those surfaces is opaque and covers it.
 *
 * @example
 * ```tsx
 * // The far water of the app ground
 * <ScalesBackground variant="deepField" />
 * ```
 */
export function ScalesBackground({
  variant = 'deepField',
  strokeColor,
  strokeWidth = 1,
  patternHeight,
  topOffset = 0,
  style,
  className,
}: ScalesBackgroundProps) {
  const config = VARIANTS[variant];
  const stroke = strokeColor ?? config.stroke;
  // `patternHeight` stays supported for callers that set the tile height.
  const tile = patternHeight ?? seigaihaTile.height;
  const image = useMemo(
    () => tileUrl(stroke, strokeWidth, config.scale, tile),
    [stroke, strokeWidth, config.scale, tile]
  );

  return (
    <Container
      $topOffset={topOffset}
      $image={image}
      $fade={config.fade}
      $floor={config.fadeFloor}
      $sweep={variant === 'refraction'}
      style={style}
      className={className}
    />
  );
}
