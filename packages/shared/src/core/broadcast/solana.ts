/**
 * core/broadcast — the one place a Solana transaction is signed and sent.
 *
 * Every flow that carries a backend-built transaction (NFT burn and transfer,
 * a Powerup) comes through here: check the transaction against what the
 * flow declared, put a fresh blockhash on the message, sign the wallet's own
 * slot, send, and wait for the cluster's word. Nothing outside `core/` calls
 * `sendTransaction` (spec 027 §2).
 *
 * The check comes first, before any RPC call, so a transaction that disagrees
 * with its flow costs nothing. Every caller states an expectation or passes
 * `UNVERIFIED` — the choice is in the call, never in a default.
 */
import {
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
} from '@solana/kit';
import type { Commitment, Signature, TransactionMessageBytes } from '@solana/kit';
import { signTransactionWith, type SolanaSigner } from '../../blockchain/solana/signing';
import { confirmSolanaSignature, sendExpectingOutcome } from '../../blockchain/solana/confirm';
import type { SolanaRpc, SolanaRpcSubscriptions } from '../../blockchain/solana/networks';
import {
  assertSolanaTransactionMatches,
  assertSwapPaysWallet,
  bubblegumAssets,
  ownAtaCreates,
  UNVERIFIED,
} from '../verify';
import type { SolanaTransactionExpectation, Unverified } from '../verify';

/** What broadcasting needs from an account: its signer and its RPC clients. */
export interface SolanaBroadcaster {
  signer: SolanaSigner;
  getRpc: () => SolanaRpc;
  getRpcSubscriptions: () => SolanaRpcSubscriptions;
}

export interface SolanaBroadcastOptions {
  /** Commitment for the blockhash, the preflight and the confirmation. */
  commitment?: Commitment;
  /**
   * Whether to skip the node's preflight simulation. Off by default: a
   * transaction that would fail is refused before it costs a fee.
   */
  skipPreflight?: boolean;
}

/**
 * Signs and broadcasts one unsigned transaction, then waits for confirmation.
 *
 * The compiled message is patched with a fresh blockhash and re-encoded
 * rather than decompiled and rebuilt: decompiling re-derives account ordering
 * and lookup-table indices, which does not reproduce the input bytes.
 * Replacing the one field is the only transformation that round-trips exactly.
 *
 * `signTransactionWith` preserves signatures already in the map, so a
 * co-signer's signature on a prepared transaction survives; this wallet only
 * ever fills its own slot.
 *
 * The signature is returned to the caller only once the cluster reports it at
 * `commitment`. Every verdict the subscription cannot settle goes to an HTTP
 * poll of the ledger (see `confirm.ts`); when neither can tell whether the
 * transaction landed, the wait throws `SolanaOutcomeUnknownError`, which a
 * caller must never treat as a failure it can retry.
 *
 * @param account - The signing account and its RPC clients.
 * @param transactionBase64 - The unsigned transaction, base64 wire format.
 * @param expectation - What the flow declares the transaction is for, or
 *   `UNVERIFIED` when the flow has not declared it yet.
 * @returns The confirmed signature.
 * @throws SolanaTransactionMismatchError - When the transaction disagrees with
 *   the expectation; nothing is signed or sent.
 * @throws SolanaOutcomeUnknownError - When the transaction may have landed.
 * @throws The RPC's or the confirmation's error, unchanged.
 */
export async function signAndSendSolanaTransaction(
  account: SolanaBroadcaster,
  transactionBase64: string,
  expectation: SolanaTransactionExpectation | Unverified,
  options: SolanaBroadcastOptions = {}
): Promise<Signature> {
  if (expectation !== UNVERIFIED) {
    assertSolanaTransactionMatches(
      transactionBase64,
      expectation,
      await bubblegumAssets(transactionBase64)
    );
  }

  const rpc = account.getRpc();
  // Every swap, whichever provider routed it: the byte check binds what it
  // can read, and the simulation catches what it cannot — another token
  // debited or an approval granted inside the route.
  if (expectation !== UNVERIFIED && expectation.swapRoute) {
    await assertSwapPaysWallet(
      rpc,
      transactionBase64,
      expectation.feePayer,
      expectation.swapRoute,
      ownAtaCreates(transactionBase64)
    );
  }
  const commitment = options.commitment ?? 'confirmed';

  const decoded = getTransactionDecoder().decode(
    new Uint8Array(Buffer.from(transactionBase64, 'base64'))
  );
  const { value } = await rpc.getLatestBlockhash({ commitment }).send();

  const compiled = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
  const messageBytes = getCompiledTransactionMessageEncoder().encode({
    ...compiled,
    lifetimeToken: value.blockhash,
  }) as TransactionMessageBytes;

  const signed = await signTransactionWith(account.signer, {
    messageBytes,
    signatures: decoded.signatures,
  });

  // A lost answer can follow a broadcast the node accepted: the wait below
  // settles it by this signature rather than reporting a retryable failure.
  const signature = await sendExpectingOutcome(
    () =>
      rpc
        .sendTransaction(getBase64EncodedWireTransaction(signed), {
          encoding: 'base64',
          preflightCommitment: commitment,
          skipPreflight: options.skipPreflight ?? false,
        })
        .send(),
    getSignatureFromTransaction(signed)
  );

  await confirmSolanaSignature(
    { rpc, rpcSubscriptions: account.getRpcSubscriptions() },
    signature,
    value.lastValidBlockHeight,
    { commitment }
  );

  return signature;
}
