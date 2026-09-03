/**
 * @vitest-environment jsdom
 */
import {
  FLOAT_ENTER_SCALE,
  FLOAT_IN_MS,
  SINK_EXIT_SCALE,
  SINK_FLOAT_TRAVEL,
  SINK_OUT_MS,
  motionEasing,
} from '@salmon/shared';
import { describe, expect, it, vi } from 'vitest';

import { floatEntering, floatEnteringLight, sinkExiting } from './sinkAndFloat';

/** jsdom ships no Web Animations API, so the element carries a stub. */
function elementWithAnimate() {
  const animate = vi.fn(() => ({}) as Animation);
  const element = document.createElement('div');
  (element as unknown as { animate: unknown }).animate = animate;
  return { element, animate };
}

describe('the sink and the float on the DOM', () => {
  it('floats in from the shared depth, on the shared clock', () => {
    const { element, animate } = elementWithAnimate();

    floatEntering(element, false);

    const [frames, options] = animate.mock.calls[0] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(frames[0].transform).toBe(
      `translateY(${SINK_FLOAT_TRAVEL}px) scale(${FLOAT_ENTER_SCALE})`
    );
    expect(frames[1].transform).toBe('translateY(0px) scale(1)');
    expect(options.duration).toBe(FLOAT_IN_MS);
    expect(options.easing).toBe(motionEasing.settle.css);
  });

  it('brings the light back on the accelerating curve, not the travel one', () => {
    const { element, animate } = elementWithAnimate();

    floatEnteringLight(element, false);

    const [, options] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(options.easing).toBe(motionEasing.sink.css);
  });

  it('sinks away to the shared depth on the shared exit clock', () => {
    const { element, animate } = elementWithAnimate();

    sinkExiting(element, false);

    const [frames, options] = animate.mock.calls[0] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(frames[1].transform).toBe(
      `translateY(${SINK_FLOAT_TRAVEL}px) scale(${SINK_EXIT_SCALE})`
    );
    expect(options.duration).toBe(SINK_OUT_MS);
    expect(options.easing).toBe(motionEasing.sink.css);
  });

  it('takes the caller overrides', () => {
    const { element, animate } = elementWithAnimate();

    sinkExiting(element, false, { distance: 4, scale: 0.5, durationMs: 100, delayMs: 20 });

    const [frames, options] = animate.mock.calls[0] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(frames[1].transform).toBe('translateY(4px) scale(0.5)');
    expect(options.duration).toBe(100);
    expect(options.delay).toBe(20);
  });

  it('animates nothing under reduce motion — the swap is a cut', () => {
    const { element, animate } = elementWithAnimate();

    expect(floatEntering(element, true)).toBeUndefined();
    expect(floatEnteringLight(element, true)).toBeUndefined();
    expect(sinkExiting(element, true)).toBeUndefined();
    expect(animate).not.toHaveBeenCalled();
  });

  it('a float cancels the sink the element is still holding, before it starts', () => {
    // A sink holds opacity 0 (`fill: forwards`); a float drops its own effect
    // when it ends (`fill: backwards`). Without the cancel, the float ends by
    // handing the element back to the sink — invisible.
    const { element, animate } = elementWithAnimate();
    const cancel = vi.fn();
    (element as unknown as { getAnimations: () => Animation[] }).getAnimations = () => [
      { cancel } as unknown as Animation,
    ];

    floatEntering(element, false);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(animate.mock.invocationCallOrder[0]);

    floatEnteringLight(element, false);
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('animates nothing where the Web Animations API is absent', () => {
    expect(floatEntering(document.createElement('div'), false)).toBeUndefined();
    expect(sinkExiting(null, false)).toBeUndefined();
  });
});
