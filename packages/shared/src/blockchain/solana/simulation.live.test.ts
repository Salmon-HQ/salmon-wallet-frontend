/**
 * Opt-in live-RPC contract test for the transaction effect preview (NOT part of
 * the normal unit suite).
 *
 * The fixture suite in `simulation.test.ts` proves the derivation. It cannot
 * prove the two things that depend on a real validator:
 *
 * 1. that a node accepts the `accounts` configuration on `simulateTransaction`
 *    for an **unsigned** transaction (`sigVerify: false` +
 *    `replaceRecentBlockhash: true`) and returns post-execution state, and
 * 2. that the transaction fee is already inside the observed lamport delta,
 *    rather than being charged outside the simulated state — which decides
 *    whether `SolChange.lamports` is the whole truth for the user.
 *
 * Nothing here is signed and nothing is sent. Simulation is read-only and free,
 * so this needs no funded keypair and no secrets: the fee payer is discovered
 * at runtime from a recent block.
 *
 * Gated behind `RUN_SOLANA_LIVE=1` so CI stays fast and deterministic:
 *
 *   RUN_SOLANA_LIVE=1 pnpm --filter @salmon/shared test -- --run \
 *     src/blockchain/solana/simulation.live.test.ts
 *
 * Optional overrides:
 *   SOLANA_LIVE_RPC_URL   — defaults to devnet
 *   SOLANA_LIVE_PAYER     — a funded, System-Program-owned address to simulate from
 *
 * Per the repo's testing rules this **skips** when the RPC is unreachable, but
 * **fails** when it is reachable and the contract does not hold — a silent skip
 * against a live node would hide a real contract break.
 */

import { describe, it, expect } from 'vitest';
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import type { Address } from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';

import { previewTransactionEffects } from './simulation';
import type { SolanaRpc } from './networks';

const ENABLED = !!process.env.RUN_SOLANA_LIVE;
const RPC_URL = process.env.SOLANA_LIVE_RPC_URL || 'https://api.devnet.solana.com';
const RECIPIENT = address('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
const TRANSFER_LAMPORTS = 1_000_000n;

const live = ENABLED ? describe : describe.skip;

/**
 * Distinguishes an infrastructure problem (skip) from the node answering and
 * the contract not holding (fail).
 *
 * Public RPC endpoints rate-limit aggressively, and a 429 says nothing about
 * whether this code is correct.
 */
function isInfrastructureFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|socket|abort|\b(429|502|503|504)\b|Too Many Requests/i.test(
    message
  );
}

/**
 * Finds a funded, System-Program-owned account to simulate from.
 *
 * The fee payer of any recently confirmed transaction is funded and
 * system-owned by definition, which beats an explicit allowlist of addresses
 * that can quietly drain. Only the address is needed: simulation runs without
 * signature verification, so no key material is involved at any point.
 */
async function discoverPayer(rpc: SolanaRpc): Promise<Address | null> {
  const configured = process.env.SOLANA_LIVE_PAYER;
  if (configured) {
    return address(configured);
  }

  const slot = await rpc.getSlot({ commitment: 'finalized' }).send();
  const block = await rpc
    .getBlock(slot, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
      rewards: false,
      transactionDetails: 'accounts',
    })
    .send();

  for (const transaction of block?.transactions ?? []) {
    if (transaction.meta?.err !== null) continue;
    const payer = transaction.transaction.accountKeys[0];
    if (payer?.signer && payer.writable) {
      return payer.pubkey;
    }
  }
  return null;
}

live('previewTransactionEffects (live RPC contract)', () => {
  it('derives a SOL transfer from an unsigned transaction, fee included in the delta', async (ctx) => {
    const rpc = createSolanaRpc(RPC_URL);

    let payer: Address | null;
    let blockhash: Awaited<
      ReturnType<ReturnType<SolanaRpc['getLatestBlockhash']>['send']>
    >['value'];
    try {
      [payer, { value: blockhash }] = await Promise.all([
        discoverPayer(rpc),
        rpc.getLatestBlockhash().send(),
      ]);
    } catch (error) {
      if (isInfrastructureFailure(error)) {
        ctx.skip();
        return;
      }
      throw error;
    }

    if (!payer) {
      ctx.skip();
      return;
    }

    // Deliberately NOT signed: this is exactly the shape an approval screen has
    // when a dApp proposes a transaction the user has not agreed to yet.
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(payer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) =>
        appendTransactionMessageInstructions(
          [
            getTransferSolInstruction({
              source: createNoopSigner(payer),
              destination: RECIPIENT,
              amount: TRANSFER_LAMPORTS,
            }),
          ],
          m
        )
    );
    const wireTransaction = getBase64EncodedWireTransaction(compileTransaction(message));

    let result: Awaited<ReturnType<typeof previewTransactionEffects>>;
    try {
      result = await previewTransactionEffects(rpc, wireTransaction, payer);
    } catch (error) {
      if (isInfrastructureFailure(error)) {
        ctx.skip();
        return;
      }
      throw error;
    }

    // Reachable node: anything other than a derived result is a contract break.
    expect(result.kind).toBe('effects');
    if (result.kind !== 'effects') throw new Error('expected effects');

    expect(result.account).toBe(payer);
    expect(result.approvals).toEqual([]);

    // The whole point: the observed delta is the transfer PLUS the fee, so a UI
    // showing `sol.lamports` is showing the user everything they will pay.
    const fee = result.sol.feeLamports;
    if (fee !== null) {
      expect(result.sol.lamports).toBe(-(TRANSFER_LAMPORTS + fee));
    } else {
      // Older nodes do not break out the fee; the delta must still exceed the
      // transfer, which is only possible if the fee is inside it.
      expect(result.sol.lamports).toBeLessThan(-TRANSFER_LAMPORTS);
      expect(result.sol.lamports).toBeGreaterThan(-(TRANSFER_LAMPORTS + 100_000n));
    }
  }, 60_000);
});
