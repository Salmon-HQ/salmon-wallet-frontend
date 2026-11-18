/**
 * IconBubble — the round or rounded well every glyph, initial and avatar in
 * the redesign sits in, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/IconBubble/IconBubble.tsx`;
 * the seven tones, the two shapes, the two radii and the flesh rule are the
 * same, read from the same `IconBubblePropsBase` contract. Only the drawing
 * differs:
 * - the press scale + specular that `usePressMotion` + `PressSpecular` give
 *   mobile through Reanimated are a CSS `transform` transition here, plus the
 *   DOM `PressSpecular` (from `../PressSpecular`) driven by
 *   `usePressed()` and `setSpecularOrigin`;
 * - the flesh texture reuses the existing DOM `FleshBackground` (an inline
 *   SVG pattern built from the same `fleshTile`/`fleshFills` data mobile
 *   draws with `react-native-svg`), the same way mobile's `IconBubble`
 *   mounts its own `FleshBackground`;
 * - `hitSlop` and `rotation` are RN-only and have no DOM prop — see
 *   `types.ts`.
 */
import React from 'react';
import {
  borderWidth,
  componentSizes,
  iconBubbleLook,
  fontFamily,
  fontWeight,
  motionEasing,
  motionMs,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { usePressed } from '../../utils/usePressed';
import { FleshBackground } from '../FleshBackground';
import { PressSpecular, setSpecularOrigin } from '../PressSpecular';
import type { IconBubbleProps } from './types';

/** Mobile's `usePressMotion` `scale(0.985)`. */
const PRESS_SCALE = 0.985;

export function IconBubble({
  size,
  shape = 'circle',
  radius = 'xl',
  tone,
  icon: Glyph,
  iconSize,
  iconWeight,
  iconColor,
  children,
  onPress,
  decorative,
  disabled = false,
  flesh,
  style,
  className,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: IconBubbleProps) {
  const t = useSemantic();
  const reducedMotion = useReducedMotion();
  const { pressed, handlers } = usePressed();

  const isDisabled = !!onPress && disabled;
  const {
    background,
    ink,
    border,
    cornerRadius,
    glyph: glyphSize,
  } = iconBubbleLook(t, {
    tone,
    shape,
    radius,
    size,
    iconSize,
    iconColor,
    disabled: isDisabled,
  });
  const box = size;
  const glyph = glyphSize;

  // A salmon fill is mass, so it carries the flesh; every other ground is
  // surface and carries none. Applies whether or not the bubble is pressable.
  const showFlesh = (flesh ?? tone === 'accent') && !isDisabled;

  const shell: React.CSSProperties = {
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: box,
    height: box,
    backgroundColor: background,
    borderRadius: cornerRadius,
    ...(border != null
      ? { borderStyle: 'solid', borderWidth: borderWidth.actionButton, borderColor: border }
      : { border: 'none' }),
    ...style,
  };

  const body = (
    <>
      {Glyph ? <Glyph size={glyph} color={ink} weight={iconWeight} /> : null}
      {typeof children === 'string' || typeof children === 'number' ? (
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontWeight: fontWeight.bold,
            fontSize: glyph,
            color: ink,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </span>
      ) : (
        children
      )}
    </>
  );

  const flick = `${motionMs.flick}ms ${motionEasing.current.css}`;

  if (!onPress) {
    return (
      <div data-testid={testID} aria-label={accessibilityLabel} className={className} style={shell}>
        {showFlesh && <FleshBackground scale={componentSizes.bubbleFleshScale} />}
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={accessibilityLabel}
      aria-description={accessibilityHint}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? -1 : undefined}
      disabled={isDisabled}
      onClick={onPress}
      onPointerDown={(event) => {
        setSpecularOrigin(event);
        handlers.onPointerDown();
      }}
      onPointerUp={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerLeave}
      onBlur={handlers.onBlur}
      className={className}
      style={{
        ...shell,
        padding: 0,
        font: 'inherit',
        cursor: isDisabled ? 'default' : 'pointer',
        transform: pressed && !reducedMotion ? `scale(${PRESS_SCALE})` : 'scale(1)',
        transition: `transform ${flick}`,
      }}
    >
      {showFlesh && <FleshBackground scale={componentSizes.bubbleFleshScale} />}
      {body}
      {!isDisabled && <PressSpecular pressed={pressed} reducedMotion={reducedMotion} />}
    </button>
  );
}
