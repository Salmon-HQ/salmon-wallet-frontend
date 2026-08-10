/**
 * LoadingScreen - Animated loading overlay for browser extension
 *
 * Uses Emotion keyframes + styled() for consistency with the rest of @salmon/ui.
 *
 * Features:
 * - Pulsing logo animation (breathing effect)
 * - Rotating spinner around the logo
 * - Cycling tips/advice at the bottom
 * - Smooth fade in/out transitions
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
  borderWidth,
  duration,
  durationMs,
  easing,
} from '@salmon/shared';
import type { LoadingScreenProps } from './types';

// ============================================================================
// Keyframes
// ============================================================================

const pulseKeyframes = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const spinKeyframes = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

const LogoSpinnerContainer = styled('div')<{ $size: number }>(({ $size }) => ({
  position: 'relative',
  width: $size,
  height: $size,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: spacing['5xl'],
}));

const Spinner = styled('div')<{ $size: number }>(({ $size }) => ({
  position: 'absolute',
  width: $size,
  height: $size,
  borderRadius: '50%',
  border: `${borderWidth.heavy}px solid transparent`,
  borderTopColor: colors.accent.primary,
  borderRightColor: colors.accent.primary,
  borderBottomColor: colors.accent.primary,
  animation: `${spinKeyframes} ${durationMs.spinSlow}ms linear infinite`,
  boxSizing: 'border-box',
}));

const LogoContainer = styled('div')({
  animation: `${pulseKeyframes} ${durationMs.pulse}ms ${easing.easeInOut} infinite`,
});

const Logo = styled('img')<{ $size: number }>(({ $size }) => ({
  width: $size,
  height: $size,
  objectFit: 'contain',
}));

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
 *   showTips={true}
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
  logoSize = 100,
  spinnerSize = 140,
}: LoadingScreenProps) {
  const { t } = useTranslation();

  // Resolve tip keys through t() for i18n
  const resolvedTips = useMemo(
    () => tips.map((tipKey) => t(tipKey, tipKey)),
    [tips, t],
  );

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
    <Overlay $isFadingOut={isFadingOut}>
      <Content>
        {title && <Title>{title}</Title>}
        {subtitle && <Subtitle>{subtitle}</Subtitle>}

        <LogoSpinnerContainer $size={spinnerSize}>
          <Spinner $size={spinnerSize} />
          <LogoContainer>
            <Logo src="/images/Logo.png" alt="Salmon Wallet" $size={logoSize} />
          </LogoContainer>
        </LogoSpinnerContainer>
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
