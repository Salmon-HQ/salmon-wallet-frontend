/**
 * Tests for private-key parsing.
 *
 * The fixtures are throwaway keys generated inside the tests, never real
 * wallet material — the repo rule is that no key ever lands in a file.
 */
import { describe, it, expect } from 'vitest';
import bs58 from 'bs58';
import { createKeyPairSignerFromPrivateKeyBytes, getAddressEncoder } from '@solana/kit';

import { parseSolanaPrivateKey } from './private-key';

/**
 * Builds a real, self-consistent 64-byte secret key (`seed ‖ publicKey`).
 *
 * Kit's generated signers are non-extractable, so the seed cannot be read back
 * out of one. Instead a random 32-byte seed is turned into a signer, which is
 * exactly what the wallet does when it derives an account.
 */
async function makeSecretKey(): Promise<{ secretKey: Uint8Array; address: string }> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed, false);
  const secretKey = new Uint8Array(64);
  secretKey.set(seed);
  secretKey.set(getAddressEncoder().encode(signer.address), 32);
  return { secretKey, address: signer.address };
}

describe('parseSolanaPrivateKey', () => {
  it('accepts a base58 64-byte secret key and resolves its address', async () => {
    const { secretKey, address } = await makeSecretKey();

    const result = await parseSolanaPrivateKey(bs58.encode(secretKey));

    expect(result).toMatchObject({ ok: true, address });
  });

  it('accepts the JSON byte array the Solana CLI exports', async () => {
    const { secretKey, address } = await makeSecretKey();

    const result = await parseSolanaPrivateKey(JSON.stringify(Array.from(secretKey)));

    expect(result).toMatchObject({ ok: true, address });
  });

  it('normalizes both formats to the same base58 key', async () => {
    const { secretKey } = await makeSecretKey();

    const fromBase58 = await parseSolanaPrivateKey(bs58.encode(secretKey));
    const fromArray = await parseSolanaPrivateKey(JSON.stringify(Array.from(secretKey)));

    expect(fromBase58.ok && fromArray.ok).toBe(true);
    if (!fromBase58.ok || !fromArray.ok) return;
    expect(fromBase58.privateKey).toBe(fromArray.privateKey);
  });

  it('tolerates surrounding whitespace from a copied file', async () => {
    const { secretKey, address } = await makeSecretKey();

    const result = await parseSolanaPrivateKey(`  ${bs58.encode(secretKey)}\n`);

    expect(result).toMatchObject({ ok: true, address });
  });

  it('rejects an empty field', async () => {
    expect(await parseSolanaPrivateKey('   ')).toEqual({
      ok: false,
      reason: 'wallet.import.errors.empty',
    });
  });

  it('rejects text that is not a key in either format', async () => {
    expect(await parseSolanaPrivateKey('not a key at all!!')).toEqual({
      ok: false,
      reason: 'wallet.import.errors.format',
    });
  });

  it('rejects a byte array with an out-of-range value instead of coercing it', async () => {
    const { secretKey } = await makeSecretKey();
    const bytes = Array.from(secretKey);
    bytes[0] = 256;

    expect(await parseSolanaPrivateKey(JSON.stringify(bytes))).toEqual({
      ok: false,
      reason: 'wallet.import.errors.format',
    });
  });

  it('tells a 32-byte seed apart from a private key', async () => {
    const { secretKey } = await makeSecretKey();

    expect(await parseSolanaPrivateKey(bs58.encode(secretKey.slice(0, 32)))).toEqual({
      ok: false,
      reason: 'wallet.import.errors.seedOnly',
    });
  });

  it('rejects a key of the wrong length', async () => {
    const { secretKey } = await makeSecretKey();

    expect(await parseSolanaPrivateKey(bs58.encode(secretKey.slice(0, 48)))).toEqual({
      ok: false,
      reason: 'wallet.import.errors.length',
    });
  });

  it('rejects a key whose public half does not match its seed', async () => {
    const { secretKey } = await makeSecretKey();
    const other = await makeSecretKey();
    // Right length, right alphabet, wrong pairing: only the signature check
    // catches this, and without it the wallet would import an address it
    // cannot sign for.
    const mismatched = new Uint8Array(64);
    mismatched.set(secretKey.slice(0, 32));
    mismatched.set(other.secretKey.slice(32), 32);

    expect(await parseSolanaPrivateKey(bs58.encode(mismatched))).toEqual({
      ok: false,
      reason: 'wallet.import.errors.invalidKey',
    });
  });

  it('never carries key material in the failure', async () => {
    const { secretKey } = await makeSecretKey();
    const encoded = bs58.encode(secretKey.slice(0, 48));

    const result = await parseSolanaPrivateKey(encoded);

    expect(JSON.stringify(result)).not.toContain(encoded.slice(0, 16));
  });
});
