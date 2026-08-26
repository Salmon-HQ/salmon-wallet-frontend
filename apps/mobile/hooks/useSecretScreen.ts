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
 * - iOS: only `enableAppSwitcherProtectionAsync`, which blurs the window on
 *   `willResignActive` and keeps key material out of the app-switcher
 *   snapshot. Screenshot prevention is deliberately NOT attempted on iOS:
 *   Apple exposes no API for it, and `preventScreenCaptureAsync`'s
 *   workaround — reparenting the visible layers into a secure
 *   `UITextField` — renders the LIVE screen black on some devices, not just
 *   the captured image (expo/expo#24041; reproduced on a physical device in
 *   the 1.0.3 (14) TestFlight build, where every secret surface opened
 *   black, and on the iOS Simulator). A wallet screen the user cannot see
 *   is a worse failure than a screenshot the user chooses to take.
 */
import { useEffect, useId } from 'react';
import { Platform } from 'react-native';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
  enableAppSwitcherProtectionAsync,
  disableAppSwitcherProtectionAsync,
} from 'expo-screen-capture';

/**
 * Several secret components can be mounted at once (for example one
 * SeedWordInput per word). `enableAppSwitcherProtectionAsync` has no key
 * argument, so it is reference counted here: enable on the first mount,
 * disable only once the last one unmounts. `preventScreenCaptureAsync` does
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

  // Android only: FLAG_SECURE, the real block. On iOS the equivalent call
  // blacks out the live screen on some devices — see the header comment.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
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
