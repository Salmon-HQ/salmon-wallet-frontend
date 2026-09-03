/**
 * PrimaryButton - the screen's one committing action, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Button/PrimaryButton.tsx`.
 * A salmon fill carrying `accent.onFill` ink at 6.50:1 — the only legal ink
 * on a salmon fill. Disabled swaps the whole object to `surface.crest` with
 * disabled ink rather than dimming the fill: the salmon is either alive or
 * absent, and so is the flesh inside it.
 *
 * The flesh texture reuses the existing `FleshBackground` DOM component —
 * the same `fleshFills`/`fleshTile` geometry from `@salmon/shared` that
 * mobile draws with `react-native-svg`, already serialised for the DOM there
 * (spec 028's DOM-alternatives table); this component does not redraw it.
 */
import { componentSizes, fontFamily, fontSize, fontWeight, letterSpacing } from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { usePressed } from '../../utils/usePressed';
import { FleshBackground } from '../FleshBackground';
import { ButtonSpinner } from './ButtonSpinner';
import { PressSpecular, setSpecularOrigin } from './PressSpecular';
import type { PrimaryButtonProps } from './types';

/** Mobile's `PRESS_SCALE` — DESIGN.md §Motion's `scale(0.985)`. */
const PRESS_SCALE = 0.985;

export function PrimaryButton({
  onPress,
  children,
  disabled,
  loading,
  fullWidth,
  style,
  className,
  testID,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const { text, accent, surface } = useSemantic();
  const { pressed, handlers } = usePressed();
  const reducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={typeof children === 'string' ? children : undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      onClick={onPress}
      disabled={isDisabled}
      className={className}
      onPointerDown={(e) => {
        handlers.onPointerDown();
        setSpecularOrigin(e);
      }}
      onPointerUp={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerLeave}
      onBlur={handlers.onBlur}
      style={{
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: fullWidth === false ? 'auto' : '100%',
        height: componentSizes.buttonHeight,
        backgroundColor: isDisabled ? surface.crest : accent.fill,
        border: 'none',
        borderRadius: componentSizes.buttonRadius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDisabled ? 'default' : 'pointer',
        fontFamily: fontFamily.sans,
        fontSize: fontSize.bodyLg,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.normal,
        color: isDisabled ? text.disabled : accent.onFill,
        transform: !isDisabled && pressed ? `scale(${PRESS_SCALE})` : 'scale(1)',
        transition: reducedMotion ? 'none' : 'transform 90ms',
        ...style,
      }}
    >
      {/* The flesh: the myosepta of a cut fillet, pressed into the salmon
          fill. A filled button is mass, not surface, so the material it
          shows is the inside of the fish rather than its skin. Absent when
          the fill is absent. */}
      {!isDisabled && <FleshBackground scale={componentSizes.buttonFleshScale} />}
      {loading ? (
        <ButtonSpinner color={isDisabled ? text.disabled : accent.onFill} size={24} />
      ) : (
        <span
          style={{
            position: 'relative',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {children}
        </span>
      )}
      {/* Drawn last so it sits over the flesh; the button's own
          `overflow: hidden` clips it to the pill's radius. */}
      {!isDisabled && <PressSpecular pressed={pressed} reducedMotion={reducedMotion} />}
    </button>
  );
}
