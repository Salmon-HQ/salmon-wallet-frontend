/**
 * @vitest-environment jsdom
 *
 * The water column's motion contract on the DOM.
 *
 * The load-bearing assertions are the two that are easy to regress silently:
 * **reduced motion must leave still water**, and **the drift must run on the
 * compositor** — an animation of `transform` rather than of
 * `background-position`, which would repaint a full-viewport layer every frame
 * and is exactly what DESIGN.md's degradation ladder forbids the extension.
 *
 * jsdom has none of `matchMedia`, `ResizeObserver`, or `Element.animate`, so
 * they are stubbed here. That the component checks for all three is itself
 * behaviour worth keeping: without them it must fall back to the static field
 * rather than to a half-animated one.
 */
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  depthDrift,
  depthFieldCycleMs,
  depthFieldTileHeight,
} from '../../../../shared/src/theme/depthField';

// The root `@salmon/shared` barrel drags React Native into a DOM test run, so
// it is replaced by the two real modules the component actually reads. Real,
// not fabricated: the point of the assertions below is that the drift comes
// out of the shipped tokens.
vi.mock('@salmon/shared', async () => ({
  ...(await import('../../../../shared/src/theme/depthField')),
  ...(await import('../../../../shared/src/theme/depthFieldBlizzard')),
  ...(await import('../../../../shared/src/theme/semantic')),
}));

import { DepthBackground } from './DepthBackground';

const COLUMN_WIDTH = 440;

interface StubAnimation {
  startTime: number | null;
  cancel: ReturnType<typeof vi.fn>;
}

interface Stub {
  animate: ReturnType<typeof vi.fn>;
  /** One entry per field created, in mount order. */
  animations: StubAnimation[];
}

function stubDom(prefersReduce: boolean): Stub {
  // A fresh object per call: the whole point of the shared clock is what
  // *different* fields are stamped with, so they may not be the same object.
  const animations: StubAnimation[] = [];
  const animate = vi.fn(() => {
    const animation: StubAnimation = { startTime: null, cancel: vi.fn() };
    animations.push(animation);
    return animation;
  });

  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: prefersReduce,
    addEventListener() {},
    removeEventListener() {},
  }));
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    writable: true,
    value: animate,
  });
  // jsdom lays nothing out, so the column has to be told how wide it is —
  // the loop's length is derived from that width.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => COLUMN_WIDTH,
  });

  return { animate, animations };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DepthBackground: the drift', () => {
  it('sinks — downward, one tile per loop, forever', () => {
    const { animate } = stubDom(false);
    render(<DepthBackground />);

    expect(animate).toHaveBeenCalledTimes(1);
    const [frames, options] = animate.mock.calls[0] as [
      Keyframe[],
      { duration: number; iterations: number; easing: string },
    ];
    const tile = depthFieldTileHeight(COLUMN_WIDTH);

    // Positive Y is down. Marine snow is snow because it falls.
    expect(frames[0].transform).toBe('translate3d(0, 0, 0)');
    expect(frames[1].transform).toBe(`translate3d(0, ${tile}px, 0)`);
    // Exactly one tile of travel is the only loop that lands on a copy of
    // itself, so it is the only one that repeats without a jump.
    expect(options.iterations).toBe(Infinity);
    expect(options.easing).toBe('linear');
    expect(options.duration).toBe(depthFieldCycleMs(tile));
    // And the chosen speed comes out the other end of that derivation.
    expect(tile / (options.duration / 1000)).toBeCloseTo(depthDrift.pxPerSecond);
  });

  it('rides transform, so the layer is composited and not repainted', () => {
    const { animate } = stubDom(false);
    render(<DepthBackground />);

    const [frames] = animate.mock.calls[0] as [Keyframe[]];
    for (const frame of frames) {
      expect(Object.keys(frame)).toEqual(['transform']);
    }
  });

  it('stops for prefers-reduced-motion, leaving the field exactly as it shipped', () => {
    const { animate } = stubDom(true);
    const { container } = render(<DepthBackground />);

    expect(animate).not.toHaveBeenCalled();
    // No parallax offset either — reduced motion reduces both.
    const snow = container.querySelector('div > div') as HTMLElement;
    expect(snow.style.translate).toBe('');
  });

  it('draws the blizzard field, heroes riding the same drifting layer', () => {
    stubDom(false);
    render(<DepthBackground />);
    // The heroes' soft radial fill is serialised into the one background
    // image — same data URI, same WAAPI drift, no second layer. The image
    // rides the styled component's class, so it is read from the injected
    // stylesheet rather than from an inline style.
    const css = Array.from(document.querySelectorAll('style'))
      .map((tag) => tag.textContent)
      .join('');
    expect(css).toContain('radialGradient');
  });

  it('gives every field one clock, so a wait over the app is not an event', () => {
    // The wait paints its own water column over the one already behind it
    // (DESIGN.md §The wait). Each field used to start its own WAAPI animation,
    // which begins at phase zero however long the field behind it has been
    // drifting — so the wait's arrival and its departure each swapped the snow
    // for a field at a different phase, and what that looks like is the dots
    // jumping. The phase is `timeline.currentTime − startTime`, so one shared
    // `startTime` is the whole fix.
    const { animations } = stubDom(false);
    render(<DepthBackground />);
    render(<DepthBackground />);

    expect(animations).toHaveLength(2);
    expect(animations[0].startTime).not.toBeNull();
    expect(animations[1].startTime).toBe(animations[0].startTime);

    // And the clock outlives the fields: the last one going does not reset it,
    // so the app's ground coming back after a wait picks the phase up where
    // the water left it.
    cleanup();
    render(<DepthBackground />);
    expect(animations).toHaveLength(3);
    expect(animations[2].startTime).toBe(animations[0].startTime);
  });

  it('draws nothing to move when the snow is turned off', () => {
    const { animate } = stubDom(false);
    render(<DepthBackground snow={false} />);
    expect(animate).not.toHaveBeenCalled();
  });
});
