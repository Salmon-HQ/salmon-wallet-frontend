import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Stack, useRouter, usePathname } from 'expo-router';

import {
  SignatureRequestProvider,
  isSignableSolanaAccount,
  useAccountsContext,
} from '@salmon/shared';
import {
  ConfirmationHost,
  LockOverlay,
  LockContent,
  PowerupsFab,
} from '../../src/components';
import { useBiometric } from '../../src/contexts/BiometricContext';
import { useTabChrome } from '../../hooks/useTabChrome';
import { POWERUPS_ENABLED } from '../../src/powerups';
import { TaskChromeProvider, useTaskChrome } from '../../src/contexts/TaskChromeContext';
import { DerivedAccountsProvider } from '../../src/contexts/DerivedAccountsContext';
import { DeveloperModeProvider } from '../../src/contexts/DeveloperModeContext';
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
 *
 * `DerivedAccountsProvider` sits beside it for the same reason: the automatic
 * derived-account scan belongs to the unlocked session, not to a screen, so it
 * starts on the first unlocked mount and is not restarted by navigation.
 */
export default function AppLayout() {
  const router = useRouter();
  const [accountState, accountActions] = useAccountsContext();

  const {
    available: biometricAvailable,
    armed: biometricArmed,
    kind: biometricKind,
    needsReArm: biometricNeedsReArm,
    unlock: biometricUnlock,
    disarm: disarmBiometric,
    refresh: refreshBiometricState,
  } = useBiometric();

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
  // The screen surfaces when the OVERLAY leaves — not when the wait inside it
  // does. Home keys its content on the count, so the float plays on water the
  // user can actually see.
  //
  // This is the only publisher on the unlock path: the lock's `LoadingScreen`
  // passes `surfaces={false}` precisely because its departure is one beat too
  // early. It leaves, the water column holds for `FLOAT_DELAY_MS` with nothing
  // on it, and then the overlay goes and Home floats up through the same
  // ground it was standing on all along — the passage the owner asked for
  // (2026-09-07), and the one every other step swap in the app already
  // speaks. Every wait with no overlay over it still surfaces itself.
  //
  // It is bumped from `release` below, NOT from an effect on `isLocked`. An
  // effect runs after the commit that removed the overlay, so one frame
  // painted with Home fully assembled and at rest and the float then played on
  // content the user had already watched arrive — arrival, then arrival again
  // (spec 031 §D2).
  const [surfaceKey, setSurfaceKey] = useState(0);

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
  /**
   * The gate opens and the screen surfaces in ONE commit.
   *
   * Both sets are in the same callback, so React batches them: the overlay is
   * removed and the new `home-content` is mounted in the same tree update.
   * Reanimated registers a view's entering animation in its constructor, so
   * that instance's first paint already carries the float's `initialValues` —
   * there is no at-rest frame to see.
   */
  const release = useCallback(() => {
    setUnlockHeld(false);
    setSurfaceKey((key) => key + 1);
  }, []);

  const handleUnlockExited = useCallback(() => {
    if (isReduceMotionEnabled) {
      release();
      return;
    }
    if (unlockReleaseTimer.current !== null) clearTimeout(unlockReleaseTimer.current);
    unlockReleaseTimer.current = setTimeout(() => {
      unlockReleaseTimer.current = null;
      release();
    }, FLOAT_DELAY_MS);
  }, [isReduceMotionEnabled, release]);

  const handleRemoveAllAccountsFromLock = useCallback(async () => {
    await disarmBiometric();
    await accountActions.removeAllAccounts();
    router.replace('/(auth)');
  }, [accountActions, router, disarmBiometric]);

  const lockBiometricConfig = React.useMemo(
    () => ({
      available: biometricAvailable,
      armed: biometricArmed,
      kind: biometricKind,
      needsReArm: biometricNeedsReArm,
      unlock: biometricUnlock,
      refresh: refreshBiometricState,
    }),
    [
      biometricAvailable,
      biometricArmed,
      biometricKind,
      biometricNeedsReArm,
      biometricUnlock,
      refreshBiometricState,
    ]
  );

  // The account core signs with: the active one when it can sign on Solana,
  // otherwise none — a watch-only wallet reaches the confirmation and is
  // refused there (spec 027 §2).
  const signingAccount =
    accountState.activeBlockchainAccount && isSignableSolanaAccount(accountState.activeBlockchainAccount)
      ? accountState.activeBlockchainAccount
      : null;

  return (
    <TaskChromeProvider surfaceKey={surfaceKey}>
      <DerivedAccountsProvider>
        <SignatureRequestProvider account={signingAccount}>
        {/* The developer-mode settings belong to the unlocked session, not to
          a screen. Mounted inside the tabs layout (where they used to live)
          every screen this stack pushes — Activity, Send, NFT detail,
          Powerups — sat ABOVE the provider and read the context default
          instead of the stored flag. */}
        <DeveloperModeProvider>
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
            {/* The Swap Powerup, a screen of this stack pushed from the
            catalogue. Its body is behind the build flag; the route itself is
            always registered (`swap.tsx`). */}
            <Stack.Screen name="swap" />
            {/* Powerups rises from the bottom instead of sliding from the right,
            and swipes down to dismiss. It is a plain screen of THIS stack, not
            a modal: a modal is its own native window and nothing — not the
            lock overlay, not the FAB — can float above it. Full cover comes
            from the screen itself, which paints its own opaque water.

            The route is registered and its choreography kept, but the screen
            behind it is closed for this release: `powerups.tsx` redirects Home
            and the body is parked in `src/screens/PowerupsRoute.tsx`. */}
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

          {/* Core's confirmation window, above every screen a Powerup can
          propose from: the one place a proposal is reviewed and signed. */}
          <ConfirmationHost />

          {/* The lock screen. It covers every screen this stack can push and
          takes every touch — Powerups included, now that it is a plain
          screen of this stack. */}
          {isLocked && (
            <LockOverlay>
              <LockContent
                locked={accountState.locked}
                onUnlock={handleLockUnlock}
                onUnlockExited={handleUnlockExited}
                onRemoveAllAccounts={handleRemoveAllAccountsFromLock}
                biometric={lockBiometricConfig}
              />
            </LockOverlay>
          )}
        </DeveloperModeProvider>
        </SignatureRequestProvider>
      </DerivedAccountsProvider>
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

  if (!POWERUPS_ENABLED || isTaskEngaged || !POWERUPS_FAB_ROUTES.includes(pathname)) {
    return null;
  }

  return <PowerupsFab open={open} onPress={handlePress} bottomOffset={floatingBottomOffset} />;
}
