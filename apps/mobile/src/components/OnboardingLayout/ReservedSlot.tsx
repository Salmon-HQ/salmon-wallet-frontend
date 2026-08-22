/**
 * ReservedSlot — keeps a conditional control's space without keeping the
 * control.
 *
 * The single worst defect the layout audit found was the recover screen's
 * "Next" button appearing the moment the twelfth valid word is typed: 72pt
 * arrives inside a centred column and the mark, title, description and input
 * all jump 36pt while the user is still typing. The fix is the pattern the
 * screen's own web twin already used — reserve the slot, hide the control.
 *
 * Hidden means hidden, not transparent: the subtree is removed from the
 * accessibility tree and cannot be focused or pressed, so a screen reader
 * never lands on a control that is not really there.
 */
import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

export interface ReservedSlotProps {
  /** Whether the child is really present. When false, only its space is. */
  visible: boolean;
  children: ReactNode;
}

export function ReservedSlot({ visible, children }: ReservedSlotProps) {
  return (
    <View
      style={visible ? undefined : styles.hidden}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
});
