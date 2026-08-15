/**
 * PriceImpactBadge - Displays price impact with color coding based on severity
 *
 * Migrated from packages/ui (React Native) to MUI styled components.
 *
 * Severity levels:
 * - Safe (< 0.5%): Green with checkmark icon
 * - Warning (0.5% - 1%): Yellow/Orange with warning icon
 * - High (> 1%): Red with alert icon
 */

import React from 'react';
import { styled } from '../../utils/styled';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import {
  colors,
  spacing,
  borderRadius,
  getPriceImpactSeverity,
  type PriceImpactSeverity,
  fontSize,
  fontWeight,
  lineHeight,
  componentSizes,
  tabularNums,
} from '@salmon/shared';
import type { PriceImpactBadgeProps } from './types';

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_COLORS: Record<PriceImpactSeverity, string> = {
  safe: colors.status.success,
  warning: colors.status.warning,
  high: colors.status.error,
};

const SIZE_CONFIG = {
  small: {
    iconSize: componentSizes.iconSizeXxs,
    fontSize: fontSize.xs,
    paddingH: spacing.xs,
    paddingV: spacing.xxs,
  },
  medium: {
    iconSize: componentSizes.iconSizeXxsm,
    fontSize: fontSize.sm,
    paddingH: spacing.sm,
    paddingV: spacing.xs,
  },
  large: {
    iconSize: componentSizes.iconSizeXs,
    fontSize: fontSize.base,
    paddingH: spacing.md,
    paddingV: spacing.sm,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

function getSeverityIcon(severity: PriceImpactSeverity, size: number) {
  const sx = { fontSize: size };
  switch (severity) {
    case 'safe':
      return <CheckCircleIcon sx={sx} />;
    case 'warning':
      return <WarningIcon sx={sx} />;
    case 'high':
      return <ErrorIcon sx={sx} />;
  }
}

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled(Box)({
  display: 'inline-flex',
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: borderRadius.sm,
});

// ============================================================================
// Component
// ============================================================================

export function PriceImpactBadge({
  value,
  size = 'medium',
  showIcon = false,
}: PriceImpactBadgeProps) {
  const severity = getPriceImpactSeverity(value);
  const color = SEVERITY_COLORS[severity];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <Container
      sx={{
        backgroundColor: `${color}15`,
        padding: `${sizeConfig.paddingV}px ${sizeConfig.paddingH}px`,
        color,
      }}
    >
      {showIcon && (
        <Box sx={{ display: 'flex', mr: `${spacing.xs}px` }}>
          {getSeverityIcon(severity, sizeConfig.iconSize)}
        </Box>
      )}
      <Typography
        component="span"
        sx={{
          ...tabularNums.css,
          fontSize: sizeConfig.fontSize,
          fontWeight: fontWeight.medium,
          color: 'inherit',
          lineHeight: lineHeight.tight,
        }}
      >
        {value}%
      </Typography>
    </Container>
  );
}
