/**
 * useSecretScreen - Blocks OS screen capture while key material is on screen.
 *
 * Call this from any component that renders or accepts secret material
 * (mnemonic, private key, recovery phrase). Protection is acquired on mount
 * and released on unmount.
 *
 * What it actually buys us, per platform:
 *
 * - Android: `preventScreenCaptureAsync` sets
 *   `WindowManager.LayoutParams.FLAG_SECURE` on the activity window, which
 *   blocks screenshots, screen recording / MediaProjection, and blanks the
 *   Recents (app-switcher) thumbnail. A real block.
 *
 * - iOS: Apple exposes no API to block a screenshot, so this is weaker.
 *   `preventScreenCaptureAsync` relies on an undocumented side effect of
 *   `UITextField.isSecureTextEntry` to make the captured image come out
 *   blank, and covers the UI when `UIScreen.isCaptured` flips during a
 *   recording. `enableAppSwitcherProtectionAsync` is the documented half: it
 *   blurs the window on `willResignActive`, which is what keeps key material
 *   out of the app-switcher snapshot the OS takes before JS can react.
 *
 * Android does not need the app-switcher call — FLAG_SECURE already covers
 * Recents — and the iOS-only native function throws when it is missing, so
 * it is guarded by platform.
 */
import { useEffect, useId } from 'react';
import { Platform } from 'react-native';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  enableAppSwitcherProtectionAsync,
  disableAppSwitcherProtectionAsync,
} from 'expo-screen-capture';
import { DEBUG_FORCE_CAPTURE_GUARD_IN_DEV } from '../src/debug/captureGuard';

/**
 * The iOS Simulator renders "secure" surfaces (the isSecureTextEntry trick
 * behind preventScreenCaptureAsync) as a black display, not just a black
 * screenshot — a secret screen becomes unusable while developing. No
 * JS-visible signal separates simulator from physical device in this dev
 * client (measured: Constants.platform.ios lost its model id in SDK 55,
 * Platform.constants carries no flag, hostUri reports the LAN IP on both),
 * and expo-device is a native module whose addition would invalidate the
 * installed dev builds. So the guard is skipped in iOS development builds
 * altogether — `__DEV__` is compiled false in release, where the guard
 * always runs — with a debug flag to force it back on when the protection
 * itself is being verified on a physical device.
 */
function shouldSkipCaptureGuard(): boolean {
  return __DEV__ && Platform.OS === 'ios' && !DEBUG_FORCE_CAPTURE_GUARD_IN_DEV;
}

/**
 * Several secret components can be mounted at once (for example one
 * SeedWordInput per word). `enableAppSwitcherProtectionAsync` has no key
 * argument, so it is reference counted here: enable on the first mount,
 * disable only once the last one unmounts. `usePreventScreenCapture` does
 * its own keyed refcounting, which is why each caller passes a unique key.
 */
let appSwitcherRefCount = 0;

function acquireAppSwitcherProtection(): void {
  appSwitcherRefCount += 1;
  if (appSwitcherRefCount === 1) {
    // Fire-and-forget: a failure here must never break a wallet screen, and
    // there is no meaningful recovery beyond the weaker protections above.
    void enableAppSwitcherProtectionAsync().catch(() => {});
  }
}

function releaseAppSwitcherProtection(): void {
  appSwitcherRefCount = Math.max(0, appSwitcherRefCount - 1);
  if (appSwitcherRefCount === 0) {
    void disableAppSwitcherProtectionAsync().catch(() => {});
  }
}

/**
 * @param label Human-readable owner name, used to build a unique capture key
 * so concurrently mounted secret components do not release each other's
 * protection.
 */
export function useSecretScreen(label: string): void {
  const instanceId = useId();

  // Inlined usePreventScreenCapture so the simulator can skip it (a hook
  // cannot be called conditionally); same keyed refcounting underneath.
  useEffect(() => {
    if (shouldSkipCaptureGuard()) return;
    const key = `${label}:${instanceId}`;
    void preventScreenCaptureAsync(key).catch(() => {});
    return () => {
      void allowScreenCaptureAsync(key).catch(() => {});
    };
  }, [label, instanceId]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    acquireAppSwitcherProtection();
    return releaseAppSwitcherProtection;
  }, []);
}

/** Test-only: reset the module-level refcount between cases. */
export function __resetAppSwitcherRefCountForTests(): void {
  appSwitcherRefCount = 0;
}
