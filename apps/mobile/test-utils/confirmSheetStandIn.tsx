import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ConfirmSheetProps } from '../src/components/ConfirmSheet';

/** The `onClosed` reports of the sheets that have gone but not yet said so. */
const leaving = new Set<() => void>();

/**
 * The sheets that closed finish leaving: each reports `onClosed`, as the real
 * sheet does once its exit has run. Call it in its own `act`, after asserting
 * what must not show while a sheet is still on its way out.
 */
export function finishClosing(): void {
  const reports = [...leaving];
  leaving.clear();
  reports.forEach((report) => report());
}

/**
 * `ConfirmSheet` as a screen drives it, without its animation. Confirm runs the
 * action, then the sheet closes; an action that rejects keeps it open with
 * `errorText`. Cancel closes. A closed sheet reports `onClosed` only when the
 * test calls `finishClosing()`, so a screen that opens the next sheet before
 * this one has left is caught.
 */
export function ConfirmSheetStandIn({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  onClosed,
  errorText,
  confirmTestID = 'confirm-dialog-confirm',
  cancelTestID = 'confirm-dialog-cancel',
}: ConfirmSheetProps) {
  const [error, setError] = useState<string>();
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });
  const wasVisible = useRef(visible);

  useEffect(() => {
    const closed = wasVisible.current && !visible;
    wasVisible.current = visible;
    if (!closed) return undefined;
    const report = () => onClosedRef.current?.();
    leaving.add(report);
    return () => {
      leaving.delete(report);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <View>
      <Text>{title}</Text>
      <Text>{message}</Text>
      {error ? <Text>{error}</Text> : null}
      <Pressable testID={cancelTestID} onPress={onClose}>
        <Text>{cancelText}</Text>
      </Pressable>
      <Pressable
        testID={confirmTestID}
        onPress={async () => {
          try {
            await onConfirm();
          } catch {
            setError(errorText);
            return;
          }
          onClose();
        }}
      >
        <Text>{confirmText}</Text>
      </Pressable>
    </View>
  );
}
