/**
 * PowerupsFab — the `+` that opens the Powerups catalogue over Home.
 *
 * The mobile twin is `apps/mobile/src/components/PowerupsFab`: the same accent
 * bubble floating in the same corner. A plus turned 45 degrees IS the close
 * mark — the same glyph, not a swap — so the launcher's open state is legible
 * on the control that opened it. Mobile turns it with Reanimated; here the
 * whole circle turns on a CSS transition, which comes to the same thing on a
 * round button.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { motionEasing, motionMs, shadowsCSS, spacing } from '@salmon/shared';

import { useReducedMotion } from '../../motion';
import { PlusIcon } from '../../icons';
import { IconBubble } from '../IconBubble';
import type { PowerupsFabProps } from './types';

const FAB_SIZE = 42;
const FAB_ICON_SIZE = 22;
/** The plus becomes the close mark by turning an eighth of a turn. */
const OPEN_ROTATION = 45;

export function PowerupsFab({
  onPress,
  open = false,
  style,
  testID = 'powerups-fab',
}: PowerupsFabProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  return (
    <IconBubble
      testID={testID}
      size={FAB_SIZE}
      tone="accent"
      icon={PlusIcon}
      iconWeight="bold"
      iconSize={FAB_ICON_SIZE}
      onPress={onPress}
      accessibilityLabel={
        open
          ? t('accessibility.close_powerups', 'Close Powerups')
          : t('accessibility.open_powerups', 'Open Powerups')
      }
      style={{
        position: 'absolute',
        right: spacing.screenGutter,
        bottom: spacing.screenGutter,
        zIndex: 2,
        boxShadow: shadowsCSS.lg,
        transform: `rotate(${open ? OPEN_ROTATION : 0}deg)`,
        transition: reducedMotion
          ? undefined
          : `transform ${motionMs.drift}ms ${motionEasing.current.css}`,
        ...style,
      }}
    />
  );
}

export default PowerupsFab;
