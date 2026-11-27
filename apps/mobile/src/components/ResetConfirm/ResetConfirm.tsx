/**
 * ResetConfirm — the reset behind "Forgot my password": a warning, then the
 * last word, and only the last word erases. Two sheets, one at a time: the
 * second opens once the first has left (iOS presents one sheet at a time), and
 * only if the user went on rather than backing out. The DOM twin is
 * `packages/ui/src/components/ResetConfirm`.
 */
import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { resetSheetsCopy, useOpenAfterClosed, type ResetConfirmPropsBase } from '@salmon/shared';

import { ConfirmSheet } from '../ConfirmSheet';

type ResetConfirmProps = ResetConfirmPropsBase;

export function ResetConfirm({ visible, onClose, onReset }: ResetConfirmProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const { warn, last } = resetSheetsCopy(t);
  const advance = useOpenAfterClosed(() => setConfirming(true));
  const handleReset = useCallback(async () => {
    try {
      await onReset();
    } catch (err) {
      console.error('Failed to reset wallet:', err);
      Alert.alert(t('general.error'), t('lock.reset_failed'));
    }
  }, [onReset, t]);

  return (
    <>
      <ConfirmSheet
        visible={visible && !confirming}
        onClose={onClose}
        onClosed={advance.onClosed}
        {...warn}
        onConfirm={advance.onConfirm}
      />

      <ConfirmSheet
        visible={confirming}
        onClose={() => {
          setConfirming(false);
          onClose();
        }}
        {...last}
        onConfirm={handleReset}
      />
    </>
  );
}
