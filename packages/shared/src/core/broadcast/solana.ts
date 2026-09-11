/**
 * core/broadcast — the one place a Solana transaction is signed and sent.
 *
 * Every flow that carries a backend-built transaction (NFT burn and transfer,
 * the swap Powerup) comes through here: decode, put a fresh blockhash on the
 * message, sign the wallet's own slot, send, and wait for the cluster's word.
 * Nothing outside `core/` calls `sendTransaction` (spec 027 §2).
 */
import {
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  partiallySignTransaction,
} from '@solana/kit';
import type { Commitment, KeyPairSigner, Signature, TransactionMessageBytes } from '@solana/kit';
import { confirmSolanaSignature } from '../../blockchain/solana/confirm';
import type { SolanaRpc, SolanaRpcSubscriptions } from '../../blockchain/solana/networks';

/** What broadcasting needs from an account: its signer and its RPC clients. */
export interface SolanaBroadcaster {
  signer: KeyPairSigner;
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
 * Swapping the one field is the only transformation that round-trips exactly.
 *
 * `partiallySignTransaction` preserves signatures already in the map, so a
 * co-signer's signature on a prepared transaction survives; this wallet only
 * ever fills its own slot.
 *
 * Confirmation has no polling fallback: a broken WebSocket endpoint fails
 * loudly rather than degrading into a silent slow path. The signature is
 * returned to the caller only once the cluster reports it at `commitment`;
 * the wait ends otherwise only when the blockhash expires (see `confirm.ts`).
 *
 * @param account - The signing account and its RPC clients.
 * @param transactionBase64 - The unsigned transaction, base64 wire format.
 * @returns The confirmed signature.
 * @throws The RPC's or the confirmation's error, unchanged.
 */
export async function signAndSendSolanaTransaction(
  account: SolanaBroadcaster,
  transactionBase64: string,
  options: SolanaBroadcastOptions = {}
): Promise<Signature> {
  const rpc = account.getRpc();
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

  const signed = await partiallySignTransaction([account.signer.keyPair], {
    messageBytes,
    signatures: decoded.signatures,
  });

  const signature = await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: 'base64',
      preflightCommitment: commitment,
      skipPreflight: options.skipPreflight ?? false,
    })
    .send();

  await confirmSolanaSignature(
    { rpc, rpcSubscriptions: account.getRpcSubscriptions() },
    signature,
    value.lastValidBlockHeight,
    { commitment }
  );

  return signature;
}
