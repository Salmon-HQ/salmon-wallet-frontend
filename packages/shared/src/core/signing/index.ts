/**
 * core/signing — the one function that turns a proposal into a signature.
 *
 * Reached only from the confirmation provider, after the user confirmed on the
 * core-rendered screen. `packages/shared/src/powerups/**` cannot import this
 * module (the lint boundary of spec 027 §2); a Powerup calls
 * `requestSignature` from `core/confirmation` and receives a signature back.
 */
import { sendReceivedSolanaTransaction, signAndSendSolanaTransaction } from '../broadcast';
import type { SolanaBroadcaster } from '../broadcast';

import type { AnyTransactionProposal, SignedResult } from '../confirmation/types';

/**
 * Signs and broadcasts a confirmed proposal.
 *
 * A Powerup's proposal: its own declaration decides what the transaction may
 * do; the fee payer is added here, from the key about to sign, because that
 * is the one part of the expectation a Powerup has no business stating.
 *
 * A received proposal (a Solana Pay merchant's transaction, spec 043) is
 * signed as it arrived, in the slot of the address it was requested for.
 *
 * The path is chosen by `door` — the door core recorded when it parked the
 * request — never by a property of the proposal, which its author controls.
 * A proposal whose shape disagrees with its door is refused unsigned.
 *
 * @param account - The signing account for the proposal's network.
 * @param proposal - The proposal the user confirmed.
 * @param door - Which entry admitted it; a Powerup's unless core says otherwise.
 * @returns The confirmed signature.
 */
export async function signProposal(
  account: SolanaBroadcaster,
  proposal: AnyTransactionProposal,
  door: 'powerup' | 'received' = 'powerup'
): Promise<SignedResult> {
  if (door === 'received') {
    if (!('source' in proposal) || proposal.source !== 'received') {
      throw new Error('transaction.errors.proposalKind');
    }
    const { transaction, signer } = proposal;
    const signature = await sendReceivedSolanaTransaction(account, transaction, signer);
    return { signature: String(signature) };
  }
  if ('source' in proposal) throw new Error('transaction.errors.proposalKind');
  const signature = await signAndSendSolanaTransaction(account, proposal.transaction, {
    feePayer: String(account.signer.address),
    ...proposal.expect,
  });
  return { signature: String(signature) };
}

export type SignProposalFn = typeof signProposal;
