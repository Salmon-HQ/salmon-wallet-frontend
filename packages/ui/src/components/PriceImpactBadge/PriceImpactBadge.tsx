/**
 * PriceImpactBadge — price impact with colour coding by severity, on the DOM.
 *
 * The mobile twin is `apps/mobile/src/components/PriceImpactBadge/PriceImpactBadge.tsx`:
 * safe (< 0.5%) in success ink with a check, warning (0.5–1%) in warning ink,
 * high (> 1%) in danger ink — each on its own tint, never the hue alone.
 */
import React from 'react';
import {
  borderRadius,
  fontFamily,
  fontWeight,
  getPriceImpactSeverity,
  priceImpactInkFor,
  PRICE_IMPACT_SIZES,
  spacing,
  withAlpha,
  type PriceImpactSeverity,
} from '@salmon/shared';

import { useSemantic } from '../../theme/ThemeProvider';
import { CheckCircleIcon, WarningCircleIcon, WarningIcon, type IconComponent } from '../../icons';
import type { PriceImpactBadgeProps } from './types';

const SEVERITY_ICONS: Record<PriceImpactSeverity, IconComponent> = {
  safe: CheckCircleIcon,
  warning: WarningIcon,
  high: WarningCircleIcon,
};

/** The badge's ground: its own ink, faint (mobile's `${color}15`). */
const TINT_ALPHA = 0.08;

export function PriceImpactBadge({
  value,
  size = 'medium',
  showIcon = false,
  className,
  style,
}: PriceImpactBadgeProps) {
  const t = useSemantic();
  const severity = getPriceImpactSeverity(value);
  const color = priceImpactInkFor(t)[severity];
  const SeverityIcon = SEVERITY_ICONS[severity];
  const sizeConfig = PRICE_IMPACT_SIZES[size];

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
