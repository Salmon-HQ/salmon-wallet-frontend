/**
 * Opt-in live-RPC end-to-end test for version 1 (SIMD-0296, 4096-byte)
 * transactions through the dApp approval path (NOT part of the unit suite).
 *
 * `dapp-approval.test.ts` proves signing, re-encoding and WYSIWYS against
 * fixtures. Only a real cluster can prove that what the approval path signs
 * and broadcasts is a transaction the network accepts: a v1 envelope larger
 * than 1232 bytes, sent over base64, confirmed, and readable back with
 * `maxSupportedTransactionVersion: 1`.
 *
 * This test SPENDS: it moves 1_000_000 lamports plus fees from the signer to
 * a rent-exempt recipient. Devnet only — never point it at mainnet.
 *
 *   RUN_SOLANA_LIVE=1 SOLANA_LIVE_SIGNER_SEED='[1,2,...]' \
 *     pnpm --filter @salmon/shared test -- --run src/utils/dapp-approval.live.test.ts
 *
 *   SOLANA_LIVE_SIGNER_SEED — JSON array of the 32-byte ed25519 seed of a
 *                             funded devnet key (a test key; never a user key)
 *   SOLANA_LIVE_RPC_URL     — defaults to devnet
 *   SOLANA_LIVE_RECIPIENT   — defaults to a rent-exempt devnet address
 *
 * Skips when the seed is missing or the RPC is unreachable; fails when the
 * node is reachable and any step of the contract does not hold.
 */

import bs58 from 'bs58';
import { describe, expect, it, vi } from 'vitest';
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageConfig,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { getAddMemoInstruction } from '@solana-program/memo';
import { getTransferSolInstruction } from '@solana-program/system';

import { approveSolanaTransactionRequest, previewSolanaApprovalEffects } from './dapp-approval';

vi.mock('../hooks/useAvailableNetworks', () => ({
  fetchAndMergeNetworkConfigs: vi.fn().mockResolvedValue(true),
}));

const ENABLED = !!process.env.RUN_SOLANA_LIVE && !!process.env.SOLANA_LIVE_SIGNER_SEED;
const RPC_URL = process.env.SOLANA_LIVE_RPC_URL || 'https://api.devnet.solana.com';
// Same rent-exempt devnet address `simulation.live.test.ts` transfers to.
const RECIPIENT = address(
  process.env.SOLANA_LIVE_RECIPIENT || '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
);
const TRANSFER_LAMPORTS = 1_000_000n;

const live = ENABLED ? describe : describe.skip;

function isInfrastructureFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|429|503/i.test(message);
}

live('v1 transaction through the approval path (live devnet)', () => {
  it('previews, signs, sends and confirms a >1232-byte v1 transaction', async (ctx) => {
    const seed = new Uint8Array(JSON.parse(process.env.SOLANA_LIVE_SIGNER_SEED as string));
    const signer = await createKeyPairSignerFromPrivateKeyBytes(seed, false);
    const rpc = createSolanaRpc(RPC_URL);
    // The minimal account shape the approval functions read; a full
    // SolanaAccount needs the wallet's backend DI, which is not under test here.
    const account = {
      signer,
      getReceiveAddress: () => signer.address as string,
      getRpc: () => rpc,
    };

    let blockhash: Awaited<ReturnType<ReturnType<typeof rpc.getLatestBlockhash>['send']>>['value'];
    try {
      ({ value: blockhash } = await rpc.getLatestBlockhash().send());
    } catch (error) {
      if (isInfrastructureFailure(error)) {
        ctx.skip();
        return;
      }
      throw error;
    }

    // Built the way a dApp would build it — with kit, outside the wallet —
    // then handed over as base58 message + base58 wire, exactly like the bridge.
    const message = pipe(
      createTransactionMessage({ version: 1 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) =>
        appendTransactionMessageInstructions(
          [
            getTransferSolInstruction({
              source: signer,
              destination: RECIPIENT,
              amount: TRANSFER_LAMPORTS,
            }),
            getAddMemoInstruction({ memo: 'salmon-v1-approval-'.repeat(90) }),
          ],
          m
        ),
      // Measured on devnet: the Memo program account alone exceeds 64 KiB and a
      // ~1.7 KB memo burns ~600k CU. v1 budgets zero for both when unset.
      (m) =>
        setTransactionMessageConfig(
          {
            computeUnitLimit: 1_400_000,
            loadedAccountsDataSizeLimit: 262_144,
            priorityFeeLamports: 1_000n,
          },
          m
        )
    );
    const unsigned = compileTransaction(message);
    const messageBytes = new Uint8Array(unsigned.messageBytes);
    const wire = new Uint8Array(getTransactionEncoder().encode(unsigned));
    expect(messageBytes[0]).toBe(0x81);
    expect(wire.length).toBeGreaterThan(1232);
    expect(wire.length).toBeLessThanOrEqual(4096);

    const request = {
      id: 'live-v1',
      method: 'signAndSendTransaction' as const,
      params: { message: bs58.encode(messageBytes), transaction: bs58.encode(wire) },
    };

    const effects = await previewSolanaApprovalEffects(account as never, request);
    expect(effects.kind).toBe('effects');
    if (effects.kind !== 'effects') throw new Error('expected effects');
    expect(effects.sol.lamports).toBeLessThanOrEqual(-TRANSFER_LAMPORTS);

    const result = await approveSolanaTransactionRequest(account as never, request);
    expect('signature' in result).toBe(true);
    if (!('signature' in result)) return;

    let status: { confirmationStatus?: string | null; err: unknown } | null = null;
    for (let attempt = 0; attempt < 30 && !status?.confirmationStatus; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const { value } = await rpc.getSignatureStatuses([result.signature as never]).send();
      status = value[0] ?? null;
    }
    expect(status?.err).toBeNull();
    expect(['confirmed', 'finalized']).toContain(status?.confirmationStatus);

    // Read back through the same opt-in every backend reader now uses.
    const stored = await rpc
      .getTransaction(result.signature as never, {
        encoding: 'base64',
        maxSupportedTransactionVersion: 1,
        commitment: 'confirmed',
      })
      .send();
    expect(stored?.version).toBe(1);
    expect(stored?.meta?.err).toBeNull();
    // The broadcast bytes are the approved message, byte for byte.
    const storedWire = new Uint8Array(Buffer.from(stored!.transaction[0], 'base64'));
    expect(storedWire.subarray(0, messageBytes.length)).toEqual(messageBytes);
  }, 120_000);
});
