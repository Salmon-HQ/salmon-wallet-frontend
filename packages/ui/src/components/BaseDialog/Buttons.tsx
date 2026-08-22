/**
 * BaseDialog Button Components
 */

import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { WarningIcon, iconSize } from '../../icons';
import { StyledCancelButton, StyledActionButton } from './styles';
import type { CancelButtonProps, ActionButtonProps } from './types';

/**
 * The way out.
 *
 * `prominent` is passed by every danger dialog: when the alternative destroys a
 * wallet, backing out is the recommended action and gets the recommended
 * action's weight. It also takes the initial focus, so Enter on a dialog nobody
 * read closes it instead of confirming it.
 */
export function CancelButton({
  children,
  onClick,
  disabled = false,
  prominent = false,
  autoFocus = false,
  testID,
}: CancelButtonProps): React.ReactElement {
  return (
    <StyledCancelButton
      $prominent={prominent}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      data-testid={testID}
    >
      {children}
    </StyledCancelButton>
  );
}

/**
 * Primary/Action button with optional danger styling and loading state
 */
export function ActionButton({
  children,
  onClick,
  disabled = false,
  isDanger = false,
  loading = false,
  testID,
}: ActionButtonProps): React.ReactElement {
  return (
    <StyledActionButton
      $isDanger={isDanger}
      onClick={onClick}
      disabled={disabled || loading}
      // Three channels, never colour alone: the opaque danger fill, the warning
      // glyph on the button itself, and the label.
      startIcon={isDanger && !loading ? <WarningIcon size={iconSize.sm} /> : undefined}
      data-testid={testID}
    >
      {loading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : children}
    </StyledActionButton>
  );
}
