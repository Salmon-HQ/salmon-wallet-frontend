/**
 * PasswordStrengthBar — three bars and a label, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PasswordInput/PasswordStrengthBar.tsx`:
 * weak lights one bar in `status.danger`, medium two in `status.warning`,
 * strong three in `status.success`; the unlit bars are `step.inactive`. All
 * read off the live mode.
 */
import {
  borderRadius,
  componentSizes,
  duration,
  easing,
  fontFamily,
  fontSize,
  fontWeight,
  getPasswordStrengthLabel,
  spacing,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import type { PasswordStrengthBarProps } from './types';

const BAR_COUNT = 3;

export function PasswordStrengthBar({ strength, t, className, style }: PasswordStrengthBarProps) {
  const { status, step } = useSemantic();

  const barColor =
    strength === 'strong' ? status.success : strength === 'medium' ? status.warning : status.danger;
  const activeCount = strength === 'strong' ? 3 : strength === 'medium' ? 2 : 1;
  const label = getPasswordStrengthLabel(strength, t);

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: spacing.xs }}>
        {Array.from({ length: BAR_COUNT }, (_, index) => (
          <div
            key={index}
            style={{
              width: componentSizes.iconSizeLarge,
              height: spacing.xs,
              borderRadius: borderRadius.scrollbar,
              backgroundColor: index < activeCount ? barColor : step.inactive,
              transition: `background-color ${duration.normal} ${easing.ease}`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.medium,
          textTransform: 'capitalize',
          color: barColor,
        }}
      >
        {label}
      </span>
    </div>
  );
}
