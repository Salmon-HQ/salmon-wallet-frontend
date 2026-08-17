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
 * - **The descent** replaces the spinning ring and the pulsing logo. A hairline
 *   track with a segment of salmon ink running *down* it on `shimmerCycle`,
 *   easing out at the end of every pass. A pass with rhythm and deceleration is
 *   the one thing here with measured evidence behind it: Harrison, Yeo & Hudson
 *   (CHI 2010) found a decelerating augmentation made a 5s wait read ~12%
 *   shorter than an unaugmented one, and a constant-speed rotation — exactly
 *   what stood here before — the worst of the options they measured.
 * - **The wave** (opt-in, `waves`) is a distance-based stagger, not a
 *   distortion: each element is displaced 3px with a delay proportional to its
 *   distance from the top of the column, so something reads as crossing the
 *   screen. Three emissions and it stops.
 * - **Tips are off by default** — see `LoadingScreenBaseProps.showTips`.
 */
import { memo, useState, useEffect, useMemo } from 'react';
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
  motionMs,
  motionEasing,
  reducedMotion,
  semantic,
} from '@salmon/shared';
import { WaterColumn, waterColumnHost } from '../WaterColumn';
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
 * from becoming a show.
 */
const waveKeyframes = keyframes`
  0% { transform: translateY(0) scale(1); }
  ${(motionMs.swell / 2 / motionMs.pulseCycle) * 100}% {
    transform: translateY(-${componentSizes.waveAmplitude}px) scale(1.02);
  }
  ${(motionMs.swell / motionMs.pulseCycle) * 100}%, 100% {
    transform: translateY(0) scale(1);
  }
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

const Overlay = styled('div')<{ $isFadingOut: boolean }>(({ $isFadingOut }) => ({
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
  animation: `${$isFadingOut ? fadeOutKeyframes : fadeInKeyframes} 0.3s ease-out forwards`,
}));

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

/**
 * Three emissions, then the water is still. A thirty-second wait cannot be a
 * thirty-second show — the loop is what would turn the wait into a spectacle
 * and take weight from The Surfacing.
 */
const WAVE_EMISSIONS = 3;

/**
 * A wave rider. `$rank` is the element's distance from the top of the column,
 * in items: the delay is proportional to it, which is what makes the eye read a
 * front crossing the screen rather than four things twitching at once.
 */
const WaveRider = styled('div')<{ $rank: number; $waves: boolean }>(({ $rank, $waves }) => ({
  animation: $waves
    ? `${waveKeyframes} ${motionMs.pulseCycle}ms ${motionEasing.current.css} ${$rank * motionMs.stagger}ms ${WAVE_EMISSIONS}`
    : 'none',
  [`@media ${reducedMotion.query}`]: {
    animation: 'none',
  },
}));

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
}: LoadingScreenProps) {
  const { t } = useTranslation();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(() => tips.map((tipKey) => t(tipKey, tipKey)), [tips, t]);

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setIsFadingOut(false);
    } else if (isVisible) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsFadingOut(false);
      }, durationMs.slow);
      return () => clearTimeout(timer);
    }
  }, [visible, isVisible]);

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
    <Overlay $isFadingOut={isFadingOut} role="status" aria-busy="true">
      {/* A wait is a screen like any other, and a screen is water. This one is
          the seam the ground has to close: the wait before a swap confirms is
          followed immediately by the receipt, which stands in the column, and
          two grounds one behind the other in the same second reads as two
          apps. Nothing here is redrawn — the spinner, the logo and the tips
          are exactly what they were; only what they stand in has changed. */}
      {!bedrock && <WaterColumn />}

      <Content>
        {title && (
          <WaveRider $rank={0} $waves={waves}>
            <Title>{title}</Title>
          </WaveRider>
        )}
        {subtitle && (
          <WaveRider $rank={1} $waves={waves}>
            <Subtitle>{subtitle}</Subtitle>
          </WaveRider>
        )}

        <WaveRider $rank={2} $waves={waves}>
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
