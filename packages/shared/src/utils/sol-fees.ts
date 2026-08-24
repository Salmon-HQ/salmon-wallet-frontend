/**
 * What a Solana account needs in native SOL before it can send anything.
 *
 * Every transaction pays its fee in SOL, whatever asset it moves. An account
 * holding USDC and no SOL therefore cannot send that USDC — the balance check
 * on the token alone says the transfer is fine, the network says otherwise,
 * and the user finds out from a failed transaction.
 *
 * The numbers here are floors, not quotes: a network under load takes priority
 * fees on top, and the real fee is only known once the transaction is built.
 * They are enough to answer the question this module exists for — "can this
 * account transact at all?" — and deliberately not used to predict a total.
 *
 * @module utils/sol-fees
 */

import { LAMPORTS_PER_SOL } from './balance';

/** Base signature fee for a single-signer transaction. */
export const SOLANA_BASE_FEE_LAMPORTS = 5_000;

/**
 * Rent-exempt minimum for an SPL token account.
 *
 * Sending a token to someone who has never held it creates their associated
 * token account, and the sender funds it. The sender cannot know in advance
 * whether the recipient already has one, so this is included whenever a token
 * (rather than native SOL) is being sent.
 */
export const SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

export interface SolRequirementParams {
  /** The account's native SOL balance, in SOL. */
  nativeBalanceSol: number;
  /**
   * Whether the transfer moves an SPL token rather than native SOL. Token
   * transfers may have to fund the recipient's token account.
   */
  isTokenTransfer: boolean;
}

/** The floor an account must hold in SOL to attempt this kind of transfer. */
export function getRequiredSol({ isTokenTransfer }: Pick<SolRequirementParams, 'isTokenTransfer'>) {
  const lamports =
    SOLANA_BASE_FEE_LAMPORTS + (isTokenTransfer ? SOLANA_TOKEN_ACCOUNT_RENT_LAMPORTS : 0);
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * How much SOL the account is short of being able to transact, or null when it
 * has enough.
 *
 * Returning the shortfall rather than a boolean lets the caller tell the user
 * how much to add, which is the only actionable part of the message.
 */
export function getSolShortfall({
  nativeBalanceSol,
  isTokenTransfer,
}: SolRequirementParams): number | null {
  const required = getRequiredSol({ isTokenTransfer });
  if (nativeBalanceSol >= required) return null;
  return required - nativeBalanceSol;
}
