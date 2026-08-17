/**
 * BaseDialog.Actions - Actions area with buttons
 */

import React from 'react';
import { StyledDialogActions } from './styles';
import type { ActionsProps } from './types';

export function Actions({ children, stacked = false }: ActionsProps): React.ReactElement {
  return <StyledDialogActions $stacked={stacked}>{children}</StyledDialogActions>;
}
