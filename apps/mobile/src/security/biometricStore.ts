/**
 * The mobile biometric credential store.
 *
 * Owns every call into `expo-secure-store` and `expo-local-authentication`,
 * so the native modules stay inside `apps/mobile` and `packages/shared` keeps
 * naming the contract without importing either.
 *
 * Two records, written and deleted together:
 *
 * - the **wrapping key**, behind `requireAuthentication` — 32 random bytes the
 *   OS releases only after a successful Face ID / Touch ID check;
 * - the **seal**, unprotected — the vault password encrypted under that
 *   wrapping key, useless without it.
 *
 * Neither is derived from the vault, so re-encrypting the vault (a KDF
 * upgrade, for instance) cannot orphan them. That is the whole of DEV-41.
 *
 * They live under two different `keychainService` values because Expo's own
 * docs warn against mixing authenticated and unauthenticated items in one
 * service. `armed` is decided by the presence of the seal alone — an
 * unprotected read, so asking never raises a prompt.
 */

import {
  generateWrapKey,
  isSealedPassword,
  openSealedPassword,
  sealPassword,
  type BiometricArmResult,
  type BiometricCapabilities,
  type BiometricKind,
  type BiometricStore,
  type BiometricUnlockResult,
  type SealedPassword,
} from '@salmon/shared';
import i18n from 'i18next';

import * as LocalAuthentication from '../../utils/localAuthentication';
import * as SecureStore from '../../utils/secureStore';

// ============================================================================
// Storage layout
// ============================================================================

/** Biometrically-gated. Holds the wrapping key and nothing else. */
const WRAP_KEY_ITEM = 'salmon.bio.wrapKey';
const WRAP_KEY_SERVICE = 'salmon.bio';

/** Unprotected. Holds the sealed password. */
const SEAL_ITEM = 'salmon.bio.seal';
const SEAL_SERVICE = 'salmon.meta';

/**
 * The pre-rebuild records: a raw `DerivedKeyCache` plus three flags that could
 * disagree with each other. Deleted on every arm and disarm so no device keeps
 * a vault key in the keychain after this ships.
 */
const LEGACY_ITEMS = [
  'salmon_biometric_key',
  'salmon_biometric_key_marker',
  'salmon_biometric_key_exists',
  'salmon_biometric_enabled',
] as const;

/** The legacy preference, read once during migration to know what to tell the user. */
const LEGACY_ENABLED_ITEM = 'salmon_biometric_enabled';

/** Set once the legacy records have been swept, so the sweep runs one time. */
const MIGRATED_ITEM = 'salmon.bio.migrated';

/**
 * `ThisDeviceOnly` keeps both records out of iCloud keychain and encrypted
 * backups. The default (`WHEN_UNLOCKED`) is backup-eligible, which a wallet
 * credential must never be — and it was the old implementation's default by
 * omission, not by decision.
 */
const ACCESSIBLE = SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

// ============================================================================
// Helpers
// ============================================================================

function toKind(types: LocalAuthentication.AuthenticationType[]): BiometricKind | null {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'facial';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
  return null;
}

/**
 * Whether an error is the user saying no.
 *
 * Both platforms report a cancellation as a thrown error with the word in its
 * message rather than as a distinct type, so the message is all there is to
 * read. Getting this wrong in the safe direction (a real failure read as a
 * cancellation) costs a silent password field; the unsafe direction is
 * blocked by never deleting anything on a thrown error at all.
 */
function isCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('cancel') || message.includes('canceled') || message.includes('cancelled')
  );
}

async function readSeal(): Promise<SealedPassword | null> {
  try {
    const raw = await SecureStore.getItemAsync(SEAL_ITEM, { keychainService: SEAL_SERVICE });
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSealedPassword(parsed) ? parsed : null;
  } catch {
    // A seal we cannot read is a seal we cannot use. Reporting "not armed" is
    // right: the password field still works, which is the only guarantee that
    // matters.
    return null;
  }
}

async function deleteLegacyRecords(): Promise<void> {
  await Promise.all(
    LEGACY_ITEMS.map(async (item) => {
      try {
        await SecureStore.deleteItemAsync(item);
      } catch {
        // Nothing to do about a delete that fails, and nothing depends on it:
        // no code reads these records any more.
      }
    })
  );
}

// ============================================================================
// Store
// ============================================================================

export async function probe(): Promise<BiometricCapabilities> {
  try {
    const [hasHardware, isEnrolled, types, seal] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
      readSeal(),
    ]);

    return {
      ready: true,
      available: hasHardware && isEnrolled,
      kind: toKind(types),
      armed: seal !== null,
    };
  } catch (error) {
    console.warn('[biometric] capability probe failed:', error);
    return { ready: true, available: false, kind: null, armed: false };
  }
}

/**
 * Seals `password` behind a fresh wrapping key.
 *
 * The explicit prompt before the write is deliberate: iOS evaluates a keychain
 * access control on read and update, never on create, so writing a protected
 * item succeeds silently. Without this the user would enable Face ID and never
 * be asked for it — and would not learn the enrolment was broken until the
 * next launch.
 */
export async function arm(password: string): Promise<BiometricArmResult> {
  try {
    const confirmed = await LocalAuthentication.authenticateAsync({
      promptMessage: i18n.t('lock.biometric_enroll_prompt'),
      disableDeviceFallback: true,
    });

    if (!confirmed.success) {
      return confirmed.error === 'user_cancel' || confirmed.error === 'system_cancel'
        ? 'cancelled'
        : 'failed';
    }

    const wrapKey = generateWrapKey();
    const seal = sealPassword(password, wrapKey);

    // Wrapping key first: `armed` reads the seal, so a failure between the two
    // writes leaves the wallet disarmed with a harmless orphan rather than
    // armed with nothing to open.
    await SecureStore.setItemAsync(WRAP_KEY_ITEM, wrapKey, {
      requireAuthentication: true,
      authenticationPrompt: i18n.t('lock.biometric_prompt'),
      keychainService: WRAP_KEY_SERVICE,
      keychainAccessible: ACCESSIBLE,
    });

    try {
      await SecureStore.setItemAsync(SEAL_ITEM, JSON.stringify(seal), {
        keychainService: SEAL_SERVICE,
        keychainAccessible: ACCESSIBLE,
      });
    } catch (error) {
      await SecureStore.deleteItemAsync(WRAP_KEY_ITEM, { keychainService: WRAP_KEY_SERVICE });
      throw error;
    }

    await deleteLegacyRecords();

    return 'armed';
  } catch (error) {
    if (isCancellation(error)) return 'cancelled';
    console.error('[biometric] arming failed:', error);
    return 'failed';
  }
}

/**
 * Prompts for biometrics and reports precisely what happened.
 *
 * The `invalidated` / `unavailable` split is the fix for DEV-34. Expo resolves
 * `null` both when an item was never written and when the OS destroyed it
 * after a biometric re-enrolment — same value, opposite meanings. Hardware
 * present and enrolled, a seal on disk, and still `null` can only be
 * destruction; anything else is a condition that will pass.
 *
 * Nothing is ever deleted on a thrown error. The old code did, which turned a
 * transient `errSecInteractionNotAllowed` (reading while the screen is locked)
 * into the permanent loss of a working enrolment.
 */
export async function unlock(): Promise<BiometricUnlockResult> {
  const seal = await readSeal();
  if (!seal) {
    return { status: 'unavailable' };
  }

  let wrapKey: string | null;
  try {
    wrapKey = await SecureStore.getItemAsync(WRAP_KEY_ITEM, {
      requireAuthentication: true,
      authenticationPrompt: i18n.t('lock.biometric_prompt'),
      keychainService: WRAP_KEY_SERVICE,
    });
  } catch (error) {
    if (isCancellation(error)) return { status: 'cancelled' };
    console.warn('[biometric] unlock could not read the wrapping key:', error);
    return { status: 'failed', reason: error instanceof Error ? error.message : 'unknown' };
  }

  if (!wrapKey) {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      return { status: 'unavailable' };
    }

    await disarm();
    return { status: 'invalidated' };
  }

  try {
    return { status: 'ok', password: openSealedPassword(seal, wrapKey) };
  } catch (error) {
    // The two records are written together, so a seal the key cannot open is
    // a corrupted pair. It will never open; re-arming is the only way out.
    console.warn('[biometric] the seal did not open:', error);
    await disarm();
    return { status: 'invalidated' };
  }
}

/**
 * One-time sweep of the pre-rebuild records.
 *
 * Those records are a raw vault key sitting in the keychain plus three flags
 * that nothing reads any more. They have to go on every device, not only on
 * the ones whose owner happens to re-arm.
 *
 * @returns whether this user had biometric unlock switched on before the
 * update — the only thing worth telling them, since the new scheme cannot
 * re-arm without the password and their toggle is now honestly off.
 *
 * Fails open in every direction: nothing here can touch the vault, and a
 * sweep that fails leaves the user with a working password unlock.
 */
export async function migrateLegacyRecords(): Promise<boolean> {
  try {
    const done = await SecureStore.getItemAsync(MIGRATED_ITEM, { keychainService: SEAL_SERVICE });
    if (done === 'true') return false;

    let wasEnabled = false;
    try {
      wasEnabled = (await SecureStore.getItemAsync(LEGACY_ENABLED_ITEM)) === 'true';
    } catch {
      // The flag is unprotected, so this should not throw — and if it does,
      // the sweep below still matters more than the notice.
    }

    await deleteLegacyRecords();
    await SecureStore.setItemAsync(MIGRATED_ITEM, 'true', {
      keychainService: SEAL_SERVICE,
      keychainAccessible: ACCESSIBLE,
    });

    return wasEnabled;
  } catch (error) {
    console.warn('[biometric] legacy sweep failed; it will be retried next launch:', error);
    return false;
  }
}

export async function disarm(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(WRAP_KEY_ITEM, { keychainService: WRAP_KEY_SERVICE }).catch(
      () => undefined
    ),
    SecureStore.deleteItemAsync(SEAL_ITEM, { keychainService: SEAL_SERVICE }).catch(
      () => undefined
    ),
    deleteLegacyRecords(),
  ]);
}

export const biometricStore: BiometricStore = { probe, arm, unlock, disarm };
