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
import { UNVERIFIED } from '../verify';
import type { SignedResult, TransactionProposal } from '../confirmation/types';

/**
 * Signs and broadcasts a confirmed proposal.
 *
 * The proposal is signed `UNVERIFIED`: the confirmation screen renders the
 * typed rows the Powerup supplied, and nothing yet checks those rows against
 * the transaction's own instructions. A Powerup that declared the programs it
 * uses could be checked here the way the NFT flows are — until it declares
 * them, this call trusts the build response.
 *
 * @param account - The signing account for the proposal's network.
 * @param proposal - The proposal the user confirmed.
 * @returns The confirmed signature.
 */
export async function signProposal(
  account: SolanaBroadcaster,
  proposal: TransactionProposal
): Promise<SignedResult> {
  const signature = await signAndSendSolanaTransaction(account, proposal.transaction, UNVERIFIED);
  return { signature: String(signature) };
}

export type SignProposalFn = typeof signProposal;
