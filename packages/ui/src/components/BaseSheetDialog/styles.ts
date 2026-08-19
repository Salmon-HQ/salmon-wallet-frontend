/**
 * Shared styled components for BaseSheetDialog
 */

import { styled } from '../../utils/styled';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import { colors, borderRadius } from '@salmon/shared';
import { SIZE_PRESETS } from './types';
import type { ComponentType, CSSProperties } from 'react';

// ============================================================================
// Color Schemes
// ============================================================================

/**
 * The paper carries no fill of its own: the sheet's ground is the material
 * mounted inside it, and an opaque fill on the paper would cover it. Only
 * the edge is a scheme's business. See DESIGN.md §The thermocline is the
 * sheet material.
 */
export const COLOR_SCHEMES = {
  dialog: {
    border: colors.border.default,
  },
  secondary: {
    border: colors.border.default,
  },
} as const;

/**
 * Geometry for the sheet's ground: it fills the paper and sits behind
 * everything the sheet holds. The paper's `overflow: hidden` clips the
 * material to the sheet's corners, so the ground needs no radius of its own.
 */
export const SHEET_GROUND_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
};

// ============================================================================
// Styled Components
// ============================================================================

/**
 * StyledDialog - Main dialog wrapper with size and color scheme support
 */
export const StyledDialog: ComponentType<
  DialogProps & {
    $colorScheme: 'dialog' | 'secondary';
    $size: 'small' | 'medium' | 'large';
  }
> = styled(Dialog)<{
  $colorScheme: 'dialog' | 'secondary';
  $size: 'small' | 'medium' | 'large';
}>(({ $colorScheme, $size }) => ({
  '& .MuiDialog-paper': {
    // No fill, and no MUI dark-mode elevation overlay either — both would
    // paint over the material that grounds the sheet.
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    borderRadius: borderRadius.xl,
    border: `1px solid ${COLOR_SCHEMES[$colorScheme].border}`,
    ...SIZE_PRESETS[$size],
    overflow: 'hidden',
    position: 'relative',
  },
}));

