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
} from 'expo-screen-capture';

/**
 * The native call that turned the blur on, in flight or done: it stays on for
 * the life of the process. Cleared when the call is refused, so the next mount
 * tries again.
 */
let appSwitcherProtection: Promise<void> | null = null;

/**
 * iOS: blur the whole app whenever it is not in focus, so the app-switcher
 * snapshot never shows balances, the address or key material. Mount once, at
 * the root. Android is untouched: its secret screens set FLAG_SECURE through
 * `useSecretScreen`, which also blanks their Recents thumbnail, and the rest
 * of the app stays screenshottable on purpose.
 *
 * It is never turned off — not when a secret screen leaves, not when the root
 * remounts after an error — and it is turned on once, because each native call
 * adds another observer and the call has no count. Full intensity (1.0; the
 * library's default is 0.5) so nothing on the screen stays legible.
 */
export function useAppSwitcherProtection(): void {
  useEffect(() => {
    if (Platform.OS !== 'ios' || appSwitcherProtection) return;
    // The blur covers the key window only: content in a React Native <Modal>
    // is not documented as covered, and no secret renders in one today.
    // A failure must never break the app; it is retried on the next mount.
    appSwitcherProtection = enableAppSwitcherProtectionAsync(1).catch(() => {
      appSwitcherProtection = null;
    });
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
