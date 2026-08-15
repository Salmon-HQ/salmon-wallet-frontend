/**
 * PrimaryButton - the screen's one committing action.
 *
 * It used to be a white fill with black text. In "Deep Water" it is the one
 * living thing on the screen: a `salmon-500` fill carrying `neutral-1000` ink
 * at 6.50:1 — never white, which measures 3.06:1 and is banned outright — with
 * the scales pressed into the fill at their true 1.0x scale, so the control
 * reads as a warm body rather than a colored rectangle.
 *
 * Disabled drops to `surface.crest` with disabled ink. The salmon never dims:
 * it is either alive or absent.
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
  palette,
  semantic,
  shadowsCSS,
  duration,
  easing,
} from '@salmon/shared';
import { ScalesBackground } from '../ScalesBackground';
import type { PrimaryButtonProps } from './types';

const StyledButton = styled(Button)<{ fullWidth?: boolean }>(({ fullWidth }) => ({
  position: 'relative',
  overflow: 'hidden',
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
  transition: `background-color ${duration.normal} ${easing.ease}, transform ${duration.fastest} ${easing.ease}`,
  '&:hover': {
    backgroundColor: palette.salmon[600],
    boxShadow: shadowsCSS.none,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
  '&.Mui-disabled': {
    backgroundColor: semantic.surface.crest,
    opacity: 1,
    color: semantic.text.disabled,
  },
}));

/** Sits under the label, above the fill. Decoration only, never a hit target. */
const Label = styled('span')({
  position: 'relative',
  zIndex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

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
      {/* The fish: the scales at their true 1.0x scale, pressed into the
          salmon fill and nowhere else. It shifts the 6.50:1 ink composite by
          under 0.1 of a ratio point. Absent when the fill is absent. */}
      {!isDisabled && <ScalesBackground variant="fish" />}
      <Label>
        {loading ? (
          <LoaderWrapper>
            <CircularProgress size={24} sx={{ color: colors.button.primaryText }} />
          </LoaderWrapper>
        ) : (
          children
        )}
      </Label>
    </StyledButton>
  );
}
