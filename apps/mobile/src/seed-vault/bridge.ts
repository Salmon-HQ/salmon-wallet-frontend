/**
 * The only file that talks to Seed Vault.
 *
 * It wraps Solana Mobile's React Native module so the rest of the app sees a
 * small surface: is Seed Vault here, authorize a seed, list its accounts,
 * sign. Replacing the module (see specs/037-seed-vault/plan.md, Follow-up)
 * changes this file only.
 *
 * The native module's real wire types are strings (auth tokens, ids) even
 * where its TypeScript declarations say number, so values are passed as the
 * strings it returns.
 */
import { SeedVaultError, type SeedVaultBridge, type SeedVaultFailure } from '@salmon/shared';
import { SeedVault, SeedVaultPermissionAndroid } from '@solana-mobile/seed-vault-lib';
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';

/** One account Seed Vault derived for an authorized seed. */
export interface SeedVaultAccount {
  /** As Seed Vault names it, e.g. `bip32:/m/44'/501'/0'/0'`; passed back to sign. */
  derivationPath: string;
  /** Base58 Solana address. */
  address: string;
  name: string;
  /** The seed's own wallet (Seed Vault Wallet) uses this account. */
  isUserWallet: boolean;
}

// Seed Vault guarantees at least this many signatures per confirmation; the
// module does not expose the device's real limit.
export const SEED_VAULT_MAX_PER_REQUEST = 3;

// The module does not type its answers; these are the shapes it builds.
type NativeAccount = { derivationPath: string; publicKeyEncoded: string; name: string };
type NativeSigningResult = { signatures: string[] };
const native = SeedVault as unknown as {
  isSeedVaultAvailable(allowSimulated: boolean): Promise<boolean>;
  authorizeNewSeed(): Promise<{ authToken: string }>;
  createNewSeed(): Promise<{ authToken: string }>;
  importExistingSeed(): Promise<{ authToken: string }>;
  getAuthorizedSeeds(): Promise<{ authToken: string }[]>;
  // The native method takes all three: a bridge call with fewer arguments is rejected.
  getAccounts(authToken: string, filterOnColumn: null, value: null): Promise<NativeAccount[]>;
  getUserWallets(authToken: string): Promise<NativeAccount[]>;
  signTransactions(authToken: string, requests: SigningRequest[]): Promise<NativeSigningResult[]>;
  signMessages(authToken: string, requests: SigningRequest[]): Promise<NativeSigningResult[]>;
  deauthorizeSeed(authToken: string): void;
};
type SigningRequest = { payload: string; requestedSignatures: string[] };

// Seed Vault's screens (and Android's permission dialog) are other apps'
// activities: while one is up, Salmon's own activity reports `background`.
// The lock-on-background handlers ask this first, so a confirmation does not
// lock the wallet, or close the dApp sheet, under the user's finger.
let screensOpen = 0;

/** Whether a Seed Vault screen Salmon opened is still up. */
export function isSeedVaultScreenOpen(): boolean {
  return screensOpen > 0;
}

async function onSeedVaultScreen<T>(call: () => Promise<T>): Promise<T> {
  screensOpen += 1;
  try {
    return await call();
  } finally {
    screensOpen -= 1;
  }
}

/**
 * Whether this device has a Seed Vault Salmon may use. Production builds
 * accept only a secure one; development builds also accept the simulator.
 */
export async function isSeedVaultAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await native.isSeedVaultAvailable(__DEV__);
  } catch {
    return false;
  }
}

/** Asks Android for the standard Seed Vault permission (never the privileged one). */
export async function requestSeedVaultPermission(): Promise<boolean> {
  const result = await onSeedVaultScreen(() =>
    PermissionsAndroid.request(SeedVaultPermissionAndroid)
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

// Seed Vault returns -1 when there is no authorization to give (and, on some
// hardware, after create/import — seed-vault-sdk issue #548).
const usable = (authToken: string) => authToken !== '-1' && authToken !== '';

/** Opens Seed Vault's screen to let Salmon use one existing seed. */
export async function authorizeSeed(): Promise<string> {
  const { authToken } = await onSeedVaultScreen(() => native.authorizeNewSeed()).catch(failure);
  if (!usable(authToken)) throw new SeedVaultError('failed');
  return authToken;
}

/** Opens Seed Vault's screen to create a seed, then authorizes it. */
export async function createSeed(): Promise<string> {
  const { authToken } = await onSeedVaultScreen(() => native.createNewSeed()).catch(failure);
  return usable(authToken) ? authToken : authorizeSeed();
}

/** Opens Seed Vault's screen to import a seed, then authorizes it. */
export async function importSeed(): Promise<string> {
  const { authToken } = await onSeedVaultScreen(() => native.importExistingSeed()).catch(failure);
  return usable(authToken) ? authToken : authorizeSeed();
}

/** The Solana accounts Seed Vault holds for an authorized seed. */
export async function listSeedVaultAccounts(authToken: string): Promise<SeedVaultAccount[]> {
  const [accounts, userWallets] = await Promise.all([
    native.getAccounts(authToken, null, null),
    native.getUserWallets(authToken),
  ]).catch(failure);
  const used = new Set(userWallets.map((a) => a.publicKeyEncoded));
  return accounts.map((a) => ({
    derivationPath: a.derivationPath,
    address: a.publicKeyEncoded,
    name: a.name,
    isUserWallet: used.has(a.publicKeyEncoded),
  }));
}

/** The seeds Salmon may already use, by their authorization. */
export async function listAuthorizedSeeds(): Promise<string[]> {
  const seeds = await native.getAuthorizedSeeds().catch(failure);
  return seeds.map((s) => s.authToken).filter(usable);
}

/** Gives up Salmon's access to a seed. */
export function deauthorizeSeed(authToken: string): void {
  try {
    native.deauthorizeSeed(authToken);
  } catch {
    // Already not authorized (the user revoked it in Seed Vault): nothing to give up.
  }
}

/** What Seed Vault's failure means for the user. */
function failure(error: unknown): never {
  const code = /result=(-?\d+)/.exec(error instanceof Error ? error.message : String(error))?.[1];
  // Android's RESULT_CANCELED is 0; Seed Vault's codes are RESULT_FIRST_USER (1)
  // + 1000…: 1002 invalid authorization, 1004 authentication failed.
  const reason: SeedVaultFailure =
    code === '0' || code === '1004' ? 'cancelled' : code === '1002' ? 'revoked' : 'failed';
  throw new SeedVaultError(reason);
}

const toRequests = (derivationPath: string, payloads: Uint8Array[]): SigningRequest[] =>
  payloads.map((p) => ({
    payload: Buffer.from(p).toString('base64'),
    requestedSignatures: [derivationPath],
  }));

const firstSignatures = (results: NativeSigningResult[]) =>
  results.map((r) => new Uint8Array(Buffer.from(r.signatures[0] ?? '', 'base64')));

/** What the shared Seed Vault signer calls; one call is one confirmation. */
export const seedVaultBridge: SeedVaultBridge = {
  signTransactions: async (authToken, derivationPath, payloads) =>
    firstSignatures(
      await onSeedVaultScreen(() =>
        native.signTransactions(authToken, toRequests(derivationPath, payloads))
      ).catch(failure)
    ),
  signMessages: async (authToken, derivationPath, payloads) =>
    firstSignatures(
      await onSeedVaultScreen(() =>
        native.signMessages(authToken, toRequests(derivationPath, payloads))
      ).catch(failure)
    ),
};
