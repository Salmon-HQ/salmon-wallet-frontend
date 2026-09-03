/**
 * TextButton - text-only button without background, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Button/TextButton.tsx`.
 * Used for tertiary actions or links. `text.accent` ink per DESIGN.md
 * §Buttons — a ghost control that reads as body copy is not a control.
 */
import {
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  motionMs,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { ButtonSpinner } from './ButtonSpinner';
import type { TextButtonProps } from './types';

export function TextButton({
  onPress,
  children,
  disabled,
  loading,
  fullWidth,
  style,
  className,
  color,
  icon,
  testID,
}: TextButtonProps) {
  const isDisabled = disabled || loading;
  const { text, state } = useSemantic();
  const ink = color || text.accent;

  return (
    <button
      type="button"
      data-testid={testID}
      aria-label={children}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      onClick={onPress}
      disabled={isDisabled}
      className={className}
      style={{
        boxSizing: 'border-box',
        width: fullWidth ? '100%' : undefined,
        height: componentSizes.buttonHeightSmall,
        background: 'transparent',
        border: 'none',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        cursor: isDisabled ? 'default' : 'pointer',
        fontFamily: fontFamily.sans,
        fontSize: fontSize.body,
        fontWeight: fontWeight.semibold,
        color: ink,
        opacity: isDisabled ? state.disabledOpacity : 1,
        transition: `opacity ${motionMs.flick}ms`,
        ...style,
      }}
    >
      {loading ? (
        <ButtonSpinner color={ink} size={16} />
      ) : (
        <>
          {icon}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
