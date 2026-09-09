import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { crestStops, type CrestShadow, type WavefrontPoint } from '@salmon/shared';

import { CREST_RASTER } from './constants';

/** The crest's box: a fixed raster, centred on the origin. */
export function crestBox(origin: WavefrontPoint) {
  return {
    width: CREST_RASTER,
    height: CREST_RASTER,
    left: origin.x - CREST_RASTER / 2,
    top: origin.y - CREST_RASTER / 2,
  };
}

/**
 * One crest of the front, drawn as a **refraction crest** rather than an
 * outline: across the thickness of the band the crown returns light and both
 * flanks fall into shadow — a raised ridge of water seen from directly above.
 * The profile is symmetric because a radial gradient is isotropic and therefore
 * cannot honestly express a light direction. The shape lives in
 * `@salmon/shared` `motion/crest`, shared with the DOM twin.
 *
 * `react-native-svg` has no `FeTurbulence` and no `FeDisplacementMap` (both
 * return `null` and warn) but `RadialGradient` is fully implemented, and a
 * gradient is all this needs: the ramp is what makes the band read as *relief*
 * where a hairline reads as an *outline*.
 *
 * Drawn once into a fixed `CREST_RASTER` box inside a `100×100` viewBox and
 * never redrawn — the parent `Animated.View` scales it to the front's real size,
 * so the vector work happens on mount and every frame after that is a layer
 * transform on the compositor. The
 * band is a *stroke* rather than a fill so the rasterised area is the band and
 * not the whole disc, and `userSpaceOnUse` makes a gradient offset and a
 * fraction of the front's radius the same number on both platforms.
 */
export function CrestArc({
  id,
  alpha,
  color,
  shadow,
}: {
  id: string;
  alpha: number;
  color: string;
  shadow: CrestShadow;
}) {
  const stops = crestStops(alpha, color, shadow);
  const inner = stops[0].offset;
  const outer = stops[stops.length - 1].offset;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="50">
          {stops.map((stop) => (
            <Stop
              key={stop.offset}
              offset={stop.offset}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </RadialGradient>
      </Defs>
      <Circle
        cx="50"
        cy="50"
        r={((inner + outer) / 2) * 50}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={(outer - inner) * 50}
      />
    </Svg>
  );
}
