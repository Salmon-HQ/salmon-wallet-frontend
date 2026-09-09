/**
 * Decoding for the transaction effect preview: turns raw RPC accounts into
 * the snapshot shape the derivation diffs. Only SPL token accounts and mints
 * are decoded further; anything else contributes its lamports and nothing more.
 */

import { getBase64Encoder, unwrapOption } from '@solana/kit';
import type { Address } from '@solana/kit';
import {
  TOKEN_2022_PROGRAM_ADDRESS,
  TOKEN_PROGRAM_ADDRESS,
  getMintDecoder,
  getTokenDecoder,
} from '@solana-program/token-2022';

import type { AccountState, Base64AccountData, MintState, RawAccount } from './simulation-types';

/** Size of an SPL token account without Token-2022 extensions. */
const TOKEN_ACCOUNT_BASE_SIZE = 165;

/** Size of an SPL mint account without Token-2022 extensions. */
const MINT_BASE_SIZE = 82;

/**
 * Token-2022 discriminates extended accounts with a byte at offset 165, since
 * an extended mint is padded to the same base length as a token account.
 * @see https://spl.solana.com/token-2022/extensions
 */
const ACCOUNT_TYPE_OFFSET = 165;
const ACCOUNT_TYPE_MINT = 1;
const ACCOUNT_TYPE_TOKEN = 2;

/** True when the account is owned by either SPL token program. */
function isTokenProgram(owner: Address): boolean {
  return owner === TOKEN_PROGRAM_ADDRESS || owner === TOKEN_2022_PROGRAM_ADDRESS;
}

/**
 * Tells an SPL token account from a mint.
 *
 * Length alone is ambiguous under Token-2022, which pads an extended mint to
 * the same base size as a token account and writes a discriminator byte at
 * offset 165.
 *
 * @param data - Raw account data.
 * @returns Which SPL account this is, or `null` when it is neither.
 */
function classifySplAccount(data: Uint8Array): 'token' | 'mint' | null {
  if (data.length === TOKEN_ACCOUNT_BASE_SIZE) {
    return 'token';
  }
  if (data.length === MINT_BASE_SIZE) {
    return 'mint';
  }
  if (data.length > ACCOUNT_TYPE_OFFSET) {
    const type = data[ACCOUNT_TYPE_OFFSET];
    if (type === ACCOUNT_TYPE_TOKEN) return 'token';
    if (type === ACCOUNT_TYPE_MINT) return 'mint';
  }
  return null;
}

/** Decodes base64 account data to bytes. */
export function toBytes(data: Base64AccountData): Uint8Array {
  return new Uint8Array(getBase64Encoder().encode(data[0]));
}

/**
 * Decodes one RPC account into the snapshot shape the derivation diffs.
 *
 * Only SPL token accounts are decoded further; anything else contributes its
 * lamports and nothing more. Decoding is defensive because the bytes come from
 * an arbitrary transaction's account list.
 *
 * @param account - The account as returned by the RPC, or `null` if absent.
 * @returns The snapshot, or `null` when the account does not exist.
 */
export function decodeAccountState(account: RawAccount | null): AccountState | null {
  if (!account) {
    return null;
  }
  const state: AccountState = { lamports: BigInt(account.lamports), token: null };
  if (!isTokenProgram(account.owner)) {
    return state;
  }

  const bytes = toBytes(account.data);
  if (classifySplAccount(bytes) !== 'token') {
    return state;
  }

  try {
    const token = getTokenDecoder().decode(bytes);
    return {
      lamports: state.lamports,
      token: {
        mint: token.mint,
        owner: token.owner,
        amount: token.amount,
        delegate: unwrapOption(token.delegate),
        delegatedAmount: token.delegatedAmount,
      },
    };
  } catch {
    // Malformed or a layout we do not know. Lamports are still valid, and the
    // caller reports the token side as unknown rather than as zero.
    return state;
  }
}

/** Decodes an SPL mint, returning `null` when the bytes are not a mint. */
export function decodeMintState(account: RawAccount | null): MintState | null {
  if (!account || !isTokenProgram(account.owner)) {
    return null;
  }
  const bytes = toBytes(account.data);
  if (classifySplAccount(bytes) !== 'mint') {
    return null;
  }
  try {
    const mint = getMintDecoder().decode(bytes);
    return { decimals: mint.decimals, supply: mint.supply };
  } catch {
    return null;
  }
}
