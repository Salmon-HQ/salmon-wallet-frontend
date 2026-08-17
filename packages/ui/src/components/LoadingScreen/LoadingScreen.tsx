/**
 * LoadingScreen — the wait, on the app's own ground.
 *
 * Uses Emotion keyframes + styled() for consistency with the rest of @salmon/ui.
 *
 * The choreography, and the one idea it is built on: **the wait goes down and
 * the success comes up.** The Surfacing is the only climax this system has, so
 * a wait may not compete with it — it is given the opposite *direction*
 * instead, which costs nothing and makes the two screens read as one sequence.
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
 * - **The wave** (`waves`, on by default) is the disturbed water. The mark pulses; every
 *   pulse launches a front; each element is displaced as the front reaches it,
 *   with a delay proportional to its *measured distance* from the mark and an
 *   amplitude attenuated as 1/√d. That is `f(t − d/c)` — d'Alembert — so it is a
 *   physically correct radial front and not a list stagger, and it needs no
 *   shader to be one. It loops for as long as the wait lasts and ends on a
 *   closing wave that carries the screen off (`onExited`). The arithmetic is in
 *   `@salmon/shared` `motion/wavefront`, shared with the React Native twin, so
 *   the two platforms cannot drift and the timing is testable without a frame
 *   clock.
 * - **Tips are off by default** — see `LoadingScreenBaseProps.showTips`.
 */
import { memo, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { keyframes } from '@emotion/react';
import { styled } from '../../utils/styled';
import {
  colors,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  DEFAULT_WALLET_TIP_KEYS,
  spacing,
  duration,
  durationMs,
  easing,
  componentSizes,
  CREST_FADE_FROM,
  crestGradientCSS,
  crestTrain,
  markPaths,
  markViewBoxAttr,
  motionMs,
  motionEasing,
  planWavefront,
  reducedMotion,
  semantic,
  wavefrontExitMs,
  wavefrontRadius,
  WAVEFRONT_CROSS_MS,
} from '@salmon/shared';
import { WaterColumn, waterColumnHost } from '../WaterColumn';
import { useReducedMotion } from '../../utils/useReducedMotion';
import type { LoadingScreenProps } from './types';

// ============================================================================
// Keyframes
// ============================================================================

/**
 * One wave passing one element. The displacement occupies `swell` out of the
 * `pulseCycle`; the rest of the cycle is stillness, which is what keeps a wait
 * from becoming a show even though the emission now loops.
 *
 * The amplitude is read from `--wave-amp`, written per element by the
 * measurement pass — it *parametrises* the animation rather than being animated
 * itself, so it needs no `@property` registration and degrades nowhere. The
 * per-element `animation-delay` is what makes this a wavefront: same curve,
 * later start, in proportion to distance.
 */
const waveKeyframes = keyframes`
  0% { transform: translateY(0) scale(1); }
  ${(motionMs.swell / 2 / motionMs.pulseCycle) * 100}% {
    transform: translateY(calc(-1 * var(--wave-amp, ${componentSizes.waveAmplitude}px))) scale(1.02);
  }
  ${(motionMs.swell / motionMs.pulseCycle) * 100}%, 100% {
    transform: translateY(0) scale(1);
  }
`;

/**
 * The closing wave. Same displacement, but the element does not come back — the
 * front carries it off the screen, each one leaving as the front reaches it.
 */
const waveOutKeyframes = keyframes`
  from { transform: translateY(0) scale(1); opacity: 1; }
  to {
    transform: translateY(calc(-1 * var(--wave-amp, ${componentSizes.waveAmplitude}px))) scale(1.02);
    opacity: 0;
  }
`;

/**
 * The emitter's beat. 2% — the quiet half of `swellIn`'s overshoot, and the
 * same amplitude the riders swell by, so the mark and the water it disturbs are
 * visibly one system.
 */
const pulseKeyframes = keyframes`
  0% { transform: scale(1); }
  ${(motionMs.swell / 2 / motionMs.pulseCycle) * 100}% { transform: scale(1.02); }
  ${(motionMs.swell / motionMs.pulseCycle) * 100}%, 100% { transform: scale(1); }
`;

/**
 * The front itself, made visible: a crest leaving the mark and crossing the
 * screen in `WAVEFRONT_CROSS_MS`, reaching the farthest corner exactly as the
 * last rider is displaced.
 *
 * Only `transform` and `opacity` are keyframed. The crest's light/dark ramp is
 * painted once into the layer as a static `radial-gradient` and never touched
 * again, which is the whole reason a band costs the same as the hairline it
 * replaces: the compositor scales a rasterised layer, it does not re-run a
 * gradient per frame.
 */
const crestKeyframes = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.02); opacity: 0; }
  4% { opacity: 1; }
  ${((CREST_FADE_FROM * WAVEFRONT_CROSS_MS) / motionMs.pulseCycle) * 100}% {
    opacity: 1;
  }
  ${(WAVEFRONT_CROSS_MS / motionMs.pulseCycle) * 100}% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
`;

const fadeInKeyframes = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOutKeyframes = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

// ============================================================================
// Styled Components
// ============================================================================

const Overlay = styled('div')<{ $isFadingOut: boolean; $waveOut: boolean }>(
  ({ $isFadingOut, $waveOut }) => ({
    ...waterColumnHost,
    // `fixed` rather than the host's `relative`: this overlay covers the viewport
    // rather than its parent. It is still a containing block, and `isolation`
    // still gives the stacking context the ground's negative layer needs.
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    background: `linear-gradient(180deg, ${colors.background.primary} 0%, ${colors.background.secondary} 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    // When the closing wave is driving the exit, the ground has to outlive the
    // riders: it holds still for one crossing while they are carried off, then
    // ebbs. `WAVEFRONT_CROSS_MS + ebb` is exactly `wavefrontExitMs(false)`, so
    // what the caller is told and what the screen does cannot drift.
    animation: $waveOut
      ? `${fadeOutKeyframes} ${motionMs.ebb}ms ${motionEasing.sink.css} ${WAVEFRONT_CROSS_MS}ms forwards`
      : `${$isFadingOut ? fadeOutKeyframes : fadeInKeyframes} 0.3s ease-out forwards`,
  })
);

/** Diameter of the mark that emits the wave, px. */
const MARK_SIZE = 96;

/** Clear space between the mark's edge and the first word under it. */
const MARK_TO_WORDS = spacing['3xl'];

/**
 * The words, and only the words. Pinned to start *below* the centre point
 * rather than being centred themselves, because the centre belongs to the mark:
 * the origin of the front is the middle of the surface, and everything else is
 * arranged around it. Product, 2026-08 — "lo más importante es que ocurra en el
 * centro del celular."
 */
const Words = styled('div')({
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: `${MARK_SIZE / 2 + MARK_TO_WORDS}px ${spacing['2xl']}px 0`,
  textAlign: 'center',
  pointerEvents: 'none',
});

const Title = styled('div')({
  color: colors.text.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize['2xl'],
  lineHeight: `${fontSize['2xl'] * lineHeight.condensed}px`,
  marginBottom: spacing.sm,
});

const Subtitle = styled('div')({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.md,
  lineHeight: `${fontSize.md * lineHeight.normal}px`,
});

/**
 * A wave rider. Its delay and amplitude arrive as `--wave-delay` / `--wave-amp`,
 * written straight onto the node by the measurement pass — no React state, no
 * re-render, and nothing evaluated per frame. `$rank` survives only as the
 * fallback for the first frame, before the layout pass has run: a wave by rank
 * is better than no front, and much better than a frame with every position
 * still at zero.
 */
const WaveRider = styled('div')<{ $rank: number; $waves: boolean; $closing: boolean }>(({
  $rank,
  $waves,
  $closing,
}) => {
  const fallbackDelay = `${$rank * motionMs.stagger}ms`;
  return {
    animation: !$waves
      ? 'none'
      : $closing
        ? `${waveOutKeyframes} ${motionMs.swell}ms ${motionEasing.sink.css} var(--wave-delay, ${fallbackDelay}) 1 forwards`
        : `${waveKeyframes} ${motionMs.pulseCycle}ms ${motionEasing.current.css} var(--wave-delay, ${fallbackDelay}) infinite`,
    [`@media ${reducedMotion.query}`]: {
      animation: 'none',
    },
  };
});

/**
 * The emitter. The pulsing mark was removed with the spinning ring and is back
 * by decision, not by drift: without a visible source a radial front reads as
 * unrelated elements twitching. Salmon as *ink* — the mark is tinted, never
 * filled, so it does not spend the one living fill a screen is allowed.
 */
const Emitter = styled('div')<{ $waves: boolean; $closing: boolean }>(({ $waves, $closing }) => ({
  // The true centre of whatever the wait occupies — not of the viewport. The
  // overlay is the surface, so its middle is the origin, and a wait rendered in
  // a smaller box gets its own centre with no special case.
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginTop: -MARK_SIZE / 2,
  marginLeft: -MARK_SIZE / 2,
  width: MARK_SIZE,
  height: MARK_SIZE,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: semantic.text.accent,
  // On close it beats once more and stops: the closing wave has a source too.
  animation: $waves
    ? `${pulseKeyframes} ${motionMs.pulseCycle}ms ${motionEasing.current.css} ${$closing ? 1 : 'infinite'}`
    : 'none',
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
  },
}));

/**
 * The front, drawn — a **refraction crest**, not an outline.
 *
 * Across the thickness of the band the inner face returns light and the outer
 * face falls into shadow, which is what a raised ridge of water looks like from
 * above: the light term follows the *derivative* of the height field, so the two
 * slopes of one bump catch light with opposite sign. It is the bezel this system
 * already puts on a filled button — lit rim, shaded underside — rotated into a
 * radial band. The shape lives in `@salmon/shared` `motion/crest` so mobile and
 * the DOM cannot draw two different waves.
 *
 * The construction is a **static** `radial-gradient` on a box laid out at the
 * front's final diameter, moved only by `transform: scale()`. Nothing about the
 * paint is animated: the layer is rasterised once and the compositor scales it,
 * which is why a band costs what the hairline cost.
 *
 * This is a light event during a wait, which §Overview used to forbid outright
 * ("one light event, and it is The Surfacing"). That rule has been amended in
 * DESIGN.md rather than quietly broken here. The light is still rationed — it is
 * salmon ink at partial alpha, it lives only while the wait does, and it travels
 * outward and down while The Surfacing travels up.
 */
const Crest = styled('div')<{ $alpha: number; $lagMs: number; $waves: boolean; $closing: boolean }>(
  ({ $alpha, $lagMs, $waves, $closing }) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Diameter is `--wave-ring`, written by the measurement pass as twice the
    // distance from the mark to the farthest corner. The crest is scaled *down*
    // from its final size rather than up from a small one, so the band never has
    // to be repainted — only `transform` and `opacity` ever change.
    width: 'var(--wave-ring, 0px)',
    height: 'var(--wave-ring, 0px)',
    borderRadius: '50%',
    background: crestGradientCSS($alpha),
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%) scale(0)',
    // A wave train: each crest runs one `CREST_SPACING` of the crossing behind
    // the one ahead of it, at a fraction of its alpha. On close the train is
    // emitted exactly once — that emission *is* the exit.
    //
    // `linear`, and it is the one place in this system that gets it. The riders'
    // delays are linear in distance, so the front's position is linear in time —
    // that is what `d = c·t` means. Easing the front on `current` was measured
    // doing the wrong thing: it covered 90% of the screen in the first 20% of
    // the crossing and then waited off-screen for riders it had already passed.
    // This is a front's velocity, not an element arriving.
    animation: $waves
      ? `${crestKeyframes} ${motionMs.pulseCycle}ms linear ${$lagMs}ms ${$closing ? 1 : 'infinite'}`
      : 'none',
    [`@media ${reducedMotion.query}`]: {
      animation: 'none',
      opacity: 0,
    },
  })
);

const Mark = styled('svg')({
  width: '100%',
  height: '100%',
  display: 'block',
});

/**
 * The tips. Absolutely placed on the *rider* rather than on this box, so the
 * thing the measurement pass sizes is the thing that actually sits at the
 * bottom of the surface — a wrapper collapsed to zero height would be planned as
 * if it were at the origin.
 */
const tipsAnchor = {
  position: 'absolute',
  bottom: spacing['7xl'],
  left: spacing['2xl'],
  right: spacing['2xl'],
} as const;

const TipsContainer = styled('div')({
  textAlign: 'center',
});

const TipLabel = styled('div')({
  color: colors.accent.primary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.bold,
  fontSize: fontSize.sm,
  lineHeight: `${fontSize.sm * lineHeight.condensed}px`,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  textAlign: 'center',
  marginBottom: spacing.sm,
});

const TipText = styled('div')<{ $fading: boolean }>(({ $fading }) => ({
  color: colors.text.secondary,
  fontFamily: fontFamily.sans,
  fontWeight: fontWeight.regular,
  fontSize: fontSize.base,
  lineHeight: `${fontSize.base * lineHeight.tokenListItem}px`,
  textAlign: 'center',
  opacity: $fading ? 0 : 1,
  transition: `opacity ${duration.slower} ${easing.easeInOut}`,
  padding: `0 ${spacing.lg}px`,
}));

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
  showTips = false,
  // Every wait is water. `waves` used to default to `false` and be passed only
  // by the transaction wait; product hit the account-recovery wait (2026-08) and
  // found it bare. The treatment is the wait now, not a decoration one screen
  // opts into. The prop survives so `bedrock` — and any future surface that must
  // show nothing living through itself — can still opt out.
  waves = true,
  bedrock = false,
  onExited,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  const isReduceMotionEnabled = useReducedMotion();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // The Bedrock Rule: the dApp approval flow shows nothing living through
  // itself, and a pulsing mark throwing rings across the screen is the most
  // living thing in the app. It is the same opt-out the water column takes.
  const riding = waves && !bedrock;

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // The closing wave is in flight: the loop is cancelled, every rider is
  // leaving on its own delay, and the ground is holding until the front is off
  // the screen.
  const [isClosing, setIsClosing] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  // Held in a ref so an inline callback cannot restart the exit timer on every
  // render — which would leave the screen up forever.
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsFadingOut(false);
      setIsClosing(false);
      return undefined;
    }
    if (!isVisible) return undefined;

    // The wave-driven exit. It does **not** wait out the emission in flight:
    // that would put up to a whole `pulseCycle` between the user's decision and
    // their receipt, and the wallet's own rule is that exit is faster than
    // enter. The pending emissions are cancelled, the closing wave goes out
    // now, and the handoff lands at a fixed `wavefrontExitMs()`.
    if (riding && !isReduceMotionEnabled) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        onExitedRef.current?.();
      }, wavefrontExitMs(false));
      return () => clearTimeout(timer);
    }

    setIsFadingOut(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsFadingOut(false);
      onExitedRef.current?.();
    }, durationMs.slow);
    return () => clearTimeout(timer);
  }, [visible, isVisible, riding, isReduceMotionEnabled]);

  /**
   * The measurement pass — the only place geometry is read, and the only reason
   * this is a front rather than a rank stagger.
   *
   * One layout read per rider, written straight back as CSS custom properties,
   * so nothing re-renders and nothing is evaluated per frame: the passengers do
   * not move and the origin does not move, so `f(t − d/c)` with a constant `d`
   * *is* an animation with a delay. Re-measured only when the viewport changes.
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
      const surface = root.getBoundingClientRect();
      const markBox = mark.getBoundingClientRect();
      const origin = {
        x: markBox.left + markBox.width / 2 - surface.left,
        y: markBox.top + markBox.height / 2 - surface.top,
      };
      const bounds = { width: surface.width, height: surface.height };

      mark.style.setProperty('--wave-ring', `${2 * wavefrontRadius(origin, bounds)}px`);

      root.querySelectorAll<HTMLElement>('[data-wave-rider]').forEach((node) => {
        const box = node.getBoundingClientRect();
        const plan = planWavefront(
          {
            x: box.left + box.width / 2 - surface.left,
            y: box.top + box.height / 2 - surface.top,
          },
          origin,
          bounds,
          isReduceMotionEnabled
        );
        if (!plan) return;
        node.style.setProperty('--wave-delay', `${plan.delayMs}ms`);
        node.style.setProperty('--wave-amp', `${plan.amplitude}px`);
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isVisible, riding, isReduceMotionEnabled, title, subtitle]);

  // Cycle through tips
  useEffect(() => {
    if (!visible || !showTips || resolvedTips.length <= 1) return;

    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % resolvedTips.length);
        setTipFading(false);
      }, durationMs.slower);
    }, tipInterval);

    return () => clearInterval(interval);
  }, [visible, showTips, resolvedTips.length, tipInterval]);

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <Overlay
      ref={contentRef}
      $isFadingOut={isFadingOut}
      $waveOut={isClosing}
      role="status"
      aria-busy="true"
    >
      {/* A wait is a screen like any other, and a screen is water. This one is
          the seam the ground has to close: the wait before a swap confirms is
          followed immediately by the receipt, which stands in the column, and
          two grounds one behind the other in the same second reads as two
          apps. Nothing here is redrawn — the spinner, the logo and the tips
          are exactly what they were; only what they stand in has changed. */}
      {!bedrock && <WaterColumn />}

      {/* The emitter and the front it launches. Decorative and announced by
          the overlay's own `role="status"`, so it is hidden from assistive
          technology rather than narrated as a second thing happening. It is
          pinned to the middle of the surface: the origin of a radial front is
          the one thing on this screen that may not be off-centre. */}
      {riding && (
        <Emitter
          ref={originRef}
          $waves={riding}
          $closing={isClosing}
          aria-hidden="true"
          data-testid="loading-emitter"
        >
          {crestTrain().map(({ lag, alpha }) => (
            <Crest
              key={lag}
              $alpha={alpha}
              $lagMs={Math.round(lag * WAVEFRONT_CROSS_MS)}
              $waves={riding}
              $closing={isClosing}
            />
          ))}
          <Mark viewBox={markViewBoxAttr} fill="currentColor" focusable="false">
            {markPaths.map((d) => (
              <path key={d} d={d} />
            ))}
          </Mark>
        </Emitter>
      )}

      <Words>
        {title && (
          <WaveRider $rank={0} $waves={riding} $closing={isClosing} data-wave-rider>
            <Title>{title}</Title>
          </WaveRider>
        )}
        {subtitle && (
          <WaveRider $rank={1} $waves={riding} $closing={isClosing} data-wave-rider>
            <Subtitle>{subtitle}</Subtitle>
          </WaveRider>
        )}
      </Words>

      {/* The tips ride too, and they are the far-field passenger — the one that
          shows the front takes real time to get there. */}
      {showTips && resolvedTips.length > 0 && (
        <WaveRider
          $rank={2}
          $waves={riding}
          $closing={isClosing}
          style={tipsAnchor}
          data-wave-rider
        >
          <TipsContainer>
            <TipLabel>{t('general.tip', 'Tip')}</TipLabel>
            <TipText $fading={tipFading}>{resolvedTips[currentTipIndex]}</TipText>
          </TipsContainer>
        </WaveRider>
      )}
    </Overlay>
  );
});
