/**
 * core/signing — the one function that turns a proposal into a signature.
 *
 * Reached only from the confirmation provider, after the user confirmed on the
 * core-rendered screen. `packages/shared/src/powerups/**` cannot import this
 * module (the lint boundary of spec 027 §2); a Powerup calls
 * `requestSignature` from `core/confirmation` and receives a signature back.
 */
import { signAndSendSolanaTransaction } from '../broadcast';
import type { SolanaBroadcaster } from '../broadcast';
import type { SignedResult, TransactionProposal } from '../confirmation/types';

/**
 * Signs and broadcasts a confirmed proposal.
 *
 * @param account - The signing account for the proposal's network.
 * @param proposal - The proposal the user confirmed.
 * @returns The confirmed signature.
 */
export async function signProposal(
  account: SolanaBroadcaster,
  proposal: TransactionProposal
): Promise<SignedResult> {
  const signature = await signAndSendSolanaTransaction(account, proposal.transaction);
  return { signature: String(signature) };
}

export type SignProposalFn = typeof signProposal;
