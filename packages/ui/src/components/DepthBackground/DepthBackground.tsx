/**
 * DepthBackground — the water column's ground: a depth ramp and marine snow.
 *
 * The DOM half of the pair; `apps/mobile` draws the same field through
 * `react-native-svg`. Both read `marineSnow` / `depthFieldTile` and the
 * `water` tokens from `@salmon/shared`, so neither platform owns the drawing.
 * The rationale for the geometry lives beside the data in
 * `packages/shared/src/theme/depthField.ts`.
 *
 * Two layers:
 *
 *  - the **ramp**, a vertical gradient that darkens toward the bottom. Painted
 *    once and never moved. It suggests an abyss without drawing a floor, and
 *    because it only ever darkens the shipped ground it cannot lower any
 *    text's contrast.
 *  - the **snow**, a field of suspended flocs across the whole ground. It is
 *    what gives the deep field's 3.2× scales a scale to be read against, and
 *    it runs to the bottom because an animal that fills the frame is not cut
 *    off at the chest. The Scales Exclusion Rule still holds and is now held
 *    the way it is meant to be: the content on top of the field is opaque, so
 *    the motif is never *readable* behind a value.
 *
 * **Motion.** The snow sinks, continuously, at `depthDrift.pxPerSecond`, and
 * it sinks faster for as long as a scroll is under way — see `depthDrift` for
 * why those two numbers are what they are. Both offsets land on one layer:
 * the drift on `transform` (a Web Animations API animation, so the whole loop
 * lives in the compositor and never touches JS after it starts), the scroll
 * on the separate `translate` property, which the engine composes into the
 * same matrix. Adding them, rather than letting one replace the other, is the
 * point: the hand speeds the water up, it does not take it over.
 *
 * The loop is exactly one tile of travel, which is the only displacement that
 * lands the field back on a copy of itself — the wrap is invisible because the
 * pixels either side of it are the same pixels. Two spare tiles hang above the
 * top of the column so the combined offset always has drawing behind it.
 *
 * Performance. The snow is one `background-image` with `repeat-y`, not one
 * live SVG node per floc: DESIGN.md requires the extension's deep field to be
 * composited once rather than repainted as a full-viewport SVG, and this keeps
 * that true *while moving* — an animated `transform` re-composites a layer the
 * browser already rasterised, where a `background-position` animation would
 * have repainted it every frame. The geometry is a constant, so the data URI
 * is computed once at module scope.
 *
 * `prefers-reduced-motion: reduce` stops both the drift and the parallax, and
 * what is left is exactly the field as it shipped: still water. Nothing runs
 * while the tab or side panel is hidden — `visibilitychange` pauses the
 * animation rather than letting a background tab spend battery on water
 * nobody is looking at.
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
import { useEffect, useRef } from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import {
  depthDrift,
  depthFieldCycleMs,
  depthFieldTileHeight,
  marineSnowSvg,
  semantic,
  wrapDepthOffset,
} from '@salmon/shared';
import type { DepthBackgroundProps } from './types';

const { water } = semantic;

/**
 * The field, serialised once. `#` has to be escaped inside a data URI even
 * when the rest is left readable, and the token is an `rgba()` so there is
 * none — `encodeURIComponent` is used anyway because the colour is a token
 * and a future hex value must not silently truncate the document.
 */
const SNOW_URL = `url("data:image/svg+xml,${encodeURIComponent(marineSnowSvg(water.snow))}")`;

/**
 * Tiles of field hanging above the column. Two, because the drift and the
 * parallax ride separate CSS properties — `transform` and `translate` — so the
 * engine sums them after each has been wrapped into a tile of its own, and the
 * sum can reach two. Extra headroom costs nothing here: it is more of the same
 * repeating background, and the browser only rasterises what is on screen.
 */
const HEADROOM_TILES = 2;

const Ground = styled(Box)({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
  backgroundColor: water.gradient[0],
  backgroundImage: `linear-gradient(to bottom, ${water.gradient.join(', ')})`,
});

const Snow = styled('div')({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  // `top` is set from the measured tile height; until then the layer is
  // simply flush with the column, which is where the static field sat.
  top: 0,
  backgroundImage: SNOW_URL,
  backgroundRepeat: 'repeat-y',
  // Width-driven, so one uniform scale keeps the flocs round on any column;
  // `repeat-y` is what now guarantees the field reaches the bottom.
  backgroundSize: '100% auto',
  backgroundPosition: 'top center',
  willChange: 'transform',
});

export function DepthBackground({ snow = true, style, className }: DepthBackgroundProps) {
  const snowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = snowRef.current;
    const ground = el?.parentElement;
    if (!el || !ground) return;
    // No motion without all three: the reduced-motion signal we must obey, the
    // measurement the loop length is derived from, and a compositor animation.
    // Missing any of them leaves the field exactly as it shipped — still — and
    // still water is the correct fallback rather than a degraded animation.
    if (
      typeof window.matchMedia !== 'function' ||
      typeof ResizeObserver === 'undefined' ||
      typeof el.animate !== 'function'
    ) {
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let drift: Animation | null = null;
    let tile = 0;
    let scrollY = 0;
    let frame = 0;

    const layout = () => {
      tile = depthFieldTileHeight(ground.clientWidth);
      if (tile <= 0) return;
      el.style.top = `${-HEADROOM_TILES * tile}px`;
      drift?.cancel();
      drift = null;
      if (reduce.matches) {
        el.style.translate = '';
        return;
      }
      drift = el.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(0, ${tile}px, 0)` }],
        { duration: depthFieldCycleMs(tile), iterations: Infinity, easing: 'linear' }
      );
      if (document.hidden) drift.pause();
      applyParallax();
    };

    const applyParallax = () => {
      frame = 0;
      if (tile <= 0 || reduce.matches) return;
      // Content scrolled down by `scrollY` moves up; the far plane follows it
      // up, only a fifth as far. Wrapped into one tile so the offset always
      // has field behind it.
      el.style.translate = `0 ${wrapDepthOffset(-scrollY * depthDrift.parallaxFactor, tile)}px`;
    };

    // Scroll events do not bubble, but they do capture, so one listener on the
    // document catches whichever pane is actually scrolling without the mount
    // sites having to hand their scroller down to the background.
    const onScroll = (event: Event) => {
      const target = event.target;
      scrollY = target instanceof HTMLElement ? target.scrollTop : window.scrollY;
      if (!frame) frame = requestAnimationFrame(applyParallax);
    };

    const onVisibility = () => {
      if (document.hidden) drift?.pause();
      else drift?.play();
    };

    layout();
    const resize = new ResizeObserver(layout);
    resize.observe(ground);
    reduce.addEventListener('change', layout);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      drift?.cancel();
      resize.disconnect();
      reduce.removeEventListener('change', layout);
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [snow]);

  return (
    <Ground aria-hidden="true" style={style} className={className}>
      {snow && <Snow ref={snowRef} />}
    </Ground>
  );
}
