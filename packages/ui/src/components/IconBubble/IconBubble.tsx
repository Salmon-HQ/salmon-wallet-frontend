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
 *   DOM `PressSpecular` (from `../Button/PressSpecular`) driven by
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
  borderRadius,
  borderWidth,
  componentSizes,
  fontFamily,
  fontWeight,
  motionEasing,
  motionMs,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { usePressed } from '../../utils/usePressed';
import { FleshBackground } from '../FleshBackground';
import { PressSpecular, setSpecularOrigin } from '../Button/PressSpecular';
import type { IconBubbleProps, IconBubbleRadius, IconBubbleTone } from './types';

/** Ground + ink per tone. The ink is not a choice the call site gets to make. */
const tonesFor = (
  t: Semantic
): Record<IconBubbleTone, { background: string; ink: string; border?: string }> => ({
  ink: { background: t.depth.abyss, ink: t.text.primary },
  accent: { background: t.accent.fill, ink: t.accent.onFill },
  'accent-tint': { background: t.accent.tint, ink: t.accent.ink },
  surface: { background: t.surface.raised, ink: t.text.primary },
  'success-tint': { background: t.status.successTint, ink: t.status.success },
  outline: { background: 'transparent', ink: t.text.primary, border: t.border.raised },
  ghost: { background: 'transparent', ink: t.text.secondary },
});

/** A disabled control is a different object, not a dimmed one. */
const disabledFor = (t: Semantic) => ({ background: t.surface.crest, ink: t.text.disabled });

/** The two card corners a rounded bubble can take — `Card`'s own two steps. */
const RADII: Record<IconBubbleRadius, number> = {
  lg: borderRadius.r3,
  xl: borderRadius.r4,
};

/** The drawn glyph-to-bubble ratio, from the design frames. */
const ICON_RATIO = 0.45;

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
    ink: toneInk,
    border,
  } = isDisabled ? { ...disabledFor(t), border: undefined } : tonesFor(t)[tone];
  // A disabled control is one object: its ink is not the call site's to pick.
  const ink = isDisabled ? toneInk : (iconColor ?? toneInk);
  const box = size;
  const glyph = iconSize ?? Math.round(size * ICON_RATIO);

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
    borderRadius: shape === 'circle' ? borderRadius.full : RADII[radius],
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
