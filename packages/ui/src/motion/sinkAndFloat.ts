/**
 * The sink and the float, on the DOM — the same verb `apps/mobile` draws with
 * Reanimated (`src/utils/sinkAndFloat.ts`), drawn here with the Web Animations
 * API.
 *
 * The verb: **leaving is sinking** — the outgoing content recedes to
 * `SINK_EXIT_SCALE` and drops `SINK_FLOAT_TRAVEL` accelerating on the `sink`
 * curve, its light going out with it — and **arriving is floating** — the
 * incoming content rises the same distance from `FLOAT_ENTER_SCALE` and comes
 * to rest on `settle`, no overshoot.
 *
 * Every number is `@salmon/shared`'s (`motion/sinkFloat`): the verb is drawn
 * twice and a number tuned on one side only is a number that has drifted.
 * Only the drawing lives here. As on mobile, travel and light run on different
 * curves — the travel damps to rest on `settle` while the light accelerates on
 * `sink` (Beer–Lambert: the light comes back slowly, then fast at the end).
 *
 * Reduce motion: both helpers return `undefined` and animate nothing, which is
 * the DOM twin of handing Reanimated no layout animation — an instant cut.
 */
import {
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  motionEasing,
} from '@salmon/shared';

/** Per-call overrides, for a consumer whose geometry wants its own numbers. */
export interface SinkFloatOptions {
  /** Travel distance in px. Defaults to {@link SINK_FLOAT_TRAVEL}. */
  distance?: number;
  /**
   * How deep this surface goes — the scale the float rises from and the sink
   * recedes to. Defaults to the content depths; chrome passes `CHROME_SCALE`.
   */
  scale?: number;
  /** Travel duration in ms — a `motionMs` token or a shared constant, never a literal. */
  durationMs?: number;
  /** Wait this long before the float begins. Defaults to 0. */
  delayMs?: number;
}

/** `Element.animate` is absent in jsdom and in very old engines. */
function canAnimate(element: Element | null | undefined): element is Element {
  return !!element && typeof (element as HTMLElement).animate === 'function';
}

/**
 * Entering half: arrive from depth. Returns the running `Animation`, or
 * `undefined` under reduce motion (a cut) or where WAAPI is absent.
 */
export function floatEntering(
  element: Element | null | undefined,
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): Animation | undefined {
  if (isReduceMotionEnabled || !canAnimate(element)) return undefined;
  const {
    durationMs = FLOAT_IN_MS,
    delayMs = 0,
    distance = SINK_FLOAT_TRAVEL,
    scale = FLOAT_ENTER_SCALE,
  } = options;

  return element.animate(
    [
      { opacity: 0, transform: `translateY(${distance}px) scale(${scale})`, easing: 'linear' },
      { opacity: 1, transform: 'translateY(0px) scale(1)' },
    ],
    {
      duration: durationMs,
      delay: delayMs,
      // Travel damps to rest on `settle`; the composited opacity below rides
      // the same clock on `sink`, which is why the light is a second animation.
      easing: motionEasing.settle.css,
      fill: 'backwards',
    }
  );
}

/**
 * The light half of the float — the opacity, on `sink`'s accelerating bezier.
 * Kept apart from {@link floatEntering} because one physical event runs on two
 * curves, exactly as it does on mobile.
 */
export function floatEnteringLight(
  element: Element | null | undefined,
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): Animation | undefined {
  if (isReduceMotionEnabled || !canAnimate(element)) return undefined;
  const { durationMs = FLOAT_IN_MS, delayMs = 0 } = options;

  return element.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: durationMs,
    delay: delayMs,
    easing: motionEasing.sink.css,
    fill: 'backwards',
  });
}

/**
 * Exiting half: go away from the viewer. Returns the running `Animation` so a
 * caller can await `finished` before unmounting, or `undefined` for a cut.
 */
export function sinkExiting(
  element: Element | null | undefined,
  isReduceMotionEnabled: boolean,
  options: SinkFloatOptions = {}
): Animation | undefined {
  if (isReduceMotionEnabled || !canAnimate(element)) return undefined;
  const {
    durationMs = SINK_OUT_MS,
    delayMs = 0,
    distance = SINK_FLOAT_TRAVEL,
    scale = SINK_EXIT_SCALE,
  } = options;

  return element.animate(
    [
      { opacity: 1, transform: 'translateY(0px) scale(1)' },
      { opacity: 0, transform: `translateY(${distance}px) scale(${scale})` },
    ],
    {
      duration: durationMs,
      delay: delayMs,
      easing: motionEasing.sink.css,
      fill: 'forwards',
    }
  );
}
