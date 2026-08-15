/**
 * ScalesBackground - Repeating fish scales pattern background
 *
 * Web version using standard HTML SVG elements for browser extension
 */
import { useId } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { semantic } from '@salmon/shared';
import type { ScalesBackgroundProps, ScalesVariant } from './types';

const { scales } = semantic;

/** The drawing's native tile height. Every scale is a multiple of it. */
const NATIVE_TILE = 26;

/**
 * Per-appearance defaults. The old component had one look — a near-black
 * stroke measured at 1.068:1 against its own ground, i.e. arithmetically
 * absent — tiled edge to edge as wallpaper. Each variant now has a job, a
 * distance, and a stroke that is actually visible at that distance.
 */
const VARIANTS: Record<
  ScalesVariant,
  { stroke: string; scale: number; height?: number; fade: boolean }
> = {
  deepField: {
    stroke: scales.deepFieldStroke,
    scale: scales.deepFieldScale,
    height: scales.deepFieldHeight,
    // Dissolves as the eye travels down, so it never reaches a row.
    fade: true,
  },
  fish: {
    stroke: scales.fishStroke,
    scale: scales.fishScale,
    fade: false,
  },
};

const Container = styled(Box)<{ $topOffset: number; $height?: number; $fade: boolean }>(
  ({ $topOffset, $height, $fade }) => ({
    position: 'absolute',
    top: $topOffset,
    left: 0,
    right: 0,
    ...($height === undefined ? { bottom: 0 } : { height: $height }),
    pointerEvents: 'none',
    ...($fade
      ? {
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
        }
      : {}),
  })
);

/**
 * ScalesBackground - the seigaiha fish-scale motif, at one of its three scales.
 *
 * Density is a depth cue: `deepField` is the far water behind the balance
 * header, `fish` is the material of the primary call-to-action's own body.
 * The motif is never wallpaper — see `The Scales Exclusion Rule`: it goes
 * behind no number, no list row, no address, no seed phrase, no approval
 * sheet, and no input.
 *
 * @example
 * ```tsx
 * // The far water behind a balance header
 * <ScalesBackground variant="deepField" />
 *
 * // The material inside a salmon fill
 * <ScalesBackground variant="fish" />
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
  // Unique per instance: two ScalesBackgrounds in one document sharing a
  // hardcoded `id` would both resolve to whichever pattern rendered first,
  // so a `fish` inside a button would silently inherit the deep field.
  const patternId = useId();
  const config = VARIANTS[variant];
  const stroke = strokeColor ?? config.stroke;
  // The paths are drawn at the native tile size, so a scale is a
  // `patternTransform` — stretching the tile height alone would shear the
  // drawing instead of moving it away from the eye. `patternHeight` stays
  // supported for callers that set the tile height directly.
  const tile = patternHeight ?? NATIVE_TILE;
  // 1px is the only stroke weight for a boundary in this system, and the
  // pattern transform would otherwise multiply it — a 3.2px line at the far
  // end of the column reads as a graphic, not as water.
  const renderedStrokeWidth = strokeWidth / config.scale;

  return (
    <Container
      $topOffset={topOffset}
      $height={config.height}
      $fade={config.fade}
      style={style}
      className={className}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={822}
            height={tile}
            patternTransform={`scale(${config.scale})`}
          >
            {/* Row 1 - Left half */}
            <path
              d="M15.0858 13.8306C14.7343 1.01231 39.3378 -7.21907 43.5555 13.8306C44.9615 -1.01168 69.0729 -5.33023 72.7283 13.8307C73.0798 0.337654 96.4179 -6.40963 101.198 13.8307C101.55 2.02432 124.114 -7.75896 130.019 13.8307C131.425 -0.674348 154.904 -5.06029 158.84 13.8307C158.84 2.02432 181.476 -7.2861 187.662 13.4937C188.013 2.02432 210.297 -7.2861 216.483 13.4937C217.889 -0.674348 240.805 -5.12716 245.304 13.4937C246.007 0.000319639 269.556 -5.93676 273.774 13.4937C274.828 1.34966 296.409 -6.81383 302.595 13.1563C303.65 1.68699 325.512 -7.0837 331.416 13.1563C332.471 2.36166 353.489 -7.35356 360.238 13.1563C360.238 2.02432 383.365 -7.0837 388.707 13.1563C389.762 4.04833 410.288 -8.7029 417.88 13.1563"
              stroke={stroke}
              strokeWidth={renderedStrokeWidth}
              fill="none"
            />
            {/* Row 1 - Right half */}
            <path
              d="M417.881 13.5576C417.529 0.73936 442.133 -7.49202 446.35 13.5576C447.756 -1.28463 471.868 -5.60318 475.523 13.5577C475.875 0.0647045 499.213 -6.68258 503.993 13.5577C504.344 1.75137 526.909 -8.03191 532.814 13.5577C534.22 -0.947298 557.699 -5.33324 561.635 13.5577C561.635 1.75137 584.271 -7.55904 590.457 13.2207C590.808 1.75137 613.092 -7.55904 619.278 13.2207C620.684 -0.947298 643.6 -5.40011 648.099 13.2207C648.802 -0.27263 672.351 -6.20971 676.569 13.2207C677.623 1.07671 699.204 -7.08678 705.39 12.8834C706.445 1.41404 728.307 -7.35664 734.211 12.8834C735.266 2.08871 756.284 -7.62651 763.033 12.8834C763.033 1.75137 786.16 -7.35664 791.502 12.8834C792.557 3.77538 813.083 -8.97585 820.675 12.8834"
              stroke={stroke}
              strokeWidth={renderedStrokeWidth}
              fill="none"
            />
            {/* Row 2 - Left half (offset) */}
            <path
              d="M0.678533 26.3765C0.327098 13.5582 24.9305 5.32683 29.1483 26.3765C30.5542 11.5342 54.6657 7.21566 58.321 26.3766C58.6725 12.8836 82.0107 6.13627 86.7908 26.3766C87.1423 14.5702 109.707 4.78693 115.612 26.3766C117.018 11.8716 140.497 7.48561 144.433 26.3766C144.433 14.5702 167.068 5.2598 173.255 26.0396C173.606 14.5702 195.89 5.2598 202.076 26.0396C203.482 11.8716 226.398 7.41874 230.897 26.0396C231.6 12.5462 255.149 6.60914 259.367 26.0396C260.421 13.8956 282.002 5.73207 288.188 25.7022C289.242 14.2329 311.104 5.4622 317.009 25.7022C318.064 14.9076 339.082 5.19234 345.83 25.7022C345.83 14.5702 368.958 5.4622 374.3 25.7022C375.355 16.5942 395.881 3.843 403.473 25.7022"
              stroke={stroke}
              strokeWidth={renderedStrokeWidth}
              fill="none"
            />
            {/* Row 2 - Right half (offset) */}
            <path
              d="M403.473 26.1035C403.122 13.2853 427.725 5.05388 431.943 26.1035C433.349 11.2613 457.461 6.94271 461.116 26.1036C461.467 12.6106 484.806 5.86332 489.586 26.1036C489.937 14.2973 512.502 4.51399 518.407 26.1036C519.813 11.5986 543.292 7.21266 547.228 26.1036C547.228 14.2973 569.863 4.98685 576.049 25.7666C576.401 14.2973 598.685 4.98685 604.871 25.7666C606.277 11.5986 629.193 7.14579 633.692 25.7666C634.395 12.2733 657.944 6.33619 662.162 25.7666C663.216 13.6226 684.797 5.45912 690.983 25.4293C692.037 13.9599 713.899 5.18925 719.804 25.4293C720.859 14.6346 741.877 4.91939 748.625 25.4293C748.625 14.2973 771.753 5.18925 777.095 25.4293C778.15 16.3213 798.676 3.57005 806.268 25.4293"
              stroke={stroke}
              strokeWidth={renderedStrokeWidth}
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </Container>
  );
}
