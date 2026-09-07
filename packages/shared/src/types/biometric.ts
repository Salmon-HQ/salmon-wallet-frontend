/**
 * The biometric unlock contract, named once for every platform that
 * implements it.
 *
 * The shape that matters here is {@link BiometricUnlockResult}. The old mobile
 * implementation answered `string | null`, which collapsed four different
 * situations — the user tapped cancel, the OS destroyed the enrolment, the
 * device screen was locked, the hardware is absent — into one `null`. The app
 * could not tell "gone forever" from "not right now", so it treated a
 * temporary condition as permanent (deleting a healthy enrolment) and a
 * permanent one as temporary (leaving the Settings toggle reading on with
 * nothing behind it). Every caller of the store must be forced to say which
 * of those it is looking at, so the union is the return type, not a nullable.
 *
 * Platform implementations live in the owning app (`expo-secure-store` on
 * mobile); this package only names the contract, so it stays importable from
 * React Native and the extension alike.
 */

/** Which sensor the device offers, for labelling the prompt. */
export type BiometricKind = 'fingerprint' | 'facial' | 'iris';

/**
 * What a biometric unlock attempt produced.
 *
 * `cancelled` and `unavailable` are non-events: the enrolment stays intact and
 * the UI simply shows the password field. Only `invalidated` disarms.
 */
export type BiometricUnlockResult =
  /** The seal opened. The password is the app's to use and then drop. */
  | { status: 'ok'; password: string }
  /** The user dismissed the prompt. Not an error; show nothing. */
  | { status: 'cancelled' }
  /**
   * The OS destroyed the stored key — biometrics were re-enrolled, reset, or
   * a finger was added. Unrecoverable by design; the user must re-arm.
   */
  | { status: 'invalidated' }
  /**
   * Biometrics cannot be used right now: no hardware, nothing enrolled, or
   * the keychain is unreadable because the device screen is locked. The
   * enrolment is untouched and will work again later.
   */
  | { status: 'unavailable' }
  /** Anything else. The enrolment is untouched. */
  | { status: 'failed'; reason: string };

/** What arming produced. `cancelled` is a user choice, not a failure. */
export type BiometricArmResult = 'armed' | 'cancelled' | 'failed';

/**
 * What the device can do, and whether this wallet is armed on it.
 *
 * `armed` is the single source of truth for the Settings toggle. It replaces
 * the three flags the old implementation kept (`enabled`, `key_exists`,
 * `marker`), which could and did disagree with each other and with the
 * keychain.
 */
export interface BiometricCapabilities {
  /** Whether the capability probe has completed at least once. */
  ready: boolean;
  /** Hardware present AND the user has enrolled biometrics with the OS. */
  available: boolean;
  /** Which sensor, for the prompt's label. */
  kind: BiometricKind | null;
  /** Whether this wallet currently has a usable biometric enrolment. */
  armed: boolean;
}

/**
 * The platform adapter the lock flow talks to.
 *
 * Mobile implements this over `expo-secure-store` + `expo-local-authentication`;
 * the extension has no implementation today (its unlock is password-only) and
 * simply does not supply one.
 */
export interface BiometricStore {
  /** Reads hardware, enrolment and armed state without prompting the user. */
  probe: () => Promise<BiometricCapabilities>;
  /** Seals `password` behind a fresh biometrically-gated wrapping key. */
  arm: (password: string) => Promise<BiometricArmResult>;
  /** Prompts, and reports precisely what happened. */
  unlock: () => Promise<BiometricUnlockResult>;
  /** Deletes both records. Safe to call when nothing is armed. */
  disarm: () => Promise<void>;
}
