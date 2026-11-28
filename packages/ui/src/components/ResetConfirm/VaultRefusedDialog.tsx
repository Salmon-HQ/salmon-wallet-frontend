/**
 * VaultRefusedDialog — what a save, an add or a removal shows when storage
 * read in a way that contradicts the rest and the change was refused: nothing
 * was saved, close and reopen, and if it keeps happening, reset Salmon through
 * `ResetConfirm`. The mobile twin is in `apps/mobile/src/components/ResetConfirm`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetSheetsCopy, useOpenAfterClosed, type ResetConfirmPropsBase } from '@salmon/shared';

import { ConfirmDialog } from '../ConfirmDialog';
import { ResetConfirm } from './ResetConfirm';

/** `onClose` closes this dialog; `onReset` erases, after both reset sheets. */
type VaultRefusedDialogProps = ResetConfirmPropsBase;

export function VaultRefusedDialog({
  visible,
  onClose,
  onReset,
}: VaultRefusedDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);
  const refusal = useOpenAfterClosed(() => setResetting(true));

  return (
    <>
      <ConfirmDialog
        visible={visible && !resetting}
        onClose={onClose}
        onClosed={refusal.onClosed}
        {...resetSheetsCopy(t).refused}
        onConfirm={refusal.onConfirm}
      />

      <ResetConfirm visible={resetting} onClose={() => setResetting(false)} onReset={onReset} />
    </>
  );
}
