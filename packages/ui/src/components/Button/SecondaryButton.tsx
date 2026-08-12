/**
 * SecondaryButton - Secondary action button (outline/ghost)
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
import type { SecondaryButtonProps } from './types';

const StyledButton = styled(Button)<{
  fullWidth?: boolean;
  $buttonVariant?: 'filled' | 'outline';
}>(({ fullWidth, $buttonVariant = 'filled' }) => ({
  width: fullWidth ? '100%' : 'auto',
  minWidth: componentSizes.buttonMinWidth,
  height: componentSizes.buttonHeight,
  backgroundColor: $buttonVariant === 'outline' ? 'transparent' : colors.button.secondaryBackground,
  border: $buttonVariant === 'outline' ? `1px solid ${colors.border.default}` : 'none',
  borderRadius: componentSizes.buttonRadius,
  fontFamily: fontFamily.sans,
  fontSize: fontSize.md,
  fontWeight: fontWeight.bold,
  letterSpacing: letterSpacing.widest,
  color: colors.button.secondaryText,
  textTransform: 'none',
  boxShadow: shadowsCSS.none,
  transition: `opacity ${duration.normal} ${easing.ease}, transform ${duration.fastest} ${easing.ease}, background-color ${duration.normal} ${easing.ease}`,
  '&:hover': {
    backgroundColor:
      $buttonVariant === 'outline' ? colors.background.card : colors.button.secondaryBackground,
    opacity: opacity.soft,
    boxShadow: shadowsCSS.none,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&.Mui-disabled': {
    backgroundColor:
      $buttonVariant === 'outline' ? 'transparent' : colors.button.secondaryBackground,
    opacity: colors.button.disabledOpacity,
    color: colors.button.secondaryText,
    border: $buttonVariant === 'outline' ? `1px solid ${colors.border.default}` : 'none',
  },
}));

const LoaderWrapper = styled('span')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export function SecondaryButton({
  onClick,
  children,
  disabled,
  loading,
  style,
  className,
  fullWidth = true,
  variant = 'filled',
  type = 'button',
  testID,
}: SecondaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <StyledButton
      onClick={onClick}
      disabled={isDisabled}
      fullWidth={fullWidth}
      $buttonVariant={variant}
      type={type}
      style={style}
      className={className}
      disableRipple={false}
      data-testid={testID}
    >
      {loading ? (
        <LoaderWrapper>
          <CircularProgress size={24} sx={{ color: colors.button.secondaryText }} />
        </LoaderWrapper>
      ) : (
        children
      )}
    </StyledButton>
  );
}
