/**
 * What a swap's bytes may do, beyond the program vocabulary in the manifest
 * (spec 027 §2: the list is a vocabulary, not a sentence). Probed live on
 * 2026-10-01 against both providers: at top level a swap only wraps SOL
 * (System transfer into the wallet's own wrapped-SOL account, then
 * SyncNative), creates the wallet's token accounts, calls the router, and
 * closes the wallet's pass-through accounts back to the wallet. Transfer,
 * Approve, SetAuthority, Burn and every other Token or System instruction
 * are refused before the user signs, and a close or a SOL transfer to any
 * account that is not the wallet's own is refused too.
 */
import type { ProgramInstructionRule } from '../../core/verify';
import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_INSTRUCTIONS,
  COMPUTE_BUDGET_PROGRAM,
  SYSTEM_PROGRAM,
  TOKEN_2022_PROGRAM,
  TOKEN_PROGRAM,
} from '../../core/verify';

/** SPL Token: CloseAccount (9, rent to the wallet), SyncNative (17), InitializeAccount3 (18). */
const TOKEN_RULE: ProgramInstructionRule = {
  width: 1,
  codes: [9, 17, 18],
  binds: [{ code: 9, index: 1, mustBe: 'feePayer' }],
};

export const SWAP_INSTRUCTIONS: Readonly<Record<string, ProgramInstructionRule>> = {
  /** System: Transfer (2) only, and only into a token account this message creates for the wallet. */
  [SYSTEM_PROGRAM]: {
    width: 4,
    codes: [2],
    binds: [{ code: 2, index: 1, mustBe: 'ownAtaCreatedHere' }],
  },
  [TOKEN_PROGRAM]: TOKEN_RULE,
  [TOKEN_2022_PROGRAM]: TOKEN_RULE,
  [COMPUTE_BUDGET_PROGRAM]: COMPUTE_BUDGET_INSTRUCTIONS,
  /**
   * Associated Token: `createIdempotent` (1) only, paid by the wallet — what
   * both providers emit. The owner is the wallet, or 0x's settlement account
   * at most twice (`assertSwapAccountCreates` in core/verify); rent is allowed
   * only for an account that does not exist yet (`assertSwapPaysWallet`).
   */
  [ASSOCIATED_TOKEN_PROGRAM]: {
    width: 1,
    codes: [1],
    binds: [{ code: 1, index: 0, mustBe: 'feePayer' }],
  },
};

/** The largest slippage a build may carry; the backend defaults to 50. */
export const MAX_SLIPPAGE_BPS = 1000;

/**
 * The largest Salmon fee a build may carry, in basis points. The fee is 50
 * today (0.5%); the cap leaves room to change it without a wallet release
 * while refusing a fee no one declared.
 */
export const MAX_SALMON_FEE_BPS = 100;
