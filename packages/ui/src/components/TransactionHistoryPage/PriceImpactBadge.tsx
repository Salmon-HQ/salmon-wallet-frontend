/**
 * PriceImpactBadge — price impact with colour coding by severity, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/Activity/PriceImpactBadge.tsx`:
 * safe (< 0.5%) in success ink with a check, warning (0.5–1%) in warning ink,
 * high (> 1%) in danger ink — each on its own tint, never the hue alone.
 */
import React from 'react';
import {
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  getPriceImpactSeverity,
  spacing,
  withAlpha,
  type PriceImpactSeverity,
  type PriceImpactSize,
  type Semantic,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, WarningCircleIcon, WarningIcon, type IconComponent } from '../../icons';
import type { PriceImpactBadgeProps } from './types';

const SEVERITY_ICONS: Record<PriceImpactSeverity, IconComponent> = {
  safe: CheckCircleIcon,
  warning: WarningIcon,
  high: WarningCircleIcon,
};

const severityColorsFor = (t: Semantic): Record<PriceImpactSeverity, string> => ({
  safe: t.status.success,
  warning: t.status.warning,
  high: t.status.danger,
});

/** The badge's ground: its own ink, faint (mobile's `${color}15`). */
const TINT_ALPHA = 0.08;

const SIZE_CONFIG: Record<
  PriceImpactSize,
  { iconSize: number; fontSize: number; paddingH: number; paddingV: number }
> = {
  small: { iconSize: 12, fontSize: fontSize.micro, paddingH: spacing.xs, paddingV: 2 },
  medium: { iconSize: 14, fontSize: fontSize.caption, paddingH: spacing.sm, paddingV: 4 },
  large: { iconSize: 16, fontSize: fontSize.bodyLg, paddingH: spacing.md, paddingV: 6 },
};

export function PriceImpactBadge({
  value,
  size = 'medium',
  showIcon = false,
  className,
  style,
}: PriceImpactBadgeProps) {
  const t = useSemantic();
  const severity = getPriceImpactSeverity(value);
  const color = severityColorsFor(t)[severity];
  const SeverityIcon = SEVERITY_ICONS[severity];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <span
      data-testid="price-impact-badge"
      data-severity={severity}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        borderRadius: borderRadius.sm,
        backgroundColor: withAlpha(color, TINT_ALPHA),
        padding: `${sizeConfig.paddingV}px ${sizeConfig.paddingH}px`,
        color,
        fontFamily: fontFamily.sans,
        fontWeight: fontWeight.medium,
        fontSize: sizeConfig.fontSize,
        lineHeight: 1,
        ...style,
      }}
    >
      {showIcon && (
        <SeverityIcon
          size={sizeConfig.iconSize}
          color={color}
          weight={severity === 'safe' ? 'fill' : 'regular'}
        />
      )}
      {value}%
    </span>
  );
}
