/**
 * StandardHeader - Title bar with close button
 *
 * Used by: ReceiveSheet, WalletSwitcherSheet, TransactionHistorySheet, TokenInformationSheet
 *
 * @example
 * ```tsx
 * <BaseSheetDialog.StandardHeader title="Receive" />
 * ```
 */

import React from 'react';
import { styled } from '../../utils/styled';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, fontWeight, letterSpacing } from '@salmon/shared';
import { useBaseSheetDialog } from './BaseSheetDialog';
import type { StandardHeaderProps } from './types';

// ============================================================================
// Styled Components
// ============================================================================

const StyledDialogTitle = styled(DialogTitle)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${spacing.lg}px ${spacing.xl}px`,
  borderBottom: `1px solid ${colors.border.default}`,
  position: 'relative',
  zIndex: 1,
});

const TitleText = styled(Typography)({
  fontSize: fontSize.xl,
  fontWeight: fontWeight.extraBold,
  color: colors.text.primary,
  letterSpacing: letterSpacing.wide,
});

const CloseButton = styled(IconButton)({
  color: colors.text.secondary,
  padding: spacing.xs,
  '&:hover': {
    backgroundColor: colors.background.card,
  },
});

// ============================================================================
// Component
// ============================================================================

/**
 * StandardHeader - Title bar with close button
 */
export function StandardHeader({ title, onClose }: StandardHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const context = useBaseSheetDialog();
  const handleClose = onClose || context.onClose;

  return (
    <StyledDialogTitle>
      <TitleText>{title}</TitleText>
      <CloseButton
        onClick={handleClose}
        aria-label={t('general.close', 'Close')}
        data-testid="sheet-close-button"
      >
        <CloseIcon />
      </CloseButton>
    </StyledDialogTitle>
  );
}
