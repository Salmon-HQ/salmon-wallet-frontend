/**
 * Opt-in devnet integration test (NOT part of the normal unit suite).
 *
 * Most tests in this repo mock the RPC/connection — fast and deterministic, but
 * they cannot prove that a transaction this code *builds* is actually valid and
 * lands on-chain. This test exercises the real `createTransfer` path against
 * Solana devnet (free, fake SOL) and asserts the sender's on-chain balance
 * actually dropped.
 *
 * It is gated behind `RUN_DEVNET=1` so CI stays fast and deterministic. To run:
 *
 *   # fund a throwaway devnet keypair first (faucet.solana.com), then:
 *   export RUN_DEVNET=1
 *   export DEVNET_TEST_SECRET_KEY="$(cat /path/to/keypair.json)"   # JSON array
 *   export DEVNET_RPC_URL="https://api.devnet.solana.com"          # optional
 *   pnpm --filter @salmon/shared test -- --run src/blockchain/solana/transfer.devnet.test.ts
 *
 * Pattern to copy for other on-chain-truth cases (stake delegation, NFT burn,
 * balance reads against salmon-api devnet, tx-history reads).
 */

import { describe, it, expect } from 'vitest';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  type Signature,
} from '@solana/kit';
import { createRecentSignatureConfirmationPromiseFactory } from '@solana/transaction-confirmation';
import { createTransfer, SOL_ADDRESS } from './transfer';
import { deriveSolanaWsUrl } from './networks';

const ENABLED = !!process.env.RUN_DEVNET;
const SECRET = process.env.DEVNET_TEST_SECRET_KEY;
const RPC = process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com';

// Skip the whole block unless explicitly opted in.
const devnet = ENABLED ? describe : describe.skip;

devnet('createTransfer (devnet integration)', () => {
  it('builds a SOL transfer that actually lands and reduces the sender balance', async () => {
    if (!SECRET) {
      throw new Error(
        'DEVNET_TEST_SECRET_KEY is required (JSON secret-key array of a funded devnet keypair).'
      );
    }

    const rpc = createSolanaRpc(RPC);
    const rpcSubscriptions = createSolanaRpcSubscriptions(deriveSolanaWsUrl(RPC));
    const sender = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(SECRET)), false);
    const recipient = address(Keypair.generate().publicKey.toBase58());

    const getBalance = async (owner: string) =>
      Number((await rpc.getBalance(address(owner)).send()).value);

    const before = await getBalance(sender.address);
    expect(before).toBeGreaterThan(0.01 * LAMPORTS_PER_SOL); // needs funding

    const amountSol = 0.001;
    const { txId } = await createTransfer(rpc, sender, recipient, SOL_ADDRESS, amountSol);
    // Without `simulate`, txId is a real signature string (the union type also
    // allows a simulation payload when simulating).
    expect(typeof txId).toBe('string');
    if (typeof txId !== 'string') throw new Error('expected a transaction signature');

    await createRecentSignatureConfirmationPromiseFactory({ rpc, rpcSubscriptions })({
      abortSignal: AbortSignal.timeout(30_000),
      commitment: 'confirmed',
      signature: txId as Signature,
    });

    const after = await getBalance(sender.address);
    const delta = before - after;

    // Dropped by the transfer amount plus a (small) network fee.
    expect(delta).toBeGreaterThanOrEqual(Math.floor(amountSol * LAMPORTS_PER_SOL));
    expect(delta).toBeLessThan(Math.floor(amountSol * LAMPORTS_PER_SOL) + 50_000);

    // Recipient received exactly the transfer amount.
    expect(await getBalance(recipient)).toBe(Math.floor(amountSol * LAMPORTS_PER_SOL));
  }, 60_000);
});
