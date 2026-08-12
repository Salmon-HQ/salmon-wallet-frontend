/**
 * LoadingScreen (Web Version) - Animated loading overlay for browser extension
 *
 * Uses CSS animations for compatibility with WXT+Vite
 *
 * Features:
 * - Pulsing logo animation (breathing effect)
 * - Rotating spinner around the logo
 * - Cycling tips/advice at the bottom
 * - Smooth fade in/out transitions
 */

import { useState, useEffect, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { colors, DEFAULT_WALLET_TIPS, fontFamily } from '@salmon/shared';
// Note: For web, you'll need to import the logo as a URL
// import logoUrl from '@salmon/assets/images/Logo.png';

import { LoadingScreenProps } from './types';

// ============================================================================
// CSS Keyframes (injected into document)
// ============================================================================

const KEYFRAMES = `
@keyframes salmonPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes salmonSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes salmonFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes salmonFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
`;

// Inject keyframes once
let keyframesInjected = false;
function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return;

  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

// ============================================================================
// Component
// ============================================================================

export function LoadingScreenWeb({
  visible,
  title,
  subtitle,
  tips = DEFAULT_WALLET_TIPS as unknown as string[],
  tipInterval = 4000,
  showTips = true,
  logoSize = 100,
  spinnerSize = 140,
}: LoadingScreenProps) {
  const { t } = useTranslation();
  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tipFading, setTipFading] = useState(false);
  const [isVisible, setIsVisible] = useState(visible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Inject keyframes on mount
  useEffect(() => {
    injectKeyframes();
  }, []);

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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, isVisible]);

  // Cycle through tips
  useEffect(() => {
    if (!visible || !showTips || tips.length <= 1) return;

    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setTipFading(false);
      }, 400);
    }, tipInterval);

    return () => clearInterval(interval);
  }, [visible, showTips, tips.length, tipInterval]);

  // Don't render if not visible
  if (!isVisible) return null;

  // Styles
  const overlayStyle: CSSProperties = {
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
    animation: isFadingOut
      ? 'salmonFadeOut 0.3s ease-out forwards'
      : 'salmonFadeIn 0.3s ease-out forwards',
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
  };

  const titleStyle: CSSProperties = {
    color: colors.text.primary,
    fontFamily: fontFamily.sans,
    fontWeight: 700,
    fontSize: '24px',
    lineHeight: '32px',
    marginBottom: '8px',
  };

  const subtitleStyle: CSSProperties = {
    color: colors.text.secondary,
    fontFamily: fontFamily.sans,
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '32px',
  };

  const logoSpinnerContainerStyle: CSSProperties = {
    position: 'relative',
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '48px',
  };

  const spinnerStyle: CSSProperties = {
    position: 'absolute',
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    borderRadius: '50%',
    border: `3px solid transparent`,
    borderTopColor: colors.accent.primary,
    borderRightColor: colors.accent.primary,
    borderBottomColor: colors.accent.primary,
    animation: 'salmonSpin 2s linear infinite',
    boxSizing: 'border-box',
  };

  const logoContainerStyle: CSSProperties = {
    animation: 'salmonPulse 1.2s ease-in-out infinite',
  };

  const logoStyle: CSSProperties = {
    width: `${logoSize}px`,
    height: `${logoSize}px`,
    objectFit: 'contain',
  };

  const tipsContainerStyle: CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    left: '24px',
    right: '24px',
    textAlign: 'center',
  };

  const tipLabelStyle: CSSProperties = {
    color: colors.accent.primary,
    fontFamily: fontFamily.sans,
    fontWeight: 700,
    fontSize: '12px',
    lineHeight: '16px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  };

  const tipTextStyle: CSSProperties = {
    color: colors.text.secondary,
    fontFamily: fontFamily.sans,
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    opacity: tipFading ? 0 : 1,
    transition: 'opacity 0.4s ease-in-out',
    padding: '0 16px',
  };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        {title && <div style={titleStyle}>{title}</div>}
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}

        <div style={logoSpinnerContainerStyle}>
          {/* Rotating Spinner */}
          <div style={spinnerStyle} />

          {/* Pulsing Logo */}
          <div style={logoContainerStyle}>
            {/* You'll need to provide the logo URL for web */}
            <div
              style={{
                ...logoStyle,
                backgroundColor: colors.text.primary,
                borderRadius: '20%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
              }}
            >
              🐟
            </div>
          </div>
        </div>
      </div>

      {showTips && tips.length > 0 && (
        <div style={tipsContainerStyle}>
          <div style={tipLabelStyle}>{t('general.tip', 'Tip')}</div>
          <div style={tipTextStyle}>{tips[currentTipIndex]}</div>
        </div>
      )}
    </div>
  );
}

export default LoadingScreenWeb;
