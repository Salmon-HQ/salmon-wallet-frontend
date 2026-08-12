/**
 * PrimaryButton - Main call-to-action button (white background, dark text)
 *
 * Web version using MUI and @emotion/styled for browser extension
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
  shadowsCSS,
  opacity,
  duration,
  easing,
} from '@salmon/shared';
import type { PrimaryButtonProps } from './types';

const StyledButton = styled(Button)<{ fullWidth?: boolean }>(({ fullWidth }) => ({
  width: fullWidth ? '100%' : 'auto',
  minWidth: componentSizes.buttonMinWidth,
  height: componentSizes.buttonHeight,
  backgroundColor: colors.button.primaryBackground,
  borderRadius: componentSizes.buttonRadius,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  fontWeight: fontWeight.bold,
  letterSpacing: letterSpacing.widest,
  color: colors.button.primaryText,
  textTransform: 'none',
  boxShadow: shadowsCSS.none,
  transition: `opacity ${duration.normal} ${easing.ease}, transform ${duration.fastest} ${easing.ease}`,
  '&:hover': {
    backgroundColor: colors.button.primaryBackground,
    opacity: opacity.soft,
    boxShadow: shadowsCSS.none,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&.Mui-disabled': {
    backgroundColor: colors.button.primaryBackground,
    opacity: colors.button.disabledOpacity,
    color: colors.button.primaryText,
  },
}));

const LoaderWrapper = styled('span')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export function PrimaryButton({
  onClick,
  children,
  disabled,
  loading,
  style,
  className,
  fullWidth = true,
  type = 'button',
  testID,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <StyledButton
      onClick={onClick}
      disabled={isDisabled}
      fullWidth={fullWidth}
      type={type}
      style={style}
      className={className}
      disableRipple={false}
      data-testid={testID}
    >
      {loading ? (
        <LoaderWrapper>
          <CircularProgress size={24} sx={{ color: colors.button.primaryText }} />
        </LoaderWrapper>
      ) : (
        children
      )}
    </StyledButton>
  );
}
