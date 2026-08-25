import { describe, it, expect } from 'vitest';

import { parseSolanaPublicKey } from './public-key';

/** A real mainnet address, on the ed25519 curve. */
const VALID_ADDRESS = '9xQeWvG816bUx9EPjHmaT23yvVMc2KLS8i4Qb9pQ6M7';

describe('parseSolanaPublicKey', () => {
  it('accepts a valid Solana address', () => {
    const result = parseSolanaPublicKey(VALID_ADDRESS);
    expect(result).toEqual({ ok: true, address: VALID_ADDRESS });
  });

  it('trims surrounding whitespace from a paste', () => {
    const result = parseSolanaPublicKey(`  ${VALID_ADDRESS}\n`);
    expect(result).toEqual({ ok: true, address: VALID_ADDRESS });
  });

  it('rejects an empty field', () => {
    expect(parseSolanaPublicKey('   ')).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.empty',
    });
  });

  it('rejects a truncated address', () => {
    // A paste that lost its tail is the most likely real failure, and it must
    // not become an account that reads nothing forever.
    expect(parseSolanaPublicKey(VALID_ADDRESS.slice(0, 20))).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.format',
    });
  });

  it('rejects base58 that does not decode to 32 bytes', () => {
    // Leading '1's are zero bytes in base58, so this decodes short.
    expect(parseSolanaPublicKey('1'.repeat(44))).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.format',
    });
  });

  it('accepts an off-curve address such as a PDA', () => {
    // Documents a deliberate choice rather than an oversight: `isAddress` does
    // not test curve membership, and a PDA is a real address that can hold a
    // balance. Watching one is harmless — the wallet only reads from it.
    const pda = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM';
    expect(parseSolanaPublicKey(pda)).toEqual({ ok: true, address: pda });
  });

  it('rejects an Ethereum address', () => {
    expect(parseSolanaPublicKey('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1')).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.format',
    });
  });

  it('tells the user when they pasted a private key instead of an address', () => {
    // Generic "invalid address" would let someone keep pasting their secret
    // into a field, wondering why it will not take.
    const base58SecretKeyShaped = 'z'.repeat(88);
    expect(parseSolanaPublicKey(base58SecretKeyShaped)).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.looksLikeSecret',
    });
  });

  it('recognises a Solana CLI keyfile array as a secret, not an address', () => {
    expect(parseSolanaPublicKey('[12,45,200,3]')).toEqual({
      ok: false,
      reason: 'wallet.watchOnly.errors.looksLikeSecret',
    });
  });

  it('never carries the input in the failure', () => {
    // The same invariant private-key.test.ts pins: an error object must be
    // safe to log. Here the input is public, but a mistyped private key is not.
    const secret = 'q'.repeat(88);
    const result = parseSolanaPublicKey(secret);
    expect(JSON.stringify(result)).not.toContain(secret.slice(0, 16));
  });
});
