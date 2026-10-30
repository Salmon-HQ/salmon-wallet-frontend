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
import type { TransactionPartialSigner } from '@solana/kit';

import type { SignedResult, TransactionProposal } from '../confirmation/types';

/**
 * Signs and broadcasts a confirmed proposal.
 *
 * The proposal's own declaration decides what the transaction may do; the fee
 * payer is added here, from the key about to sign, because that is the one
 * part of the expectation a Powerup has no business stating.
 *
 * @param account - The signing account for the proposal's network.
 * @param proposal - The proposal the user confirmed.
 * @param coSigners - Fresh keys core generated for this proposal (spec 043
 *   FR-043). Their addresses are declared after the proposal's own `expect`,
 *   so the transaction must be signed by exactly the payer and these keys,
 *   and each signs after the blockhash swap, before the account.
 * @returns The confirmed signature.
 */
export async function signProposal(
  account: SolanaBroadcaster,
  proposal: TransactionProposal,
  coSigners?: readonly TransactionPartialSigner[]
): Promise<SignedResult> {
  if (coSigners === undefined) {
    const signature = await signAndSendSolanaTransaction(account, proposal.transaction, {
      feePayer: String(account.signer.address),
      ...proposal.expect,
    });
    return { signature: String(signature) };
  }
  const signature = await signAndSendSolanaTransaction(
    account,
    proposal.transaction,
    {
      feePayer: String(account.signer.address),
      ...proposal.expect,
      coSigners: coSigners.map((signer) => String(signer.address)),
    },
    { coSigners }
  );
  return { signature: String(signature) };
}

export type SignProposalFn = typeof signProposal;
