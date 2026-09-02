/**
 * WaterColumn — the app ground, everywhere it is allowed to be.
 *
 * The two layers that make the ground water rather than a colour: the depth
 * ramp (`DepthBackground`), and the deep field of scales
 * (`ScalesBackground variant="deepField"`) read against it. They were mounted
 * as a pair on the home ground of each app; they are a pair everywhere,
 * because the motif belongs to the water and not to a screen. What changes
 * from screen to screen is what rests on top of it.
 *
 * **Where it must not go**, and these are rules rather than preferences:
 *
 *  - **Seed-phrase views** and the **dApp approval screen**. The Bedrock Rule
 *    pins both to `surface.bedrock`, opaque, with no scales, no caustic and no
 *    iridescence. A screen that asks the user to trust it must not show
 *    anything living through itself.
 *  - **Behind a translucent surface.** The Scales Exclusion Rule holds by
 *    occlusion: content is opaque and covers the motif where the numbers are.
 *    A membrane is the one translucent plane, so the field never goes behind
 *    one — a membrane's sanctioned share of the motif is the 24px refraction
 *    strip on its own top edge.
 *
 * Cost. Both layers are CSS backgrounds — one serialised data URI each,
 * composited once — never live SVG the browser can be asked to repaint on
 * scroll, which is what the degradation ladder forbids the extension. Mounting
 * the ground on more screens therefore costs pixels in a layer that a screen
 * already has, not a compositor layer per screen. Nothing here animates.
 *
 * Stacking. The layers sit at `zIndex: -1`, so a host needs no per-child
 * `zIndex` — it only has to establish a stacking context, which is what
 * `waterColumnHost` is for. A negative layer inside a stacking context paints
 * above the host's own background and below all of its content.
 *
 * @example
 * ```tsx
 * const Container = styled(Box)({ ...waterColumnHost });
 *
 * <Container>
 *   <WaterColumn />
 *   ...
 * </Container>
 * ```
 */
import { DepthBackground } from '../DepthBackground';
import { ScalesBackground } from '../ScalesBackground';

/**
 * What a surface must be for `WaterColumn` to sit inside it: a stacking
 * context, so the negative layer stays above the host's own background.
 */
export const waterColumnHost = {
  position: 'relative',
  isolation: 'isolate',
} as const;

const LAYER = { zIndex: -1 } as const;

export function WaterColumn() {
  return (
    <>
      <DepthBackground style={LAYER} />
      <ScalesBackground variant="deepField" style={LAYER} />
    </>
  );
}
