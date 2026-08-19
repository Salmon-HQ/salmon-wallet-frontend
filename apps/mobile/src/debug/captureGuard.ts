/**
 * Screen-capture guard override for iOS development.
 *
 * In development on iOS the capture guard is SKIPPED by default, because the
 * iOS Simulator renders "secure" surfaces (the isSecureTextEntry trick behind
 * preventScreenCaptureAsync) as a black display — a secret screen becomes
 * unusable while developing. No JS-visible signal distinguishes the simulator
 * from a physical device in this dev client (the deprecated
 * Constants.platform.ios.platform is gone in SDK 55, Platform.constants has
 * no flag, and hostUri reports the LAN IP on both — all measured), and
 * expo-device is a native module whose addition would invalidate the
 * installed dev builds.
 *
 * Flip this to `true` to force the guard ON in development — needed only when
 * verifying the screenshot protection itself on a physical device. Release
 * builds ignore this file entirely: `__DEV__` is false there and the guard
 * always runs.
 */
export const DEBUG_FORCE_CAPTURE_GUARD_IN_DEV = false;
