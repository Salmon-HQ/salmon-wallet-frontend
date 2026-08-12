/**
 * GOLDEN VECTORS — migration acceptance gate.
 *
 * These constants pin the exact bytes produced by the @solana/web3.js
 * implementation as of commit 9e2e4bb. They are the acceptance criterion for the
 * @solana/kit migration: the ported code is correct iff these still pass.
 *
 * To regenerate (only ever when the wire format itself is intentionally
 * changed — NEVER to make a migration diff go green): replace the expected
 * constant with an empty string, run the suite, and paste the reported
 * `actual` value. A migration that changes these bytes is a bug, not a
 * vector that needs updating.
 *
 * The signed bytes are also fed back through @solana/web3.js: an assertion that
 * the *old* library still accepts what the *new* one produced is worth more
 * than a self-consistent kit-only round trip.
 */
import { describe, expect, it, vi } from 'vitest';
import { VersionedTransaction } from '@solana/web3.js';
import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import { signAndSendPreparedSolanaTransactions } from './prepared-transactions';

// TEST-ONLY deterministic signer. The seed is a constant so golden vectors are
// reproducible; this key holds no funds and must never be used outside tests.
const testSigner = (seed: number) =>
  createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(32).fill(seed), false);

/**
 * Unsigned v0 transaction carrying one address-table lookup: fee payer seed 1,
 * a 1-lamport transfer to seed 3 resolved through a lookup table keyed by seed 3.
 */
const FIXTURE_V0_WITH_LUT_B64 =
  'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

/** The blockhash the flow swaps in, standing in for a `getLatestBlockhash` result. */
const FRESH_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

/**
 * Bytes submitted to the cluster after deserialize -> in-place `recentBlockhash`
 * mutation -> sign -> re-serialize. Pins the most migration-fragile path in the
 * repo: @solana/kit messages are immutable, so this mutation must be rewritten
 * while producing identical bytes.
 */
const GOLDEN_SIGNED_TX_B64 =
  'AQP0u3pM3IOmDbpifVx/KGvkAGFpoW2/IffEexm7QUJ+uZ7MlHGPH8XToXo5eNbS6OPIAbFCe3sX5J4HDzx6BwyAAQABAoqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADjMtr5L6vs6LY/96RABeX9/Zr6FYdWthxalfkEs7jQgQEBAgACDAIAAAABAAAAAAAAAAHtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QEAAA==';

describe('signAndSendPreparedSolanaTransactions golden vectors', () => {
  it('pins the bytes of a blockhash-swapped v0 transaction with lookup tables', async () => {
    // Only the RPC is stubbed; the transaction codec and the signer are real.
    const sendTransaction = vi.fn().mockReturnValue({ send: async () => 'sig' });
    const rpc = {
      getLatestBlockhash: () => ({
        send: async () => ({ value: { blockhash: FRESH_BLOCKHASH, lastValidBlockHeight: 1n } }),
      }),
      sendTransaction,
      getSignatureStatuses: () => ({
        send: async () => ({ value: [{ confirmationStatus: 'confirmed', err: null }] }),
      }),
    };
    const rpcSubscriptions = {
      signatureNotifications: () => ({
        /* eslint-disable require-yield -- generator that completes without yielding; block form survives reformatting */
        subscribe: async () =>
          (async function* () {
            return;
          })(),
        /* eslint-enable require-yield */
      }),
    };
    const account = {
      signer: await testSigner(1),
      getRpc: () => rpc,
      getRpcSubscriptions: () => rpcSubscriptions,
    };

    await signAndSendPreparedSolanaTransactions(account as never, {
      transaction: FIXTURE_V0_WITH_LUT_B64,
    });

    const sent = sendTransaction.mock.calls[0][0] as string;
    expect(sent).toBe(GOLDEN_SIGNED_TX_B64);

    const decoded = VersionedTransaction.deserialize(Buffer.from(sent, 'base64'));
    expect(decoded.message.recentBlockhash).toBe(FRESH_BLOCKHASH);
    // Lookup tables must survive the decode/patch/re-encode round trip.
    expect(decoded.message.addressTableLookups).toHaveLength(1);
  });
});
