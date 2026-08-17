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
 * - **The descent** replaces the spinning ring. A hairline
 *   track with a segment of salmon ink running *down* it on `shimmerCycle`,
 *   easing out at the end of every pass. A pass with rhythm and deceleration is
 *   the one thing here with measured evidence behind it: Harrison, Yeo & Hudson
 *   (CHI 2010) found a decelerating augmentation made a 5s wait read ~12%
 *   shorter than an unaugmented one, and a constant-speed rotation — exactly
 *   what stood here before — the worst of the options they measured. The
 *   *pulsing logo* was removed with the ring and has been brought back
 *   deliberately (product decision, 2026-08): it is the emitter, and a wave
 *   with no visible source is four things twitching.
 * - **The wave** (opt-in, `waves`) is the disturbed water. The mark pulses; every
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
 * The descent: the segment enters above the track and leaves below it, so the
 * pass reads as continuous rather than as a shuttle. `current` decelerates it
 * into the bottom of every pass.
 */
const descentKeyframes = keyframes`
  from { transform: translateY(-${componentSizes.descentSegmentHeight}px); }
  to { transform: translateY(${componentSizes.descentTrackHeight}px); }
`;

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
 * The front itself, made visible: a ring leaving the mark and crossing the
 * screen in `WAVEFRONT_CROSS_MS`, reaching the farthest corner exactly as the
 * last rider is displaced.
 */
const ringKeyframes = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.02); opacity: 0; }
  4% { opacity: 1; }
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

const Content = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing['2xl'],
  textAlign: 'center',
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
  marginBottom: spacing['3xl'],
});

/** Diameter of the mark that emits the wave, px. */
const MARK_SIZE = 56;

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
  position: 'relative',
  width: MARK_SIZE,
  height: MARK_SIZE,
  marginBottom: spacing['3xl'],
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
 * The front, drawn. Two concentric rings scaled from the mark: a bright hairline
 * and a wider, dimmer halo behind it. The halo is what makes the ring *luminous*
 * rather than a hairline circle, and it is drawn as a second ring plus a box
 * shadow rather than as a filter, so both rings stay on the compositor.
 *
 * This is a light event during a wait, which §Overview used to forbid outright
 * ("one light event, and it is The Surfacing"). That rule has been amended in
 * DESIGN.md rather than quietly broken here: the unlit hairline was not legible
 * as a wavefront, and a wave nobody can see is not a cheaper wave, it is none.
 * The light is still rationed — it is salmon ink at low alpha, it lives only
 * while the wait does, and it travels outward and down while The Surfacing
 * travels up.
 */
const Ring = styled('div')<{ $halo: boolean; $waves: boolean; $closing: boolean }>(
  ({ $halo, $waves, $closing }) => ({
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Diameter is `--wave-ring`, written by the measurement pass as twice the
    // distance from the mark to the farthest corner. The ring is scaled *down*
    // from its final size rather than up from a small one, so the stroke never
    // has to be animated — only `transform` and `opacity` ever change.
    width: 'var(--wave-ring, 0px)',
    height: 'var(--wave-ring, 0px)',
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: $halo ? 6 : 1.5,
    borderColor: $halo ? semantic.accent.tint : semantic.accent.ink,
    boxShadow: $halo ? 'none' : `0 0 12px 1px ${semantic.accent.tint}`,
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translate(-50%, -50%) scale(0)',
    // The crest leads, the glow trails it by one `flick`. On close the ring is
    // emitted exactly once — that emission *is* the exit.
    //
    // `linear`, and it is the one place in this system that gets it. The riders'
    // delays are linear in distance, so the front's position is linear in time —
    // that is what `d = c·t` means. Easing the ring on `current` was measured
    // doing the wrong thing: the front covered 90% of the screen in the first
    // 20% of the crossing and then waited off-screen for the riders it had
    // already passed. This is a front's velocity, not an element arriving.
    animation: $waves
      ? `${ringKeyframes} ${motionMs.pulseCycle}ms linear ${$halo ? motionMs.flick : 0}ms ${$closing ? 1 : 'infinite'}`
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

const DescentTrack = styled('div')({
  position: 'relative',
  width: componentSizes.descentTrackWidth,
  height: componentSizes.descentTrackHeight,
  borderRadius: componentSizes.descentTrackWidth,
  backgroundColor: semantic.border.hairline,
  overflow: 'hidden',
  marginBottom: spacing['5xl'],
});

/**
 * Salmon as *ink*, which DESIGN.md does not ration — not a fill, which is
 * rationed to one living element per screen and must not be spent on the least
 * important thing on it.
 */
const DescentSegment = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: componentSizes.descentSegmentHeight,
  borderRadius: componentSizes.descentTrackWidth,
  backgroundColor: semantic.text.accent,
  animation: `${descentKeyframes} ${motionMs.shimmerCycle}ms ${motionEasing.current.css} infinite`,
  [`@media ${reducedMotion.query}`]: {
    // A still indicator reads as a hung process, so reduced motion does not get
    // an empty track: the segment rests at mid-track and the *words* carry the
    // state instead. A parallel mapping, not an off switch.
    animation: 'none',
    transform: `translateY(${(componentSizes.descentTrackHeight - componentSizes.descentSegmentHeight) / 2}px)`,
  },
});

const TipsContainer = styled('div')({
  position: 'absolute',
  bottom: spacing['7xl'],
  left: spacing['2xl'],
  right: spacing['2xl'],
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
  waves = false,
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

      const markBox = mark.getBoundingClientRect();
      const origin = { x: markBox.left + markBox.width / 2, y: markBox.top + markBox.height / 2 };
      const bounds = { width: window.innerWidth, height: window.innerHeight };

      mark.style.setProperty('--wave-ring', `${2 * wavefrontRadius(origin, bounds)}px`);

      root.querySelectorAll<HTMLElement>('[data-wave-rider]').forEach((node) => {
        const box = node.getBoundingClientRect();
        const plan = planWavefront(
          { x: box.left + box.width / 2, y: box.top + box.height / 2 },
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
    <Overlay $isFadingOut={isFadingOut} $waveOut={isClosing} role="status" aria-busy="true">
      {/* A wait is a screen like any other, and a screen is water. This one is
          the seam the ground has to close: the wait before a swap confirms is
          followed immediately by the receipt, which stands in the column, and
          two grounds one behind the other in the same second reads as two
          apps. Nothing here is redrawn — the spinner, the logo and the tips
          are exactly what they were; only what they stand in has changed. */}
      {!bedrock && <WaterColumn />}

      <Content ref={contentRef}>
        {/* The emitter and the front it launches. Decorative and announced by
            the overlay's own `role="status"`, so it is hidden from assistive
            technology rather than narrated as a second thing happening. */}
        {riding && (
          <Emitter
            ref={originRef}
            $waves={riding}
            $closing={isClosing}
            aria-hidden="true"
            data-testid="loading-emitter"
          >
            <Ring $halo $waves={riding} $closing={isClosing} />
            <Ring $halo={false} $waves={riding} $closing={isClosing} />
            <Mark viewBox={markViewBoxAttr} fill="currentColor" focusable="false">
              {markPaths.map((d) => (
                <path key={d} d={d} />
              ))}
            </Mark>
          </Emitter>
        )}

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

        <WaveRider $rank={2} $waves={riding} $closing={isClosing} data-wave-rider>
          <DescentTrack aria-hidden="true" data-testid="loading-descent">
            <DescentSegment />
          </DescentTrack>
        </WaveRider>
      </Content>

      {showTips && resolvedTips.length > 0 && (
        <TipsContainer>
          <TipLabel>{t('general.tip', 'Tip')}</TipLabel>
          <TipText $fading={tipFading}>{resolvedTips[currentTipIndex]}</TipText>
        </TipsContainer>
      )}
    </Overlay>
  );
});
