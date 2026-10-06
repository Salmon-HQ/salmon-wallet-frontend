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
import { SYSTEM_PROGRAM, TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from '../../core/verify';

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
};

/** The largest slippage a build may carry; the backend defaults to 50. */
export const MAX_SLIPPAGE_BPS = 1000;
