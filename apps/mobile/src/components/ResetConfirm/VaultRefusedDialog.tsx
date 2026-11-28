/**
 * VaultRefusedDialog — what a save, an add or a removal shows when storage
 * read in a way that contradicts the rest and the change was refused: nothing
 * was saved, close and reopen, and if it keeps happening, reset Salmon through
 * `ResetConfirm`, whose first sheet opens once this one has left. The DOM twin
 * is in `packages/ui/src/components/ResetConfirm`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetSheetsCopy, useOpenAfterClosed, type ResetConfirmPropsBase } from '@salmon/shared';

import { ConfirmSheet } from '../ConfirmSheet';
import { ResetConfirm } from './ResetConfirm';
import { useAnnounce } from '../../../hooks/useAnnounce';

/** `onClose` closes this dialog; `onReset` erases, after both reset sheets. */
type VaultRefusedDialogProps = ResetConfirmPropsBase;

export function VaultRefusedDialog({ visible, onClose, onReset }: VaultRefusedDialogProps) {
  const { t } = useTranslation();
  const [resetting, setResetting] = useState(false);
  const refusal = useOpenAfterClosed(() => setResetting(true));
  const copy = resetSheetsCopy(t).refused;
  // It opens by itself after a failed save, with nothing the user pressed to
  // explain it.
  useAnnounce(visible ? copy.title : undefined);

  return (
    <>
      <ConfirmSheet
        visible={visible && !resetting}
        onClose={onClose}
        onClosed={refusal.onClosed}
        {...copy}
        onConfirm={refusal.onConfirm}
      />

      <ResetConfirm visible={resetting} onClose={() => setResetting(false)} onReset={onReset} />
    </>
  );
}
