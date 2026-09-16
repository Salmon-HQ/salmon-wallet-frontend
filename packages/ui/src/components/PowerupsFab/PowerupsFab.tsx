/**
 * PowerupsFab — the salmon that opens the Powerups catalogue over Home, on
 * the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PowerupsFab/PowerupsFab.tsx`:
 * the same accent `IconBubble`, the same leap on a tap (`fabLeap` in the
 * theme) and the same cross-fade to the close mark while the catalogue is
 * open. Mobile moves it with Reanimated; here the leap is a two-phase CSS
 * transform transition and the fade an opacity transition.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fabLeap, motionEasing, motionMs, shadowsCSS, spacing } from '@salmon/shared';
import { useReducedMotion } from '../../motion';
import { XIcon } from '../../icons';
import { useSemantic } from '../../theme/ThemeProvider';
import { BrandMark } from '../BrandMark';
import { IconBubble } from '../IconBubble';
import type { PowerupsFabProps } from './types';

const FAB_SIZE = 42;
const FAB_ICON_SIZE = 22;

export function PowerupsFab({
  onPress,
  open = false,
  style,
  testID = 'powerups-fab',
}: PowerupsFabProps) {
  const { t } = useTranslation();
  const { accent } = useSemantic();
  const reducedMotion = useReducedMotion();
  const [leaping, setLeaping] = useState(false);
  const landing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(landing.current ?? undefined), []);

  const handlePress = () => {
    if (!reducedMotion) {
      setLeaping(true);
      clearTimeout(landing.current ?? undefined);
      landing.current = setTimeout(() => setLeaping(false), motionMs.swell);
    }
    onPress();
  };

  const glyphStyle = (shown: boolean): React.CSSProperties => ({
    position: 'absolute',
    display: 'flex',
    opacity: shown ? 1 : 0,
    transition: reducedMotion
      ? undefined
      : `opacity ${motionMs.drift}ms ${motionEasing.current.css}`,
  });

  return (
    <div
      data-testid={`${testID}-leap`}
      style={{
        position: 'absolute',
        right: spacing.screenGutter,
        bottom: spacing.screenGutter,
        zIndex: 2,
        transform: leaping
          ? `translateY(${-fabLeap.risePx}px) rotate(${-fabLeap.tiltDeg}deg)`
          : 'translateY(0) rotate(0deg)',
        transition: reducedMotion
          ? undefined
          : `transform ${leaping ? motionMs.swell : motionMs.ebb}ms ${
              leaping ? motionEasing.current.css : motionEasing.sink.css
            }`,
        ...style,
      }}
    >
      <IconBubble
        testID={testID}
        size={FAB_SIZE}
        tone="accent"
        onPress={handlePress}
        accessibilityLabel={
          open
            ? t('accessibility.close_powerups', 'Close Powerups')
            : t('accessibility.open_powerups', 'Open Powerups')
        }
        style={{ boxShadow: shadowsCSS.lg }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={glyphStyle(!open)}>
            <BrandMark testID="powerups-fab-mark" size={FAB_ICON_SIZE} color={accent.onFill} />
          </span>
          <span data-testid="powerups-fab-close" style={glyphStyle(open)}>
            <XIcon size={FAB_ICON_SIZE} color={accent.onFill} weight="bold" />
          </span>
        </span>
      </IconBubble>
    </div>
  );
}

export default PowerupsFab;
