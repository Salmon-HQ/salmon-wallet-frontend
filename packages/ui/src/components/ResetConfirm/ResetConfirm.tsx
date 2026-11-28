/**
 * ResetConfirm — the reset behind "Forgot my password", on the DOM: a warning,
 * then the last word, and only the last word erases. The mobile twin is
 * `apps/mobile/src/components/ResetConfirm`.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetSheetsCopy, useOpenAfterClosed, type ResetConfirmPropsBase } from '@salmon/shared';

import { ConfirmDialog } from '../ConfirmDialog';

type ResetConfirmProps = ResetConfirmPropsBase;

export function ResetConfirm({ visible, onClose, onReset }: ResetConfirmProps): React.ReactElement {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const { warn, last } = resetSheetsCopy(t);
  // The last word opens once the warning has left: shown at once, both sheets
  // stood on screen together, and a fast double click walked through them.
  const advance = useOpenAfterClosed(() => setConfirming(true));

  return (
    <>
      <ConfirmDialog
        visible={visible && !confirming}
        onClose={onClose}
        onClosed={advance.onClosed}
        {...warn}
        onConfirm={advance.onConfirm}
      />

      <ConfirmDialog
        visible={confirming}
        onClose={() => {
          setConfirming(false);
          onClose();
        }}
        {...last}
        errorText={t('lock.reset_failed')}
        onConfirm={onReset}
      />
    </>
  );
}
