import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';

import { useAccountsContext, getStashItem } from '@salmon/shared';
import { LockOverlay, LockContent } from '../../src/components';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import type { DerivedKeyCache } from '@salmon/shared';
import { FLOAT_DELAY_MS } from '../../src/utils/sinkAndFloat';

/**
 * App shell for the whole `(app)` stack.
 *
 * The lock overlay mounts here, not in `(tabs)/_layout.tsx`: a screen pushed
 * on this stack (Wallets, Activity, Settings sub-screens, a future Send or
 * token detail) sits ABOVE the tabs layout in the stack's own plane, so an
 * overlay mounted inside the tabs layout is behind every pushed screen —
 * exactly the gap this component closes. Rendered as a sibling above
 * `<Stack>`, it covers every screen the stack can ever push.
 *
 * Powerups is the one screen this cannot cover: `presentation:
 * 'fullScreenModal'` gives it its own native window, stacked above this
 * React tree entirely, so no React-level overlay can paint over it. That
 * screen keeps its own close-on-lock effect for exactly that reason.
 */
export default function AppLayout() {
  const router = useRouter();
  const [accountState, accountActions] = useAccountsContext();

  const {
    state: biometricState,
    enableBiometric,
    setEnableBiometric,
    authenticateWithBiometric,
    storeKeyForBiometric,
    refreshState: refreshBiometricState,
  } = useBiometricAuth();

  // The parked unlock release. A password unlock flips `locked` the instant the
  // crypto resolves, and unmounting the overlay takes the unlock wait with it,
  // cutting its wave mid-crossing. The hold keeps the overlay mounted until
  // LockContent reports the wave has left the screen (`onUnlockExited`,
  // watchdog-backed), the same parked pattern the password screen uses.
  const [unlockHeld, setUnlockHeld] = useState(false);
  const isReduceMotionEnabled = useReducedMotion();
  const unlockReleaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    },
    []
  );

  const isLocked = accountState.locked || unlockHeld;

  const handleLockUnlock = useCallback(
    async (password: string): Promise<boolean> => {
      // Held *before* the await: `locked` flips inside unlockAccounts, in an
      // earlier microtask than any state set after it, so holding afterwards
      // leaves one frame where the overlay is gone and the wait unmounts.
      setUnlockHeld(true);
      try {
        const success = await accountActions.unlockAccounts(password);
        if (!success) setUnlockHeld(false);
        return success;
      } catch (err) {
        console.error('Unlock failed:', err);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  // The unlock passage is sequential: hold → the wait's sink
  // (`onUnlockExited` fires as it completes) → one beat of calm water → the
  // overlay leaves. The beat is `FLOAT_DELAY_MS`, the same pause every sink in
  // this water earns. Under reduce motion the passage is a cut, so the release
  // is immediate.
  const handleUnlockExited = useCallback(() => {
    if (isReduceMotionEnabled) {
      setUnlockHeld(false);
      return;
    }
    if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    unlockReleaseTimer.current = setTimeout(() => {
      unlockReleaseTimer.current = null;
      setUnlockHeld(false);
    }, FLOAT_DELAY_MS);
  }, [isReduceMotionEnabled]);

  const handleLockUnlockWithKey = useCallback(
    async (keyJson: string): Promise<boolean> => {
      setUnlockHeld(true);
      try {
        const keyCache: DerivedKeyCache = JSON.parse(keyJson);
        const success = await accountActions.unlockWithCachedKey(keyCache);
        setUnlockHeld(false);
        return success;
      } catch (error) {
        console.error('Biometric unlock failed:', error);
        setUnlockHeld(false);
        return false;
      }
    },
    [accountActions]
  );

  const handleGetDerivedKey = useCallback(async (): Promise<string | null> => {
    try {
      const keyCache = await getStashItem<DerivedKeyCache>('derived_key_cache');
      return keyCache ? JSON.stringify(keyCache) : null;
    } catch {
      return null;
    }
  }, []);

  const handleRemoveAllAccountsFromLock = useCallback(async () => {
    await setEnableBiometric(false);
    await accountActions.removeAllAccounts();
    router.replace('/(auth)');
  }, [accountActions, router, setEnableBiometric]);

  const lockBiometricConfig = React.useMemo(
    () => ({
      state: biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshState: refreshBiometricState,
    }),
    [
      biometricState,
      authenticateWithBiometric,
      storeKeyForBiometric,
      enableBiometric,
      refreshBiometricState,
    ]
  );

  return (
    <>
      {/* Headers stay hidden app-wide: the wallet chrome is the `WalletHeader`
          row the tabs layout renders, and every pushed screen draws the
          kit's own `ScreenHeader`. A native header would double up on both.
          Direction is set once, here: a pushed screen comes in from the
          right and leaves the way it came, and the horizontal gesture is the
          same motion run by hand. Configuring it per screen is how two
          screens end up arriving from different edges. */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wallets" />
        <Stack.Screen name="activity" />
        {/* Powerups browse is a full-height presentation, not a card: the owner
            wants it to cover the Home header entirely, and a card modal leaves
            the parent peeking above it. `fullScreenModal` gives iOS the
            bottom-up cover; `slide_from_bottom` + a vertical gesture give
            Android and the swipe-down dismissal the same direction. */}
        <Stack.Screen
          name="powerups"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureDirection: 'vertical',
          }}
        />
      </Stack>

      {/* The lock screen. It covers every screen this stack can push and
          takes every touch. */}
      {isLocked && (
        <LockOverlay>
          <LockContent
            locked={accountState.locked}
            onUnlock={handleLockUnlock}
            onUnlockWithKey={handleLockUnlockWithKey}
            onGetDerivedKey={handleGetDerivedKey}
            onUnlockExited={handleUnlockExited}
            onRemoveAllAccounts={handleRemoveAllAccountsFromLock}
            biometric={lockBiometricConfig}
          />
        </LockOverlay>
      )}
    </>
  );
}
