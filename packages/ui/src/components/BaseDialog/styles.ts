/**
 * Shared styled components for BaseDialog
 */

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
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border.default}`,
    minWidth: `min(${componentSizes.dialogWidthSm}px, 95vw)`,
    maxWidth: `min(${componentSizes.sheetWidthBase}px, 95vw)`,
  },
});

// ============================================================================
// Header Components
// ============================================================================

export const StyledDialogTitle: React.ComponentType<DialogTitleProps> = styled(DialogTitle)({
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
  color: colors.status.error,
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
  padding: `${spacing.xl}px`,
});

export const MessageText: React.ComponentType<TypographyProps> = styled(Typography)({
  fontSize: fontSize.base,
  color: colors.text.secondary,
  lineHeight: lineHeight.relaxed,
  textAlign: 'center',
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
      borderColor: colors.status.error,
    },
  },
  '& .MuiInputLabel-root': {
    color: colors.text.secondary,
    '&.Mui-focused': {
      color: colors.accent.primary,
    },
    '&.Mui-error': {
      color: colors.status.error,
    },
  },
  '& .MuiOutlinedInput-input': {
    color: colors.text.primary,
  },
  '& .MuiFormHelperText-root': {
    color: colors.status.error,
  },
});

// ============================================================================
// Actions Components
// ============================================================================

export const StyledDialogActions: React.ComponentType<DialogActionsProps> = styled(DialogActions)({
  padding: `${spacing.md}px ${spacing.xl}px ${spacing.xl}px`,
  gap: spacing.md,
});

export const StyledCancelButton: React.ComponentType<ButtonProps> = styled(Button)({
  flex: 1,
  backgroundColor: colors.button.secondaryBackground,
  color: colors.button.secondaryText,
  textTransform: 'none',
  fontWeight: fontWeight.semibold,
  padding: `${spacing.sm}px ${spacing.lg}px`,
  borderRadius: borderRadius.md,
  '&:hover': {
    backgroundColor: colors.card.border,
  },
});

export const StyledActionButton: React.ComponentType<ButtonProps & { $isDanger?: boolean }> =
  styled(Button)<{ $isDanger?: boolean }>(({ $isDanger }) => ({
    flex: 1,
    backgroundColor: $isDanger ? colors.status.error : colors.accent.primary,
    color: colors.text.primary,
    textTransform: 'none',
    fontWeight: fontWeight.semibold,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderRadius: borderRadius.md,
    '&:hover': {
      backgroundColor: $isDanger ? colors.button.destructiveHover : colors.button.dangerHover,
    },
    '&:disabled': {
      backgroundColor: $isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 92, 69, 0.3)',
      color: 'rgba(255, 255, 255, 0.5)',
    },
  }));
