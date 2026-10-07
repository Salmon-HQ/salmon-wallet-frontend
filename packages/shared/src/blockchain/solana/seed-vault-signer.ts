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
export class SeedVaultError extends Error {
  constructor(readonly reason: SeedVaultFailure) {
    super(`Seed Vault did not sign: ${reason}`);
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
  signTransactions(authToken: string, derivationPath: string, payloads: Uint8Array[]): Promise<Uint8Array[]>;
  /** Signs raw bytes. */
  signMessages(authToken: string, derivationPath: string, payloads: Uint8Array[]): Promise<Uint8Array[]>;
}

export interface SeedVaultSignerOptions {
  /** The account's address, as Seed Vault reported it. */
  address: Address;
  /** Seed Vault's id for Salmon's access to this seed. */
  authToken: string;
  /** e.g. `m/44'/501'/0'/0'` */
  derivationPath: string;
  bridge: SeedVaultBridge;
  /** Most payloads Seed Vault signs in one confirmation (at least 3). */
  maxPerRequest: number;
}

/** A {@link SolanaSigner} that asks Seed Vault for every signature. */
export function createSeedVaultSigner(options: SeedVaultSignerOptions): SolanaSigner {
  const { address, authToken, derivationPath, bridge, maxPerRequest } = options;

  // A batch larger than Seed Vault's limit is split, so the user may confirm
  // more than once; every payload is still signed exactly once, in order.
  async function signAll(
    sign: SeedVaultBridge['signTransactions'],
    payloads: Uint8Array[]
  ): Promise<Record<Address, SignatureBytes>[]> {
    const signatures: Uint8Array[] = [];
    for (let i = 0; i < payloads.length; i += maxPerRequest) {
      const chunk = payloads.slice(i, i + maxPerRequest);
      const signed = await sign(authToken, derivationPath, chunk);
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
        (...args) => bridge.signTransactions(...args),
        transactions.map((tx) => new Uint8Array(tx.messageBytes))
      ),
    signMessages: (messages) =>
      signAll(
        (...args) => bridge.signMessages(...args),
        messages.map((m) => new Uint8Array(m.content))
      ),
  };
}
