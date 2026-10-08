/**
 * A signer for an account whose key lives in Seed Vault (Solana Seeker).
 *
 * Salmon never holds this key: each signature is asked of Seed Vault, which
 * shows its own confirmation (fingerprint or PIN) on a screen the app cannot
 * draw over. The native call is injected as a {@link SeedVaultBridge}, so this
 * module stays free of React Native and can be tested with a fake vault.
 *
 * @module blockchain/solana/seed-vault-signer
 */

import type { Address, SignatureBytes } from '@solana/kit';
import type { SolanaSigner } from './signing';

/** Why Seed Vault did not sign. */
export type SeedVaultFailure = 'cancelled' | 'revoked' | 'unavailable' | 'failed';

/** Thrown when Seed Vault does not produce a signature; nothing was signed. */
const MESSAGES: Record<SeedVaultFailure, string> = {
  cancelled: 'Not signed: the request was declined in Seed Vault.',
  revoked: 'Not signed: Seed Vault access was revoked. Add this wallet again from Add wallet.',
  unavailable: 'Not signed: Seed Vault is not available on this device.',
  failed: 'Not signed: Seed Vault could not complete the request.',
};

export class SeedVaultError extends Error {
  constructor(readonly reason: SeedVaultFailure) {
    super(MESSAGES[reason]);
    this.name = 'SeedVaultError';
  }
}

/**
 * The native side. Each call is one Seed Vault confirmation and returns one
 * 64-byte signature per payload, in order; failures reject with a
 * {@link SeedVaultError}.
 */
export interface SeedVaultBridge {
  /** Signs transaction message bytes (never the wire transaction). */
  signTransactions(
    authToken: string,
    derivationPath: string,
    payloads: Uint8Array[]
  ): Promise<Uint8Array[]>;
  /** Signs raw bytes. */
  signMessages(
    authToken: string,
    derivationPath: string,
    payloads: Uint8Array[]
  ): Promise<Uint8Array[]>;
}

/** The device's Seed Vault, once the app has registered it. */
export interface SeedVaultRegistration {
  bridge: SeedVaultBridge;
  /** Most payloads Seed Vault signs in one confirmation (at least 3). */
  maxPerRequest: number;
  /** Gives up Salmon's access to a seed. */
  release?: (authToken: string) => void;
}

let registered: SeedVaultRegistration | null = null;

/**
 * Registers the device's Seed Vault. Only the Android app calls this, where
 * Seed Vault exists; everywhere else Seed Vault accounts can be read but every
 * signature fails as `unavailable`.
 */
export function registerSeedVault(registration: SeedVaultRegistration | null): void {
  registered = registration;
}

/** Gives up Salmon's access to a seed, where a Seed Vault is registered. */
export function releaseSeedVaultAccess(authToken: string): void {
  registered?.release?.(authToken);
}

const unavailable = (): Promise<Uint8Array[]> => Promise.reject(new SeedVaultError('unavailable'));
const UNAVAILABLE: SeedVaultRegistration = {
  bridge: { signTransactions: unavailable, signMessages: unavailable },
  maxPerRequest: 1,
};

export interface SeedVaultSignerOptions {
  /** The account's address, as Seed Vault reported it. */
  address: Address;
  /** Seed Vault's id for Salmon's access to this seed. */
  authToken: string;
  /** e.g. `m/44'/501'/0'/0'` */
  derivationPath: string;
  /** Defaults to the registered Seed Vault, looked up at signing time. */
  bridge?: SeedVaultBridge;
  maxPerRequest?: number;
}

/** A {@link SolanaSigner} that asks Seed Vault for every signature. */
export function createSeedVaultSigner(options: SeedVaultSignerOptions): SolanaSigner {
  const { address, authToken, derivationPath } = options;
  const vault = (): SeedVaultRegistration =>
    options.bridge
      ? { bridge: options.bridge, maxPerRequest: options.maxPerRequest ?? 3 }
      : (registered ?? UNAVAILABLE);

  // A batch larger than Seed Vault's limit is split, so the user may confirm
  // more than once; every payload is still signed exactly once, in order.
  async function signAll(
    kind: keyof SeedVaultBridge,
    payloads: Uint8Array[]
  ): Promise<Record<Address, SignatureBytes>[]> {
    const { bridge, maxPerRequest } = vault();
    const signatures: Uint8Array[] = [];
    for (let i = 0; i < payloads.length; i += maxPerRequest) {
      const chunk = payloads.slice(i, i + maxPerRequest);
      const signed = await bridge[kind](authToken, derivationPath, chunk);
      if (signed.length !== chunk.length || signed.some((s) => s.length !== 64)) {
        throw new Error('Seed Vault returned an invalid signature');
      }
      signatures.push(...signed);
    }
    return signatures.map((s) => ({ [address]: s as SignatureBytes }));
  }

  return {
    address,
    signTransactions: (transactions) =>
      signAll(
        'signTransactions',
        transactions.map((tx) => new Uint8Array(tx.messageBytes))
      ),
    signMessages: (messages) =>
      signAll(
        'signMessages',
        messages.map((m) => new Uint8Array(m.content))
      ),
  };
}
