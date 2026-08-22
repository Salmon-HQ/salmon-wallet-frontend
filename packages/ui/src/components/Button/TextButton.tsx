/**
 * TextButton - Text-only button without background
 *
 * Used for tertiary actions or links.
 * Web version using @emotion/styled for browser extension.
 */
import { styled } from '../../utils/styled';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import {
  colors,
  componentSizes,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  spacing,
  shadowsCSS,
  opacity,
  duration,
  easing,
} from '@salmon/shared';
import type { TextButtonProps } from './types';

const StyledButton = styled(Button)<{ $customColor?: string }>(({ $customColor }) => ({
  minWidth: 'auto',
  height: componentSizes.buttonHeightSmall,
  paddingLeft: spacing.lg,
  paddingRight: spacing.lg,
  background: 'transparent',
  // The control radius. Nothing is filled here, but the focus ring is drawn
  // inset and inherits this, so a square ring on a text button was the one
  // place a control did not look like a control.
  borderRadius: componentSizes.buttonRadius,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  letterSpacing: letterSpacing.wide,
  color: $customColor || colors.text.primary,
  textTransform: 'none',
  boxShadow: shadowsCSS.none,
  transition: `opacity ${duration.normal} ${easing.ease}`,
  '&:hover': {
    background: 'transparent',
    opacity: opacity.low,
    boxShadow: shadowsCSS.none,
  },
  '&:active': {
    background: 'transparent',
  },
  '&.Mui-disabled': {
    background: 'transparent',
    opacity: colors.button.disabledOpacity,
    color: $customColor || colors.text.primary,
  },
}));

const LoaderWrapper = styled('span')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export function TextButton({
  onClick,
  children,
  disabled,
  loading,
  style,
  className,
  color,
  type = 'button',
  testID,
}: TextButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <StyledButton
      onClick={onClick}
      disabled={isDisabled}
      type={type}
      style={style}
      className={className}
      $customColor={color}
      disableRipple={false}
      data-testid={testID}
    >
      {loading ? (
        <LoaderWrapper>
          <CircularProgress size={20} sx={{ color: color || colors.text.primary }} />
        </LoaderWrapper>
      ) : (
        children
      )}
    </StyledButton>
  );
}
