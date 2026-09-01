/**
 * LockOverlay — the lock screen's own plane.
 *
 * All that is left of the gate. It is not a state machine and it does not
 * move: while the wallet is locked it covers the whole app, above everything,
 * and swallows every touch aimed at what is behind it. Unlocking unmounts it.
 *
 * The lock content mounts its own ground; the overlay only owns the coverage
 * and the touch block, which is exactly what a wallet needs it to guarantee.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface LockOverlayProps {
  children: React.ReactNode;
}

export function LockOverlay({ children }: LockOverlayProps): React.ReactElement {
  return (
    <View testID="lock-overlay" pointerEvents="auto" style={styles.overlay}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above every other plane the shell paints: the water, the tab content,
    // the header slot and any sheet that was open when the lock landed.
    zIndex: 1000,
  },
});

export default LockOverlay;
