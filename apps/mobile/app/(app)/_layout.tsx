import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Stack, useRouter, usePathname } from 'expo-router';

import { useAccountsContext, getStashItem } from '@salmon/shared';
import { LockOverlay, LockContent, PowerupsFab } from '../../src/components';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useTabChrome } from '../../hooks/useTabChrome';
import { POWERUPS_SURFACE_ENABLED } from '../../src/powerups/surface';
import { TaskChromeProvider, useTaskChrome } from '../../src/contexts/TaskChromeContext';
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
 * Powerups used to be the one screen this could not cover: as a
 * `fullScreenModal` it had its own native window, stacked above this React
 * tree entirely. It is a plain stack screen now, so the overlay covers it
 * like everything else — and the powerups control below can float above it.
 *
 * `TaskChromeProvider` lives here rather than in the tabs layout: the FAB is
 * app chrome now, mounted outside the tabs, and it has to leave with the Home
 * content when a task takes the screen.
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
    <TaskChromeProvider>
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
        {/* Settings is a sub-stack too (the list plus one screen per
            `SettingsScreen` key). It used to be a `href: null` tab, which is
            why it never slid: a tab switch is not a stack push. On the stack it
            takes the same right slide as everything else — and the lock overlay
            below now covers it, which an overlay above the tabs never did. */}
        <Stack.Screen name="settings" />
        {/* The send flow is its own sub-stack (spec 018): four screens that
            share the flow's state, taking this stack's right slide. */}
        <Stack.Screen name="send" />
        {/* Token and NFT detail are screens of this stack (spec 019), pushed
            from the Portfolio and NFT lists with the same right slide. */}
        <Stack.Screen name="token/[id]" />
        <Stack.Screen name="nft/[id]" />
        {/* Powerups rises from the bottom instead of sliding from the right,
            and swipes down to dismiss. It is a plain screen of THIS stack, not
            a modal: a modal is its own native window and nothing — not the
            lock overlay, not the FAB — can float above it. Full cover comes
            from the screen itself, which paints its own opaque water. */}
        <Stack.Screen
          name="powerups"
          options={{
            animation: 'slide_from_bottom',
            gestureDirection: 'vertical',
          }}
        />
      </Stack>

      {/* One powerups control for both routes, above the stack: Home and the
          browse screen are two screens of the same stack, so the button never
          unmounts between them and the turn plays while the screen rises. */}
      <PowerupsLayer />

      {/* The lock screen. It covers every screen this stack can push and
          takes every touch — Powerups included, now that it is a plain
          screen of this stack. */}
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
    </TaskChromeProvider>
  );
}

/** The two routes the powerups control belongs to. */
const POWERUPS_FAB_ROUTES = ['/', '/powerups'];

/**
 * The single `+`. It floats above the stack, so pressing it on Home and
 * pressing it on the browse screen are the same mounted component: the
 * rotation to the close mark plays while the screen slides up under it,
 * instead of two instances swapping places.
 *
 * Visible only where it means something — Home and Powerups — and gone with
 * the Home content while a task owns the screen, which is the same signal the
 * wallet header row already reads.
 */
function PowerupsLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTaskEngaged } = useTaskChrome();
  // The same bottom math Home's floating content uses — insets only, so it
  // holds outside the tab shell too.
  const { floatingBottomOffset } = useTabChrome();

  const open = pathname === '/powerups';
  const handlePress = useCallback(() => {
    if (open) router.back();
    else router.push('/powerups');
  }, [open, router]);

  if (!POWERUPS_SURFACE_ENABLED || isTaskEngaged || !POWERUPS_FAB_ROUTES.includes(pathname)) {
    return null;
  }

  return <PowerupsFab open={open} onPress={handlePress} bottomOffset={floatingBottomOffset} />;
}
