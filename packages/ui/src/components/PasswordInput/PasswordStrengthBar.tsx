/**
 * PasswordStrengthBar - Visual indicator of password strength
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Displays 3 bars and a label indicating password strength level.
 */
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  getPasswordStrengthLabel,
  fontSize,
  componentSizes,
  duration,
  easing,
} from '@salmon/shared';
import type { PasswordStrengthBarProps } from './types';

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
});

const BarsContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'row',
  gap: spacing.xs,
});

const Bar = styled(Box)<{ $active: boolean; $barColor: string }>(({ $active, $barColor }) => ({
  width: componentSizes.iconSizeLarge,
  height: spacing.xs,
  borderRadius: borderRadius.scrollbar,
  backgroundColor: $active ? $barColor : colors.step.inactive,
  transition: `background-color ${duration.normal} ${easing.ease}`,
}));

const Label = styled(Typography)<{ $labelColor: string }>(({ $labelColor }) => ({
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  textTransform: 'capitalize',
  color: $labelColor,
}));

/**
 * PasswordStrengthBar component for visual password strength feedback
 *
 * Displays three colored bars and a text label:
 * - Weak: 1 bar filled (red)
 * - Medium: 2 bars filled (yellow/amber)
 * - Strong: 3 bars filled (green)
 *
 * @example
 * ```tsx
 * <PasswordStrengthBar strength="medium" />
 * <PasswordStrengthBar strength="strong" t={i18n.t} />
 * ```
 */
export function PasswordStrengthBar({ strength, t, className, style }: PasswordStrengthBarProps) {
  const getStrengthColor = () => {
    switch (strength) {
      case 'strong':
        return colors.status.success;
      case 'medium':
        return colors.status.warning;
      default:
        return colors.status.error;
    }
  };

  const getBarCount = () => {
    switch (strength) {
      case 'strong':
        return 3;
      case 'medium':
        return 2;
      default:
        return 1;
    }
  };

  const barColor = getStrengthColor();
  const activeCount = getBarCount();
  const label = getPasswordStrengthLabel(strength, t);

  return (
    <Container className={className} style={style}>
      <BarsContainer>
        {[0, 1, 2].map((index) => (
          <Bar key={index} $active={index < activeCount} $barColor={barColor} />
        ))}
      </BarsContainer>
      <Label $labelColor={barColor}>{label}</Label>
    </Container>
  );
}
