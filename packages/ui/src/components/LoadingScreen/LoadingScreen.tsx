/**
 * LoadingScreen — the wait, on the app's own ground.
 *
 * Emotion keyframes + styled(), with every ink read off the live mode via
 * `useSemantic()` and handed down as `$` props — the same tokens the mobile
 * twin (`apps/mobile/src/components/LoadingScreen`) reads.
 *
 * The choreography, and the one idea it is built on: **the wait goes down and
 * the success comes up.** A wait may not compete with the receipt — it is
 * given the opposite *direction* instead, which costs nothing and makes the two
 * screens read as one sequence.
 *
 * - **The mark is the emitter**, and it is pinned to the centre of whatever this
 *   overlay occupies, at `MARK_SIZE`. A wave with no visible source is four
 *   things twitching, and a radial front whose origin is off-centre reads as a
 *   wave from somewhere else.
 * - **The descent was removed** (product, 2026-08). It was a 2px × 120px
 *   vertical track with a salmon segment running down it, and it read as a
 *   *progress bar* — but no caller has ever passed progress and this component
 *   has never had a `progress` prop, so it claimed a completion percentage it
 *   did not have. On a pending on-chain transaction there is no percentage to
 *   claim. It was also the one element that would not ride the wave, so it put a
 *   second motion vocabulary on the same screen as the front. The Harrison, Yeo
 *   & Hudson (CHI 2010) argument it carried — that a decelerating augmentation
 *   makes a wait read shorter — is now carried by the front itself, which
 *   crosses once per `pulseCycle` and then rests.
 * - **The mark sinks, and the front is born at the trough.** It presses *into*
 *   the surface rather than swelling off it: quick down (`flick`), slow and
 *   monotonic back up (`tide`), and the ring is emitted at the moment of impact
 *   — `animation-delay: WAVEFRONT_SINK_MS` — rather than running on a parallel
 *   timer. _(Product, 2026-08: "El logo sigue saltando y bajando, no bajando y
 *   volviendo a su lugar.")_
 * - **Nothing rides the front.** The title, subtitle and tips are stationary.
 *   _(Product, 2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
 *   también, cuando te dije que no debería.")_
 * - **The wave** (`waves`, on by default) is the disturbed water. It loops for
 *   as long as the wait lasts and the exit waits for the front to leave the
 *   screen (`onExited`). The arithmetic is in `@salmon/shared`
 *   `motion/wavefront`, shared with the React Native twin, so the two platforms
 *   cannot drift and the timing is testable without a frame clock.
 * - **The wait owns its passage.** Everything it owns — mark, words, tips —
 *   floats up into place as the overlay fades in, and the beat is *intrinsic*:
 *   the cluster waits out `FLOAT_DELAY_MS` inside this component, so a caller
 *   that sank to make room keeps the double gesture for free and call sites
 *   pass nothing. The impact loop waits out that beat plus one float before its
 *   first press — the mark cannot press into a surface it has not landed on.
 *   On the way out the same content sinks on the overlay's own closing ramp, so
 *   the wait leaves as one gesture with the departing wave. The crests stay
 *   outside the travelling cluster: the water is the ground, and the ground
 *   never travels. (DESIGN.md §Motion, "The wait owns its passage, end to end".)
 * - **Tips are on by default** — see `LoadingScreenBaseProps.showTips`.
 * - **A wait lasts at least `motionMs.waitFloor`**, whether or not the work
 *   behind it has already finished. The floor is spent with the crest still
 *   looping, and only then is the exit planned — see the visibility effect.
 */
import { memo, useCallback, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_LANDS_MS,
  DEFAULT_WALLET_TIP_KEYS,
  durationMs,
  crestTrain,
  markPaths,
  markViewBoxAttr,
  motionMs,
  planWavefrontExit,
  useWaitTips,
  wavefrontExitMs,
  wavefrontRadius,
  WAVEFRONT_CROSS_MS,
} from '@salmon/shared';
import { WaterColumn } from '../WaterColumn';
import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useTaskChrome } from '../../contexts/TaskChromeContext';
import {
  Cluster,
  Crest,
  Emitter,
  Mark,
  Overlay,
  Subtitle,
  TipLabel,
  TipText,
  TipsContainer,
  Title,
  Words,
  tipsAnchor,
} from './styled';
import type { LoadingScreenProps } from './types';

// ============================================================================
// Component
// ============================================================================

/**
 * LoadingScreen component - Animated loading overlay
 *
 * @example
 * ```tsx
 * <LoadingScreen
 *   visible={isLoading}
 *   title="Loading Wallet"
 *   subtitle="Please wait..."

 * />
 * ```
 */
export const LoadingScreen = memo(function LoadingScreen({
  visible,
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIP_KEYS as unknown as string[],
  tipInterval = 4000,
  showTips = true,
  // Every wait is water. `waves` used to default to `false` and be passed only
  // by the transaction wait; product hit the account-recovery wait (2026-08) and
  // found it bare. The treatment is the wait now, not a decoration one screen
  // opts into. The prop survives so `bedrock` — and any future surface that must
  // show nothing living through itself — can still opt out.
  waves = true,
  bedrock = false,
  onExited,
  surfaces = true,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const { accent, text, water } = useSemantic();
  const isReduceMotionEnabled = useReducedMotion();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // The Bedrock Rule: the dApp approval flow shows nothing living through
  // itself, and a pulsing mark throwing rings across the screen is the most
  // living thing in the app. It is the same opt-out the water column takes.
  const riding = waves && !bedrock;

  // State
  const [tipFading, setTipFading] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  /**
   * Committed by the render that asked for it, not one commit later — the
   * same render-phase set the native twin uses. Callers that keep the wait
   * mounted at `visible={false}` (the lock, the create-password step) used to
   * wait an extra commit for the overlay to appear.
   */
  if (visible && !isVisible) setIsVisible(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // The closing wave is in flight: the loop is cancelled, every rider is
  // leaving on its own delay, and the ground is holding until the front is off
  // the screen.
  const [isClosing, setIsClosing] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  /**
   * When the impact loop starts, so the exit can ask where the front is
   * without reading an animation off the compositor. The phase is
   * `(now − startedAt) % period`, which is all `planWavefrontExit` needs.
   *
   * It is the *delayed* start — the content floats in first — so the exit
   * arithmetic measures from the same instant the keyframes do and the
   * calm-water handoff stays honest.
   */
  const startedAtRef = useRef(0);
  /**
   * When the overlay came up, so the exit can spend the owner's floor
   * (`motionMs.waitFloor`) before it plans anything. Measured from the moment
   * the caller sees the wait appear, not from the loop's delayed start: the
   * floor is about how long the *screen* is up.
   */
  const shownAtRef = useRef(0);
  // Held in a ref so an inline callback cannot restart the exit timer on every
  // render — which would leave the screen up forever.
  // Every wait that ends is a surfacing: the shell floats its content back
  // when the water clears, and no call site has to remember to say so. The
  // lock screen opts out — see `surfaces`: its wait sits inside an overlay
  // that outlives it, so the surfacing belongs to the overlay's release.
  const { surface: surfaceShell } = useTaskChrome();
  const surface = useCallback(() => {
    if (surfaces) surfaceShell();
  }, [surfaces, surfaceShell]);
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  /**
   * True from the moment the exit is planned until the wait shows again, so an
   * exit is planned exactly once however many times this effect re-enters.
   *
   * The cleanup below clears both timers on ANY dependency change. Re-planning
   * the floor is idempotent — `floorMs` is computed from the absolute
   * `shownAtRef` — but re-planning after `planExit` has armed `exitTimer` is
   * not: it recomputes `elapsedMs` and `holdMs` from a fresh `Date.now()`,
   * rewrites `--wave-hold` mid-flight and re-arms the timer, so `onExited`
   * arrives late by up to a whole `exitMs`. Latent today, since none of the
   * dependencies can currently change during an exit; the native twin has
   * carried this guard since it was written (spec 031 §6).
   */
  const exitArmedRef = useRef(false);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // `isVisible` is set in the render phase — by the time this runs the
      // overlay is already committed.
      setIsFadingOut(false);
      setIsClosing(false);
      exitArmedRef.current = false;
      startedAtRef.current = Date.now() + CONTENT_LANDS_MS;
      shownAtRef.current = Date.now();
      return undefined;
    }
    if (!isVisible) return undefined;

    // **The floor comes first, and it is a hold rather than a transition.** A
    // wait stays up `motionMs.waitFloor` whether or not the work behind it has
    // already finished, and reduced motion does not shorten it — exactly as
    // the copy-feedback hold is not shortened. It is spent with the crest's
    // `infinite` animation still running and nothing cancelled, so when the
    // exit is finally planned it is planned from the phase the water is
    // genuinely in: the floor and the calm-water hold are sequential, never
    // double-counted. See DESIGN.md §The wait.
    const floorMs = Math.max(0, motionMs.waitFloor - (Date.now() - shownAtRef.current));

    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    // The exit, and it waits for calm water. Product, 2026-08: *"que no se pase
    // a la siguiente screen hasta que la última onda salga de la pantalla, es
    // decir, justo cuando el agua está calma."*
    //
    // Nothing is cancelled. The crest's `infinite` animation is left running
    // exactly as it is, so a front in flight finishes crossing instead of being
    // cut in half; the ground simply fades once it has left. Because only one
    // front is ever in flight (`WAVEFRONT_REST_MS`), the fade always completes
    // before the next emission is due, and a wait that resolves during the rest
    // has nothing to wait for at all.
    // A wait that resolves while the content is still floating in has thrown
    // nothing yet: there is no front on the screen to wait out, which is the
    // same answer the plan gives for calm water.
    const planExit = () => {
      exitArmedRef.current = true;
      const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
      const preImpact = elapsedMs < 0;
      const { holdMs, exitMs } = planWavefrontExit(
        Math.max(0, elapsedMs),
        !riding || isReduceMotionEnabled || preImpact
      );

      if (riding && !isReduceMotionEnabled && holdMs > 0) {
        // Only the ground has anything to wait for: nothing rides the front, so
        // the hold is the whole exit.
        contentRef.current?.style.setProperty('--wave-hold', `${holdMs}ms`);
        setIsClosing(true);
        exitTimer = setTimeout(
          () => {
            setIsVisible(false);
            setIsClosing(false);
            surface();
            onExitedRef.current?.();
            // The hard bound, unchanged in job: a wallet may never be stranded on a
            // wait. `exitMs` is what the screen is actually doing and
            // `wavefrontExitMs` is its worst case, so the guard can only be late.
            // The floor is spent before this is armed, so it bounds the whole
            // thing rather than racing it.
          },
          Math.min(exitMs, wavefrontExitMs(false))
        );
        return;
      }

      setIsFadingOut(true);
      exitTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
        surface();
        onExitedRef.current?.();
      }, durationMs.slow);
    };

    // Already leaving: the timers this effect's cleanup just cleared belong to
    // an exit that is mid-flight, and re-planning it would restart the ebb.
    if (exitArmedRef.current) return undefined;

    // The floor is a plain hold: the wait is simply still up, doing what it was
    // already doing, and the exit is planned when it runs out.
    let floorTimer: ReturnType<typeof setTimeout> | undefined;
    if (floorMs <= 0) planExit();
    else floorTimer = setTimeout(planExit, floorMs);

    return () => {
      if (floorTimer) clearTimeout(floorTimer);
      if (exitTimer) clearTimeout(exitTimer);
    };
    // `isVisible` is deliberately not a dependency: this effect SETS it, so
    // listing it made every entry run twice, one commit apart, writing
    // `startedAtRef` and `shownAtRef` a second time and moving the floor's
    // origin forward by a frame. It is read at the guard above from the
    // closure of the render where `visible` flipped false, where it is
    // correctly still true. See spec 031 §5.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, riding, isReduceMotionEnabled, surface]);

  /**
   * The measurement pass — one read, and the only reason the front crosses in
   * `WAVEFRONT_CROSS_MS` on a 360px popup and on a 1440px window alike.
   *
   * It used to plan every rider as well; the riders are gone (product, 2026-08)
   * and what is left is the ring's final diameter, written straight onto the
   * mark as a custom property so nothing re-renders and nothing is evaluated
   * per frame. Re-measured only when the viewport changes.
   */
  useLayoutEffect(() => {
    if (!isVisible || !riding) return undefined;

    const measure = () => {
      const root = contentRef.current;
      const mark = originRef.current;
      if (!root || !mark) return;

      // The surface is *this overlay*, not the viewport. A wait rendered into a
      // panel rather than over the whole window gets its own centre and its own
      // corner distance out of the same three lines — there is no full-screen
      // special case to keep in step.
      //
      // Read from layout (`offset*`) rather than from a client rect: the mark
      // rides the cluster, which is mid-float when this runs, and a rect
      // includes that transform. The cluster is absolute-fill, so the mark's
      // offsets are already the overlay's own coordinates.
      const origin = {
        x: mark.offsetLeft + mark.offsetWidth / 2,
        y: mark.offsetTop + mark.offsetHeight / 2,
      };

      // Written on the overlay rather than on the mark: the crests are siblings
      // of the travelling cluster now, and they inherit it from here.
      root.style.setProperty(
        '--wave-ring',
        `${2 * wavefrontRadius(origin, { width: root.clientWidth, height: root.clientHeight })}px`
      );
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isVisible, riding, title, subtitle]);

  // Cycle through tips: each tick fades the tip out through its CSS
  // transition and advances once it is gone. The clock is the shared
  // `useWaitTips`.
  const onTipTick = useCallback((advance: () => void) => {
    setTipFading(true);
    setTimeout(() => {
      advance();
      setTipFading(false);
    }, durationMs.slower);
  }, []);
  const { index: currentTipIndex } = useWaitTips({
    count: resolvedTips.length,
    intervalMs: tipInterval,
    active: visible && showTips,
    onTick: onTipTick,
  });

  // Don't render if not visible
  if (!isVisible) return null;

  const overlay = (
    // `loading-screen` is a test handle with a reason: this overlay is fixed
    // and covers the viewport, so it swallows clicks for as long as it is
    // mounted — including the whole exit animation, while the screen
    // underneath is already visible. Anything waiting to click that screen has
    // to wait for this to detach, not merely for the screen to appear.
    <Overlay
      ref={contentRef}
      $isFadingOut={isFadingOut}
      $waveOut={isClosing}
      $ground={water.gradient}
      role="status"
      aria-busy="true"
      data-testid="loading-screen"
    >
      {/* A wait is a screen like any other, and a screen is water. This one is
          the seam the ground has to close: the wait before a swap confirms is
          followed immediately by the receipt, which stands in the column, and
          two grounds one behind the other in the same second reads as two
          apps. Nothing here is redrawn — the spinner, the logo and the tips
          are exactly what they were; only what they stand in has changed. */}
      {!bedrock && <WaterColumn />}

      {/* The front, drawn — a sibling of the travelling cluster rather than a
          child of the mark that throws it: the water is the ground, and the
          ground never travels. Decorative and announced by the overlay's own
          `role="status"`, so it is hidden from assistive technology rather
          than narrated as a second thing happening. Its origin is the middle
          of the surface, which is where the mark rests. */}
      {riding &&
        crestTrain().map(({ lag, alpha }) => (
          <Crest
            key={lag}
            $alpha={alpha}
            $lagMs={Math.round(lag * WAVEFRONT_CROSS_MS)}
            $waves={riding}
            $ink={accent.fill}
            $shadow={water.crestShadow}
            aria-hidden="true"
          />
        ))}

      {/* Everything the wait owns, floating in as one and sinking out as one.
          See `Cluster`. */}
      <Cluster $waveOut={isClosing} data-testid="loading-cluster">
        {/* The emitter. It is pinned to the middle of the surface: the origin
            of a radial front is the one thing on this screen that may not be
            off-centre. */}
        {riding && (
          <Emitter
            ref={originRef}
            $waves={riding}
            $ink={accent.fill}
            aria-hidden="true"
            data-testid="loading-emitter"
          >
            <Mark viewBox={markViewBoxAttr} fill="currentColor" focusable="false">
              {markPaths.map((d) => (
                <path key={d} d={d} />
              ))}
            </Mark>
          </Emitter>
        )}

        {/* The words do not move — not on the front, at least. Product,
            2026-08: "Unlocking Wallet sigue moviéndose y el div de tip
            también, cuando te dije que no debería." They arrive and leave with
            the rest of the wait, which is the passage, not a rider. */}
        <Words>
          {title && <Title $ink={text.primary}>{title}</Title>}
          {subtitle && <Subtitle $ink={text.secondary}>{subtitle}</Subtitle>}
        </Words>

        {/* The tips, stationary too. They used to be the far-field passenger that
            showed the front takes real time to get there; the crest itself shows
            that, and it is the only thing that should. */}
        {showTips && resolvedTips.length > 0 && (
          <div style={tipsAnchor}>
            <TipsContainer>
              <TipLabel $ink={accent.ink}>{t('general.tip', 'Tip')}</TipLabel>
              <TipText $fading={tipFading} $ink={text.secondary}>
                {resolvedTips[currentTipIndex]}
              </TipText>
            </TipsContainer>
          </div>
        )}
      </Cluster>
    </Overlay>
  );

  // **Mounted on the body, not where it was written.** `position: fixed`
  // resolves against the nearest ancestor carrying a `transform` — not against
  // the viewport — so a wait rendered inside a sliding panel (the settings
  // stack keeps `translateX(0)` as its resting state) was clipped to that
  // panel. The overlay covers the app or it is not a wait, and the transform it
  // was trapped under is load-bearing for the slide, so the overlay leaves the
  // subtree instead. Everything else — context, the measurement pass, the
  // `loading-screen` handle — is unchanged: a portal keeps the React tree.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
});
