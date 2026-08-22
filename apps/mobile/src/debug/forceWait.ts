/**
 * TEMPORARY wait-preview switch — for judging the loading screen's motion.
 *
 * Turn on: flip `DEBUG_FORCE_WAIT` to `true` below, save, let Fast Refresh
 * reload. The wait mounts over the whole app and stays up forever, looping its
 * wave train, so the motion can be watched and tuned instead of glimpsed
 * during a real load.
 * Turn off: flip it back to `false` (the shipped/default value).
 *
 * Why a flag rather than a route: the wait is a full-screen overlay mounted as
 * a sibling of the navigator, and that nesting is part of what is being judged
 * — a preview screen inside the navigator would not reproduce it.
 *
 * Delete this file once the wait's motion is signed off. It must never ship
 * enabled: with it on, the app is unusable.
 */
export const DEBUG_FORCE_WAIT = false;

/** What the preview shows. Only affects the preview. */
export const DEBUG_FORCE_WAIT_PROPS = {
  title: 'Unlocking Wallet',
  showTips: true,
} as const;
