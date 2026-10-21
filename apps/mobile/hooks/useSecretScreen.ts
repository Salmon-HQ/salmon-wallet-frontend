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
 * - iOS: nothing here. `useAppSwitcherProtection`, mounted once at the root,
 *   blurs the window on `willResignActive` for the whole app, which keeps key
 *   material — and balances and the address — out of the app-switcher
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
 * iOS: blur the whole app whenever it is not in focus, so the app-switcher
 * snapshot never shows balances, the address or key material. Mount once, at
 * the root. Android is untouched: its secret screens set FLAG_SECURE through
 * `useSecretScreen`, which also blanks their Recents thumbnail, and the rest
 * of the app stays screenshottable on purpose.
 *
 * The native call has no key or count, so this is its only caller: a secret
 * screen disabling it on unmount would switch it off for the whole app.
 */
export function useAppSwitcherProtection(): void {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // Fire-and-forget: a failure here must never break the app.
    void enableAppSwitcherProtectionAsync().catch(() => {});
    return () => {
      void disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);
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
}
