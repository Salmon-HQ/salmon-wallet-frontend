/** The mobile wait's own numbers; the cross-platform ones live in `@salmon/shared` `motion/wait`. */

import { componentSizes, crestTrain, spacing } from '@salmon/shared';

/**
 * Diameter of the mark that emits the wave, px. It was 56 and sat a third of
 * the way down the screen; product, 2026-08, wants the emitter *nailed in the
 * middle of the phone and bigger*, because the origin of a radial front is the
 * one thing on a wait screen that may not be off-centre.
 */
export const MARK_SIZE = componentSizes.markHero;
/** Clear space between the mark's edge and the first word under it. */
export const MARK_TO_WORDS = spacing['3xl'];

/** The crests alive at once, resolved once at module load. */
export const CRESTS = crestTrain();

/**
 * The tip block's reserved geometry.
 *
 * Tips rotate, and they are not all the same length. Sized by its content the
 * block grew upward from its bottom anchor, so the label above it travelled
 * every time the text changed line count. Reserving the tallest case
 * (`MAX_TIP_LINES`, shared) keeps the label still and lets the sentence use
 * the room below it.
 */
export const TIP_LINE_HEIGHT = 20;
/** The label's own line plus the gap under it. */
export const TIP_LABEL_BLOCK_HEIGHT = 16 + spacing.sm;

/**
 * Side of the box each crest is *rasterised* into, pt.
 *
 * The DOM twin can lay the crest out at the front's full final diameter because
 * a browser composites a gradient layer with a shader. `react-native-svg` does
 * not: `RNSVGSvgView` is a UIView that draws into a backing store the size of
 * its bounds, so a crest laid out at the screen diagonal would allocate roughly
 * `(1000pt × 3)² × 4B ≈ 36MB` — per crest, on every wait, on every screen. The
 * crest is drawn into a fixed 512pt box instead and the scale is multiplied by
 * `ringSize / CREST_RASTER` to reach the same final size, which costs ~9MB and
 * looks identical: the sharpest feature in the band is the light-to-shadow ramp,
 * and a smooth ramp upscaled by a compositor is still a smooth ramp.
 */
export const CREST_RASTER = 512;
