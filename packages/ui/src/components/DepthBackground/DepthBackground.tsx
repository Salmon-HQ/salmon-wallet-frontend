/**
 * DepthBackground — the water column's ground: a depth ramp and marine snow.
 *
 * The DOM half of the pair; `apps/mobile` draws the same field through
 * `react-native-svg`. Both read `marineSnow` / `depthFieldTile` and the
 * `water` tokens from `@salmon/shared`, so neither platform owns the drawing.
 * The rationale for the geometry lives beside the data in
 * `packages/shared/src/theme/depthField.ts`.
 *
 * Two layers, both painted once and never animated:
 *
 *  - the **ramp**, a vertical gradient that darkens toward the bottom. It
 *    suggests an abyss without drawing a floor, and because it only ever
 *    darkens the shipped ground it cannot lower any text's contrast.
 *  - the **snow**, a field of suspended flocs in the top `depthFieldTile`
 *    of the ground, fading to nothing before it reaches a data row. It is what
 *    gives the deep field's 3.2× scales a scale to be read against.
 *
 * Performance. The snow is a serialised `background-image`, not 95 live SVG
 * nodes: DESIGN.md requires the extension's deep field to be composited once
 * rather than repainted as a full-viewport SVG, and an image layer satisfies
 * that on web, extension, and any future DOM target without a build step. The
 * geometry is a constant, so the data URI is computed once at module scope.
 * `background-size: auto <height>` scales the field by height alone, which
 * keeps the flocs round on any column width; the field is authored wider than
 * the widest column (430px) so the crop never runs out of drawing.
 *
 * Motion. There is none, deliberately. Real marine snow sinks at roughly
 * 0.6 mm/s — it does not visibly fall — and a drifting full-viewport layer
 * would be a permanent compositor layer on every screen, on low-end Android
 * and in the MV3 side panel, for an effect nobody would notice. It would also
 * spend ambient motion in a system whose only light event is The Surfacing.
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
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import { depthFieldTile, marineSnowSvg, semantic } from '@salmon/shared';
import type { DepthBackgroundProps } from './types';

const { water } = semantic;

/**
 * The field, serialised once. `#` has to be escaped inside a data URI even
 * when the rest is left readable, and the token is an `rgba()` so there is
 * none — `encodeURIComponent` is used anyway because the colour is a token
 * and a future hex value must not silently truncate the document.
 */
const SNOW_URL = `url("data:image/svg+xml,${encodeURIComponent(marineSnowSvg(water.snow))}")`;

const Ground = styled(Box)<{ $snow: boolean }>(({ $snow }) => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundColor: water.gradient[0],
  ...($snow
    ? {
        backgroundImage: `${SNOW_URL}, linear-gradient(to bottom, ${water.gradient.join(', ')})`,
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundPosition: 'top center, top left',
        backgroundSize: `auto ${depthFieldTile.height}px, 100% 100%`,
      }
    : {
        backgroundImage: `linear-gradient(to bottom, ${water.gradient.join(', ')})`,
      }),
}));

export function DepthBackground({ snow = true, style, className }: DepthBackgroundProps) {
  return <Ground $snow={snow} aria-hidden="true" style={style} className={className} />;
}
