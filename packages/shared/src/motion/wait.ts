/**
 * The wait's shared numbers — what both `LoadingScreen` twins spend from so
 * the mark presses the same depth and the loops start on the same beat on
 * every platform.
 */

import { FLOAT_DELAY_MS, FLOAT_IN_MS } from './sinkFloat';

/**
 * When the content has landed, and the earliest the impact loop may begin.
 *
 * The beat is intrinsic to the wait (DESIGN.md §Motion, "The wait owns its
 * passage, end to end"): the cluster's float waits out `FLOAT_DELAY_MS` after
 * mount, so a caller that sank to make room keeps the double gesture for free
 * and never delays the wait itself — doing so would double-count the beat.
 * The float therefore ends one beat *plus* one float after the overlay mounts,
 * and the mark cannot press into a surface it has not landed on yet.
 */
export const CONTENT_LANDS_MS = FLOAT_DELAY_MS + FLOAT_IN_MS;

/**
 * How far the mark presses into the surface, and how much light it loses down
 * there.
 *
 * **A scale-down on its own does not read as an impact** — the same shrink
 * describes an object simply moving away from the eye. Two things separate the
 * two readings, and both are compositor-only: the mark **dims** as it goes
 * under, because water above a thing is water that takes its light, and it goes
 * down eight times faster than it comes back up, which is the profile of
 * something struck rather than something travelling. The wave leaving at the
 * bottom of it is the third.
 */
export const MARK_SINK_SCALE = 0.05;
export const MARK_SINK_DIM = 0.12;

/**
 * The tallest tip the block reserves room for. Tips rotate and are not all the
 * same length; sized by its content the block grew upward from its bottom
 * anchor, so the label above it travelled every time the text changed line
 * count. Reserving the tallest case keeps the label still.
 */
export const MAX_TIP_LINES = 3;
