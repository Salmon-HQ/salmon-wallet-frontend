jest.mock('../../utils/secureStore', () => ({
  __esModule: true,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 3,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../utils/localAuthentication', () => ({
  __esModule: true,
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('i18next', () => ({ __esModule: true, default: { t: (key: string) => key } }));

// The real seal, not a stub: these tests arm and then unlock, so the crypto
// they exercise has to be the crypto that ships. The package barrel itself
// cannot be loaded here — it pulls Solana Kit, which is ESM-only under Jest.
jest.mock('@salmon/shared', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../packages/shared/src/crypto/biometric-seal'),
}));

import * as SecureStoreModule from '../../utils/secureStore';
import * as LocalAuthModule from '../../utils/localAuthentication';
import { arm, disarm, migrateLegacyRecords, probe, unlock } from './biometricStore';

const store = SecureStoreModule as unknown as {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const auth = LocalAuthModule as unknown as {
  hasHardwareAsync: jest.Mock;
  isEnrolledAsync: jest.Mock;
  supportedAuthenticationTypesAsync: jest.Mock;
  authenticateAsync: jest.Mock;
};

const WRAP_KEY_ITEM = 'salmon.bio.wrapKey';
const SEAL_ITEM = 'salmon.bio.seal';

/** The device every test starts on: Face ID present and enrolled. */
function deviceWithBiometrics() {
  auth.hasHardwareAsync.mockResolvedValue(true);
  auth.isEnrolledAsync.mockResolvedValue(true);
  auth.supportedAuthenticationTypesAsync.mockResolvedValue([2]);
  auth.authenticateAsync.mockResolvedValue({ success: true });
}

/**
 * Runs a real arm against the mocked store and returns what it wrote, so the
 * unlock tests read the same records the arm produced rather than fixtures
 * that could drift from the format.
 */
async function armAndCaptureRecords(password: string) {
  const written = new Map<string, string>();
  store.setItemAsync.mockImplementation(async (key: string, value: string) => {
    written.set(key, value);
  });

  const result = await arm(password);
  expect(result).toBe('armed');

  return {
    wrapKey: written.get(WRAP_KEY_ITEM) as string,
    seal: written.get(SEAL_ITEM) as string,
  };
}

describe('biometricStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deviceWithBiometrics();
    store.getItemAsync.mockResolvedValue(null);
    store.setItemAsync.mockResolvedValue(undefined);
    store.deleteItemAsync.mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('arm', () => {
    it('seals the password and gates only the wrapping key behind biometrics', async () => {
      await armAndCaptureRecords('correct-horse');

      const [wrapCall, sealCall] = store.setItemAsync.mock.calls;

      expect(wrapCall[0]).toBe(WRAP_KEY_ITEM);
      expect(wrapCall[2]).toMatchObject({
        requireAuthentication: true,
        keychainService: 'salmon.bio',
        // Never in iCloud keychain or an encrypted backup.
        keychainAccessible: 3,
      });

      expect(sealCall[0]).toBe(SEAL_ITEM);
      expect(sealCall[2]).toMatchObject({ keychainService: 'salmon.meta' });
      // The sealed record is the password encrypted, never the password.
      expect(sealCall[1]).not.toContain('correct-horse');
    });

    it('prompts before writing, because iOS never prompts on create', async () => {
      await armAndCaptureRecords('correct-horse');

      expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
      const promptOrder = auth.authenticateAsync.mock.invocationCallOrder[0];
      const writeOrder = store.setItemAsync.mock.invocationCallOrder[0];
      expect(promptOrder).toBeLessThan(writeOrder);
    });

    it('writes nothing when the user dismisses the prompt', async () => {
      auth.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

      await expect(arm('correct-horse')).resolves.toBe('cancelled');
      expect(store.setItemAsync).not.toHaveBeenCalled();
    });

    it('leaves nothing armed when the seal cannot be written', async () => {
      store.setItemAsync
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('disk full'));

      await expect(arm('correct-horse')).resolves.toBe('failed');
      // The orphaned wrapping key is cleaned up, so `armed` (which reads the
      // seal) and the keychain agree.
      expect(store.deleteItemAsync).toHaveBeenCalledWith(WRAP_KEY_ITEM, {
        keychainService: 'salmon.bio',
      });
    });

    it('drops the pre-rebuild records, so no device keeps a vault key in the keychain', async () => {
      await armAndCaptureRecords('correct-horse');

      const deleted = store.deleteItemAsync.mock.calls.map((call: unknown[]) => call[0]);
      expect(deleted).toEqual(expect.arrayContaining(['salmon_biometric_key']));
    });
  });

  describe('unlock', () => {
    it('returns the password the seal was made from', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === SEAL_ITEM ? records.seal : records.wrapKey
      );

      await expect(unlock()).resolves.toEqual({ status: 'ok', password: 'correct-horse' });
    });

    // DEV-41: the vault's salt rotates on a KDF upgrade or a password change.
    // The seal is not derived from the vault at all, so a rotation cannot
    // reach it — the old design stored a key pinned to that salt and died.
    it('is unaffected by anything that happens to the vault', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === SEAL_ITEM ? records.seal : records.wrapKey
      );

      // Nothing about the vault is read while unlocking.
      const result = await unlock();

      expect(result).toEqual({ status: 'ok', password: 'correct-horse' });
      expect(store.getItemAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('mnemonic'),
        expect.anything()
      );
    });

    // DEV-34, first half: `null` from a device that can do biometrics and has
    // a seal on disk can only mean the OS destroyed the key.
    it('reads a null from a capable device as a destroyed enrolment, and disarms', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === SEAL_ITEM ? records.seal : null
      );

      await expect(unlock()).resolves.toEqual({ status: 'invalidated' });

      const deleted = store.deleteItemAsync.mock.calls.map((call: unknown[]) => call[0]);
      expect(deleted).toEqual(expect.arrayContaining([WRAP_KEY_ITEM, SEAL_ITEM]));
    });

    // DEV-34, second half, and the destructive bug: the same `null` on a
    // device that currently cannot do biometrics is temporary. The old code
    // deleted the enrolment here.
    it('keeps the enrolment when the device simply cannot answer right now', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      auth.hasHardwareAsync.mockResolvedValue(true);
      auth.isEnrolledAsync.mockResolvedValue(false);
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === SEAL_ITEM ? records.seal : null
      );

      await expect(unlock()).resolves.toEqual({ status: 'unavailable' });
      expect(store.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('destroys nothing when the keychain read throws', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      store.getItemAsync.mockImplementation(async (key: string) => {
        if (key === SEAL_ITEM) return records.seal;
        // errSecInteractionNotAllowed — reading while the screen is locked.
        throw new Error('User interaction is not allowed.');
      });

      const result = await unlock();

      expect(result.status).toBe('failed');
      expect(store.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('reports a dismissed prompt as a cancellation, and keeps the enrolment', async () => {
      const records = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      store.getItemAsync.mockImplementation(async (key: string) => {
        if (key === SEAL_ITEM) return records.seal;
        throw new Error('User canceled the authentication');
      });

      await expect(unlock()).resolves.toEqual({ status: 'cancelled' });
      expect(store.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('never prompts when nothing is armed', async () => {
      store.getItemAsync.mockResolvedValue(null);

      await expect(unlock()).resolves.toEqual({ status: 'unavailable' });
      // Only the unprotected seal was read; the protected item was never
      // touched, so the user is not asked for a Face ID they cannot use.
      expect(store.getItemAsync).toHaveBeenCalledTimes(1);
      expect(store.getItemAsync).toHaveBeenCalledWith(SEAL_ITEM, {
        keychainService: 'salmon.meta',
      });
    });

    it('disarms when the wrapping key cannot open the seal', async () => {
      const first = await armAndCaptureRecords('correct-horse');
      jest.clearAllMocks();
      deviceWithBiometrics();
      const second = await armAndCaptureRecords('a-different-password');
      jest.clearAllMocks();
      deviceWithBiometrics();

      // A mismatched pair — the only way out is re-arming.
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === SEAL_ITEM ? first.seal : second.wrapKey
      );

      await expect(unlock()).resolves.toEqual({ status: 'invalidated' });
    });
  });

  describe('probe', () => {
    it('reads armed from the seal, without raising a prompt', async () => {
      store.getItemAsync.mockResolvedValue(JSON.stringify({ nonce: 'a', sealed: 'b' }));

      await expect(probe()).resolves.toEqual({
        ready: true,
        available: true,
        kind: 'facial',
        armed: true,
      });
      expect(store.getItemAsync).toHaveBeenCalledWith(SEAL_ITEM, {
        keychainService: 'salmon.meta',
      });
      expect(store.getItemAsync).not.toHaveBeenCalledWith(
        WRAP_KEY_ITEM,
        expect.objectContaining({ requireAuthentication: true })
      );
    });

    it('is not armed when the seal is missing or unreadable', async () => {
      store.getItemAsync.mockResolvedValue('not json');

      await expect(probe()).resolves.toMatchObject({ armed: false });
    });

    it('reports an unusable device rather than throwing', async () => {
      auth.hasHardwareAsync.mockRejectedValue(new Error('no module'));

      await expect(probe()).resolves.toEqual({
        ready: true,
        available: false,
        kind: null,
        armed: false,
      });
    });
  });

  describe('migrateLegacyRecords', () => {
    it('sweeps the old records and reports that biometrics were on', async () => {
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === 'salmon_biometric_enabled' ? 'true' : null
      );

      await expect(migrateLegacyRecords()).resolves.toBe(true);

      const deleted = store.deleteItemAsync.mock.calls.map((call: unknown[]) => call[0]);
      // The raw vault key the old scheme parked in the keychain goes, on every
      // device, whether or not its owner ever arms biometrics again.
      expect(deleted).toEqual(
        expect.arrayContaining([
          'salmon_biometric_key',
          'salmon_biometric_key_marker',
          'salmon_biometric_key_exists',
          'salmon_biometric_enabled',
        ])
      );
      expect(store.setItemAsync).toHaveBeenCalledWith(
        'salmon.bio.migrated',
        'true',
        expect.objectContaining({ keychainService: 'salmon.meta' })
      );
    });

    it('says nothing to a user who never had biometrics on', async () => {
      store.getItemAsync.mockResolvedValue(null);

      await expect(migrateLegacyRecords()).resolves.toBe(false);
    });

    it('runs once', async () => {
      store.getItemAsync.mockImplementation(async (key: string) =>
        key === 'salmon.bio.migrated' ? 'true' : 'true'
      );

      await expect(migrateLegacyRecords()).resolves.toBe(false);
      expect(store.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('retries next launch rather than failing the app', async () => {
      store.getItemAsync.mockRejectedValue(new Error('keychain unavailable'));

      await expect(migrateLegacyRecords()).resolves.toBe(false);
      expect(store.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('disarm', () => {
    it('removes both records and survives a store that refuses', async () => {
      store.deleteItemAsync.mockRejectedValue(new Error('nope'));

      await expect(disarm()).resolves.toBeUndefined();

      const deleted = store.deleteItemAsync.mock.calls.map((call: unknown[]) => call[0]);
      expect(deleted).toEqual(expect.arrayContaining([WRAP_KEY_ITEM, SEAL_ITEM]));
    });
  });
});
