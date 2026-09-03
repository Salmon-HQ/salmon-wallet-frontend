/**
 * SecondaryButton - the outlined control, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Button/SecondaryButton.tsx`.
 * Transparent fill, `border.raised` stroke, primary ink. `tone="danger"`
 * swaps to danger ink and a danger edge for a destructive action that must
 * not borrow the salmon fill; `tone="danger-fill"` is the filled destructive
 * plane, whose only ink that clears AA in both modes is `status.onFill`.
 */
import {
  borderWidth,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  motionMs,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { useReducedMotion } from '../../motion';
import { usePressed } from '../../utils/usePressed';
import { ButtonSpinner } from './ButtonSpinner';
import { PressSpecular, setSpecularOrigin } from './PressSpecular';
import type { SecondaryButtonProps } from './types';

/** Mobile's `PRESS_SCALE` — DESIGN.md §Motion's `scale(0.985)`. */
const PRESS_SCALE = 0.985;

export function SecondaryButton({
  onPress,
  children,
  disabled,
  loading,
  tone = 'default',
  fullWidth,
  style,
  className,
  icon,
  trailingIcon,
  testID,
  accessibilityHint,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;
  const isDanger = tone === 'danger';
  const isDangerFill = tone === 'danger-fill';
  const { text, status, border, state } = useSemantic();
  const { pressed, handlers } = usePressed();
  const reducedMotion = useReducedMotion();

  const background = isDangerFill ? status.dangerFill : 'transparent';
  const edgeColor = isDangerFill ? status.dangerFill : isDanger ? status.danger : border.raised;
  const ink = isDangerFill ? status.onFill : isDanger ? status.danger : text.primary;

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={children}
      aria-describedby={undefined}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      title={accessibilityHint}
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
        minHeight: componentSizes.buttonHeight,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        backgroundColor: background,
        borderStyle: 'solid',
        borderWidth: borderWidth.thin,
        borderColor: edgeColor,
        borderRadius: componentSizes.buttonRadius,
        display: 'flex',
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDisabled ? 'default' : 'pointer',
        fontFamily: fontFamily.sans,
        fontSize: fontSize.bodyLg,
        fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.normal,
        color: ink,
        opacity: isDisabled ? state.disabledOpacity : 1,
        transform: !isDisabled && pressed ? `scale(${PRESS_SCALE})` : 'scale(1)',
        transition: reducedMotion ? 'none' : `transform ${motionMs.flick}ms`,
        ...style,
      }}
    >
      {loading ? (
        <ButtonSpinner color={isDangerFill ? status.onFill : text.primary} />
      ) : (
        <>
          {icon}
          <span>{children}</span>
          {trailingIcon}
        </>
      )}
      {!isDisabled && <PressSpecular pressed={pressed} reducedMotion={reducedMotion} />}
    </button>
  );
}
