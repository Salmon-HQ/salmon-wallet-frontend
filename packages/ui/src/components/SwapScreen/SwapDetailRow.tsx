/**
 * SwapDetailRow - A single row in the swap details section
 *
 * Web version using MUI and @emotion/styled for browser extension.
 * Uses BlurContainer instead of expo BlurView.
 */
import React from 'react';
import { styled } from '../../utils/styled';
import Typography from '@mui/material/Typography';
import {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontWeight,
  fontSize,
  letterSpacing,
  lineHeight,
  componentSizes,
} from '@salmon/shared';
import { BlurContainer } from '../BlurContainer';
import type { SwapDetailRowProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const BlurContent = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.sm}px ${spacing.base}px`,
  minHeight: componentSizes.backButtonSize,
});

const Label = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.slight,
  lineHeight: `${fontSize.md * lineHeight.normal}px`,
});

const Value = styled(Typography)({
  fontSize: fontSize.md,
  fontWeight: fontWeight.bold,
  fontFamily: fontFamily.sans,
  color: colors.text.primary,
  letterSpacing: letterSpacing.slight,
  lineHeight: `${fontSize.md * lineHeight.normal}px`,
});

// ============================================================================
// SwapDetailRow Component
// ============================================================================

/**
 * SwapDetailRow - A single row in the swap details section
 * Displays label on left and value on right with glassmorphism effect
 */
export function SwapDetailRow({ label, value, style }: SwapDetailRowProps): React.ReactElement {
  return (
    <BlurContainer
      style={{
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...style,
      }}
    >
      <BlurContent>
        <Label>{label}</Label>
        <Value>{value}</Value>
      </BlurContent>
    </BlurContainer>
  );
}
