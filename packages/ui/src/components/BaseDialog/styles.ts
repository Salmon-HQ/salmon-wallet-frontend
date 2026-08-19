/**
 * Shared styled components for BaseDialog
 */

import type { CSSProperties } from 'react';
import { styled } from '../../utils/styled';
import Dialog from '@mui/material/Dialog';
import type { DialogProps } from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import type { DialogTitleProps } from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import type { DialogContentProps } from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import type { DialogActionsProps } from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import type { IconButtonProps } from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { TypographyProps } from '@mui/material/Typography';
import { WarningIcon as WarningGlyph, iconSize } from '../../icons';
import type { IconProps } from '../../icons';
import {
  colors,
  semantic,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  lineHeight,
  componentSizes,
} from '@salmon/shared';

// ============================================================================
// Dialog Root
// ============================================================================

export const StyledDialog: React.ComponentType<DialogProps> = styled(Dialog)({
  '& .MuiDialog-paper': {
    // The paper carries no fill of its own: the dialog's ground is the
    // material mounted inside it, and an opaque fill — or MUI's dark-mode
    // elevation overlay, which is a background image — would paint over it.
    // The radius, the border and the clip stay, so the material follows the
    // dialog's corners. See DESIGN.md §The thermocline is the sheet material.
    backgroundColor: 'transparent',
    backgroundImage: 'none',
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border.default}`,
    minWidth: `min(${componentSizes.dialogWidthSm}px, 95vw)`,
    maxWidth: `min(${componentSizes.sheetWidthBase}px, 95vw)`,
    overflow: 'hidden',
    position: 'relative',
  },
});

/**
 * Geometry for the dialog's ground: it fills the paper and sits behind
 * everything the dialog holds. The paper's `overflow: hidden` clips the
 * material to the dialog's corners, so the ground needs no radius of its own.
 */
export const DIALOG_GROUND_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
};

/**
 * The dialog's sections sit above the ground. They have to be positioned to
 * do it: the material is an absolutely positioned layer, and an unpositioned
 * sibling paints beneath one whatever its z-index says.
 */
const ABOVE_GROUND = {
  position: 'relative' as const,
  zIndex: 1,
};

// ============================================================================
// Header Components
// ============================================================================

export const StyledDialogTitle: React.ComponentType<DialogTitleProps> = styled(DialogTitle)({
  ...ABOVE_GROUND,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.lg}px ${spacing.xl}px`,
  borderBottom: `1px solid ${colors.border.default}`,
});

export const TitleContainer: React.ComponentType<React.HTMLAttributes<HTMLDivElement>> = styled(
  'div'
)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
});

export const TitleText: React.ComponentType<TypographyProps> = styled(Typography)({
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: colors.text.primary,
});

export const WarningIcon: React.ComponentType<IconProps> = styled(WarningGlyph)({
  color: semantic.status.danger,
  width: iconSize.lg,
  height: iconSize.lg,
});

export const CloseButton: React.ComponentType<IconButtonProps> = styled(IconButton)({
  color: colors.text.secondary,
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

// ============================================================================
// Content Components
// ============================================================================

export const StyledDialogContent: React.ComponentType<DialogContentProps> = styled(DialogContent)({
  ...ABOVE_GROUND,
  padding: `${spacing.xl}px`,
});

export const MessageText: React.ComponentType<TypographyProps> = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.text.secondary,
  lineHeight: lineHeight.relaxed,
  // Left-aligned, not centred: a confirmation message is usually two or three
  // lines, and a ragged left edge costs the reader a new start position on
  // every line — the one place in the app where re-reading is the point.
  textAlign: 'start',
});

// ============================================================================
// TextField Components
// ============================================================================

export const StyledTextField: React.ComponentType<TextFieldProps> = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    '& fieldset': {
      borderColor: colors.border.default,
    },
    '&:hover fieldset': {
      borderColor: colors.border.light,
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.accent.primary,
    },
    '&.Mui-error fieldset': {
      borderColor: semantic.status.danger,
    },
  },
  '& .MuiInputLabel-root': {
    color: colors.text.secondary,
    '&.Mui-focused': {
      color: colors.accent.primary,
    },
    '&.Mui-error': {
      color: semantic.status.danger,
    },
  },
  '& .MuiOutlinedInput-input': {
    color: colors.text.primary,
  },
  '& .MuiFormHelperText-root': {
    color: semantic.status.danger,
  },
});

// ============================================================================
// Actions Components
// ============================================================================

/**
 * A danger dialog stacks its buttons instead of splitting the row.
 *
 * Two reasons, both observed on the extension popup: side by side at 360px the
 * destructive label ("Delete All Data", "Yes, remove all") breaks across two
 * lines, and an equal-width pair says the two outcomes are equally ordinary.
 * Stacked, each button gets the full column, and the order top-to-bottom is the
 * order of preference.
 */
export const StyledDialogActions: React.ComponentType<DialogActionsProps & { $stacked?: boolean }> =
  styled(DialogActions)<{ $stacked?: boolean }>(({ $stacked }) => ({
    ...ABOVE_GROUND,
    padding: `${spacing.md}px ${spacing.xl}px ${spacing.xl}px`,
    gap: spacing.md,
    ...($stacked
      ? { flexDirection: 'column', alignItems: 'stretch', '& > :not(:first-of-type)': { margin: 0 } }
      : null),
  }));

const controlBase = {
  textTransform: 'none',
  fontWeight: fontWeight.semibold,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: borderRadius.md,
  // A control label is a label, not a paragraph. Wrapping it turns a 40px
  // button into a 60px one and reads as two separate lines of instruction.
  whiteSpace: 'nowrap' as const,
};

/**
 * The safe way out. On a danger dialog it is `$prominent`, which gives it the
 * salmon fill the confirming action normally wears: on a dialog that destroys a
 * wallet, not destroying it *is* the recommended action, so it should be the
 * button the eye lands on and the thumb finds first.
 */
export const StyledCancelButton: React.ComponentType<ButtonProps & { $prominent?: boolean }> =
  styled(Button)<{ $prominent?: boolean }>(({ $prominent }) => ({
    flex: 1,
    ...controlBase,
    backgroundColor: $prominent ? colors.accent.primary : colors.button.secondaryBackground,
    // `text.onAccent` (neutral-1000, 6.50:1) is the only ink allowed on a
    // salmon fill; white on salmon is 3.06:1 and banned by DESIGN.md.
    color: $prominent ? semantic.text.onAccent : colors.button.secondaryText,
    '&:hover': {
      backgroundColor: $prominent ? colors.button.dangerHover : colors.card.border,
    },
  }));

/**
 * The committing action.
 *
 * The danger fill is `status.dangerFill` (`danger-700`) with `text.primary`
 * ink — 6.58:1. It replaces a `danger-500` fill that carried the same light ink
 * at **2.50:1**, worse than the white-on-salmon pairing DESIGN.md bans outright
 * at 3.06:1. `danger-700` is also, textually, the fill DESIGN.md defines for
 * danger; `danger-500` is its *ink*, and using ink as a fill is what produced
 * the illegal pair. The other legal exit — `neutral-1000` on `danger-500`,
 * 7.28:1 — was rejected on hierarchy, not on contrast: a light fill with dark
 * ink is exactly the shape of the primary CTA, and the one thing a
 * wallet-deleting button must not look like is the button you press to proceed.
 */
export const StyledActionButton: React.ComponentType<ButtonProps & { $isDanger?: boolean }> =
  styled(Button)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
    flex: 1,
    ...controlBase,
    backgroundColor: $isDanger ? semantic.status.dangerFill : colors.accent.primary,
    color: $isDanger ? semantic.text.primary : semantic.text.onAccent,
    '&:hover': {
      backgroundColor: $isDanger ? semantic.status.dangerFill : colors.button.dangerHover,
      // The state overlay rather than a lighter fill: every lighter step on the
      // danger ramp drops the label below AA again.
      ...($isDanger
        ? {
            backgroundImage: `linear-gradient(${semantic.state.hover}, ${semantic.state.hover})`,
          }
        : null),
    },
    // DESIGN.md's disabled rule, which both branches now follow: the fill
    // drops to `surface.crest` and the label to `text.disabled`. Dimming the
    // fill instead leaves a desaturated maroon carrying a greyed label — the
    // one low-contrast element left in the dialog after the rest was fixed.
    // The colour is either alive or absent; it is never half-lit.
    '&:disabled': {
      backgroundColor: semantic.surface.crest,
      backgroundImage: 'none',
      color: semantic.text.disabled,
      opacity: semantic.state.disabledOpacity,
    },
  }));
