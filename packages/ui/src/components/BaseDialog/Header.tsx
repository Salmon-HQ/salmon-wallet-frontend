/**
 * BaseDialog.Header - Header with title and close button
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon } from '../../icons';
import { StyledDialogTitle, TitleContainer, TitleText, WarningIcon, CloseButton } from './styles';
import { useBaseDialog } from './BaseDialog';
import type { HeaderProps } from './types';

export function Header({
  title,
  showWarning = false,
  showClose = true,
  onClose,
}: HeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const context = useBaseDialog();
  const handleClose = onClose || context.onClose;

  return (
    <StyledDialogTitle>
      <TitleContainer>
        {showWarning && <WarningIcon />}
        <TitleText>{title}</TitleText>
      </TitleContainer>
      {showClose && (
        <CloseButton
          onClick={handleClose}
          disabled={!context.dismissible}
          aria-label={t('general.close', 'Close')}
        >
          <XIcon />
        </CloseButton>
      )}
    </StyledDialogTitle>
  );
}
